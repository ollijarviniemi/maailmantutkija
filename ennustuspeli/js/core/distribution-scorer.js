/**
 * Distribution Scorer
 *
 * Scores player distributions against the true DGP using proper scoring rules.
 * - For continuous distributions: CRPS or log score
 * - For probability estimates: Brier score
 * - For discrete distributions: Log score
 */

const DistributionScorer = {
    /**
     * Score a player's distribution against the true DGP
     *
     * @param {Object} playerDist - Player's submitted distribution
     * @param {Object} trueDGP - True data generating process
     * @param {string} questionType - 'distribution', 'probability', 'exceedance'
     * @param {Object} params - Additional parameters (threshold, samples, etc.)
     * @returns {Object} { score, stars, details }
     */
    score(playerDist, trueDGP, questionType, params = {}) {
        switch (questionType) {
            case 'distribution':
                return this.scoreDistribution(playerDist, trueDGP, params);
            case 'probability':
                return this.scoreProbability(playerDist, trueDGP, params);
            case 'exceedance':
                return this.scoreExceedance(playerDist, trueDGP, params);
            default:
                throw new Error(`Unknown question type: ${questionType}`);
        }
    },

    /**
     * Score a distribution using CRPS (Continuous Ranked Probability Score)
     * Lower is better. CRPS = 0 means perfect.
     */
    scoreDistribution(playerDist, trueDGP, params) {
        const { thresholds = [0.2, 0.1, 0.05] } = params;

        // Generate samples from true DGP
        const trueSamples = this.generateSamples(trueDGP, 1000);

        // Compute CRPS by averaging over true samples
        let crps = 0;
        for (const x of trueSamples) {
            crps += this.crpsAtPoint(playerDist, x);
        }
        crps /= trueSamples.length;

        // Normalize CRPS by the scale of the data
        const trueStd = this.estimateStd(trueDGP);
        const normalizedCRPS = crps / trueStd;

        // Convert to stars (lower CRPS = more stars)
        const stars = this.crpsToStars(normalizedCRPS, thresholds);

        return {
            score: normalizedCRPS,
            stars,
            details: {
                crps,
                normalizedCRPS,
                trueStd,
                interpretation: this.interpretCRPS(normalizedCRPS),
            }
        };
    },

    /**
     * CRPS at a single point
     * For Normal(μ, σ): CRPS(x) = σ * [ (x-μ)/σ * (2Φ((x-μ)/σ) - 1) + 2φ((x-μ)/σ) - 1/√π ]
     */
    crpsAtPoint(dist, x) {
        if (dist.type === 'normal') {
            const z = (x - dist.mean) / dist.std;
            const phi = this.normalPDF(z);
            const Phi = this.normalCDF(z);
            return dist.std * (z * (2 * Phi - 1) + 2 * phi - 1 / Math.sqrt(Math.PI));
        }

        // Fallback: numerical integration
        return this.crpsNumerical(dist, x);
    },

    /**
     * Numerical CRPS computation
     */
    crpsNumerical(dist, x) {
        const nPoints = 100;
        const samples = [];
        for (let i = 0; i < nPoints; i++) {
            samples.push(DSLEvaluator.sampleOne(dist));
        }
        samples.sort((a, b) => a - b);

        // CRPS = E[|X - x|] - 0.5 * E[|X - X'|]
        const absError = samples.reduce((sum, s) => sum + Math.abs(s - x), 0) / nPoints;

        // Approximate E[|X - X'|] using order statistics
        let pairwiseDiff = 0;
        for (let i = 0; i < nPoints; i++) {
            pairwiseDiff += samples[i] * (2 * i - nPoints + 1);
        }
        pairwiseDiff = 2 * pairwiseDiff / (nPoints * nPoints);

        return absError - 0.5 * Math.abs(pairwiseDiff);
    },

    /**
     * Score a probability estimate using Brier score
     * Brier = (p_predicted - p_true)^2
     */
    scoreProbability(playerProb, trueProb, params) {
        const { thresholds = [10, 5, 2] } = params; // in percentage points

        // If playerProb is a distribution with a .p field, extract it
        const pPredicted = typeof playerProb === 'number' ? playerProb :
            (playerProb.p !== undefined ? playerProb.p : playerProb);
        const pTrue = typeof trueProb === 'number' ? trueProb :
            (trueProb.p !== undefined ? trueProb.p : trueProb);

        const brierScore = (pPredicted - pTrue) ** 2;
        const errorPct = Math.abs(pPredicted - pTrue) * 100;

        const stars = this.errorToStars(errorPct, thresholds);

        return {
            score: brierScore,
            stars,
            details: {
                playerProbability: pPredicted,
                trueProbability: pTrue,
                errorPercentagePoints: errorPct,
                brierScore,
            }
        };
    },

    /**
     * Score an exceedance probability P(X > threshold)
     */
    scoreExceedance(playerDist, trueDGP, params) {
        const { threshold, thresholds = [10, 5, 2] } = params;

        if (threshold === undefined) {
            throw new Error('Exceedance scoring requires a threshold');
        }

        // Compute P(X > threshold) from player's distribution
        const playerProb = 1 - DSLEvaluator.cdf(playerDist, threshold);

        // Compute true P(X > threshold) from DGP
        const trueProb = 1 - this.trueCDF(trueDGP, threshold);

        return this.scoreProbability(playerProb, trueProb, { thresholds });
    },

    /**
     * CDF of true DGP (may include unknown parameters)
     */
    trueCDF(dgp, x) {
        switch (dgp.type) {
            case 'normal':
                return Distributions.normalCDF(x, dgp.mean, dgp.std);
            case 'exponential':
                return x < 0 ? 0 : 1 - Math.exp(-x / dgp.mean);
            case 'poisson':
                return Distributions.poissonCDF(x, dgp.lambda);
            case 'uniform':
                if (x < dgp.min) return 0;
                if (x > dgp.max) return 1;
                return (x - dgp.min) / (dgp.max - dgp.min);
            case 'bernoulli':
                return x < 1 ? (1 - dgp.p) : 1;
            case 'weibull':
                return 1 - Math.exp(-Math.pow(x / dgp.scale, dgp.shape));
            default:
                // Monte Carlo fallback
                const samples = this.generateSamples(dgp, 10000);
                return samples.filter(s => s <= x).length / samples.length;
        }
    },

    /**
     * Generate samples from a DGP
     */
    generateSamples(dgp, n) {
        const samples = [];
        for (let i = 0; i < n; i++) {
            samples.push(this.sampleFromDGP(dgp));
        }
        return samples;
    },

    sampleFromDGP(dgp) {
        switch (dgp.type) {
            case 'normal':
                return Distributions.sampleNormal(dgp.mean, dgp.std);
            case 'exponential':
                return -dgp.mean * Math.log(Math.random());
            case 'poisson':
                return Distributions.samplePoisson(dgp.lambda);
            case 'uniform':
                return dgp.min + Math.random() * (dgp.max - dgp.min);
            case 'bernoulli':
                return Math.random() < dgp.p ? 1 : 0;
            case 'weibull':
                return dgp.scale * Math.pow(-Math.log(Math.random()), 1 / dgp.shape);
            case 'mixture':
                // Sample component, then sample from it
                let r = Math.random();
                let cumWeight = 0;
                for (let i = 0; i < dgp.weights.length; i++) {
                    cumWeight += dgp.weights[i];
                    if (r < cumWeight) {
                        return this.sampleFromDGP(dgp.distributions[i]);
                    }
                }
                return this.sampleFromDGP(dgp.distributions[dgp.distributions.length - 1]);
            case 'studentT':
                // Use Box-Muller for normal, then divide by sqrt(chi-square/df)
                const normal = Distributions.sampleNormal(0, 1);
                let chi2 = 0;
                for (let i = 0; i < dgp.df; i++) {
                    const z = Distributions.sampleNormal(0, 1);
                    chi2 += z * z;
                }
                return dgp.loc + dgp.scale * normal / Math.sqrt(chi2 / dgp.df);
            default:
                throw new Error(`Cannot sample from DGP type: ${dgp.type}`);
        }
    },

    /**
     * Estimate standard deviation of a DGP
     */
    estimateStd(dgp) {
        switch (dgp.type) {
            case 'normal': return dgp.std;
            case 'exponential': return dgp.mean;
            case 'poisson': return Math.sqrt(dgp.lambda);
            case 'uniform': return (dgp.max - dgp.min) / Math.sqrt(12);
            default:
                // Monte Carlo
                const samples = this.generateSamples(dgp, 1000);
                const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
                const variance = samples.reduce((sum, x) => sum + (x - mean) ** 2, 0) / samples.length;
                return Math.sqrt(variance);
        }
    },

    /**
     * Convert normalized CRPS to stars
     */
    crpsToStars(normalizedCRPS, thresholds) {
        if (normalizedCRPS <= thresholds[2]) return 3;
        if (normalizedCRPS <= thresholds[1]) return 2;
        if (normalizedCRPS <= thresholds[0]) return 1;
        return 0;
    },

    /**
     * Convert error (in %) to stars
     */
    errorToStars(error, thresholds) {
        if (error <= thresholds[2]) return 3;
        if (error <= thresholds[1]) return 2;
        if (error <= thresholds[0]) return 1;
        return 0;
    },

    interpretCRPS(normalizedCRPS) {
        if (normalizedCRPS < 0.05) return 'Erinomainen';
        if (normalizedCRPS < 0.1) return 'Hyvä';
        if (normalizedCRPS < 0.2) return 'Kohtalainen';
        return 'Heikko';
    },

    // Standard normal PDF and CDF
    normalPDF(z) {
        return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
    },

    normalCDF(z) {
        // Approximation
        const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
        const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
        const sign = z < 0 ? -1 : 1;
        z = Math.abs(z) / Math.sqrt(2);
        const t = 1 / (1 + p * z);
        const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
        return 0.5 * (1 + sign * y);
    },
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DistributionScorer;
}
