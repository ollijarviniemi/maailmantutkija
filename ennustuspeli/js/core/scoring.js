/**
 * Scoring Registry
 *
 * Handles different scoring methods for answers.
 * Each scoring method knows how to calculate error and convert to stars.
 */

const Scoring = {
    _methods: new Map(),

    /**
     * Register a scoring method
     *
     * @param {string} type - Scoring type identifier
     * @param {object} method - Scoring method with calculateError function
     * @param {function} method.calculateError - (playerAnswer, trueAnswer, extra) => error value
     * @param {function} [method.extraResults] - Optional function returning additional result fields
     */
    register(type, method) {
        if (typeof method.calculateError !== 'function') {
            throw new Error('Scoring method must have calculateError function');
        }
        this._methods.set(type, method);
    },

    /**
     * Check if a scoring type exists
     */
    has(type) {
        return this._methods.has(type);
    },

    /**
     * Get all registered types
     */
    getTypes() {
        return Array.from(this._methods.keys());
    },

    /**
     * Score an answer
     *
     * @param {string} type - Scoring type
     * @param {*} playerAnswer - Player's answer
     * @param {*} trueAnswer - True/expected answer
     * @param {number[]} thresholds - [1-star, 2-star, 3-star] error thresholds
     * @param {object} extra - Additional data for scoring (e.g., observed data for KS test)
     * @returns {object} { stars, error, playerAnswer, trueAnswer, ...extraResults }
     */
    score(type, playerAnswer, trueAnswer, thresholds, extra = {}) {
        const method = this._methods.get(type) || this._methods.get('absolute');

        if (!method) {
            throw new Error(`Unknown scoring type: ${type}`);
        }

        const error = method.calculateError(playerAnswer, trueAnswer, extra);
        const stars = this.thresholdsToStars(error, thresholds);

        const result = {
            stars,
            error,
            playerAnswer,
            trueAnswer
        };

        // Add any extra results from the scoring method
        if (method.extraResults) {
            Object.assign(result, method.extraResults(playerAnswer, trueAnswer, extra));
        }

        return result;
    },

    /**
     * Convert error to star rating using thresholds
     * thresholds = [1-star-max, 2-star-max, 3-star-max]
     * Lower error is better
     */
    thresholdsToStars(error, thresholds) {
        if (error <= thresholds[2]) return 3;
        if (error <= thresholds[1]) return 2;
        if (error <= thresholds[0]) return 1;
        return 0;
    },

    /**
     * Calculate CDF for a distribution at a given value
     * Used by distribution-fit scoring
     */
    calculateCdf(dist, x) {
        switch (dist.type) {
            case 'normal':
                return Distributions.normalCDF(x, dist.mean, dist.std);
            case 'exponential':
                return Distributions.exponentialCDF(x, dist.mean);
            default:
                // Monte Carlo fallback
                let count = 0;
                const samples = 10000;
                for (let i = 0; i < samples; i++) {
                    if (Distributions.sampleOne(dist) <= x) count++;
                }
                return count / samples;
        }
    }
};

// Register built-in scoring methods

/**
 * Absolute error: |player - true|
 */
Scoring.register('absolute', {
    calculateError: (player, true_) => Math.abs(player - true_)
});

/**
 * Relative error: |player - true| / |true|
 */
Scoring.register('relative', {
    calculateError: (player, true_) =>
        true_ !== 0 ? Math.abs(player - true_) / Math.abs(true_) : Math.abs(player)
});

/**
 * Probability error: same as absolute, but semantically for 0-100% values
 */
Scoring.register('probability', {
    calculateError: (player, true_) => Math.abs(player - true_)
});

/**
 * Distribution fit using Kolmogorov-Smirnov statistic
 * Player provides a distribution, we compare against observed data
 */
Scoring.register('distribution-fit', {
    calculateError: (playerDist, _, { observedData }) => {
        if (!observedData || !Array.isArray(observedData) || observedData.length === 0) {
            throw new Error('distribution-fit requires observedData in extra parameter');
        }

        // KS statistic: max difference between empirical and theoretical CDFs
        const sorted = [...observedData].sort((a, b) => a - b);
        const n = sorted.length;
        let maxDiff = 0;

        for (let i = 0; i < n; i++) {
            const empiricalCdf = (i + 1) / n;
            const theoreticalCdf = Scoring.calculateCdf(playerDist, sorted[i]);
            maxDiff = Math.max(maxDiff, Math.abs(empiricalCdf - theoreticalCdf));
        }

        return maxDiff;
    },

    extraResults: (playerDist, _, { observedData }) => ({
        playerDist,
        ksStatistic: undefined, // Will be same as error
        observedData
    })
});

/**
 * Distribution scoring using CRPS (Continuous Ranked Probability Score)
 * Compares player's distribution against true DGP.
 * Lower CRPS is better. Uses DistributionScorer if available.
 */
Scoring.register('distribution', {
    calculateError: (playerDist, trueDGP, extra = {}) => {
        // Use DistributionScorer if available
        if (typeof DistributionScorer !== 'undefined') {
            const result = DistributionScorer.scoreDistribution(playerDist, trueDGP, extra);
            return result.normalizedCRPS || result.crps || 1;
        }

        // Fallback: Monte Carlo CRPS estimation
        return Scoring._estimateCRPS(playerDist, trueDGP);
    },

    extraResults: (playerDist, trueDGP, extra) => ({
        playerDist,
        trueDGP
    })
});

/**
 * Monte Carlo CRPS estimation (fallback)
 */
Scoring._estimateCRPS = function(playerDist, trueDGP) {
    const numSamples = 1000;

    // Sample from true DGP
    const trueSamples = [];
    for (let i = 0; i < numSamples; i++) {
        trueSamples.push(Scoring._sampleFromDist(trueDGP));
    }

    // Calculate CRPS at each sample point
    let totalCRPS = 0;
    for (const x of trueSamples) {
        totalCRPS += Scoring._crpsAtPoint(playerDist, x);
    }

    const meanCRPS = totalCRPS / numSamples;

    // Normalize by scale (use std of true DGP)
    const trueStd = Scoring._estimateStd(trueDGP);
    return trueStd > 0 ? meanCRPS / trueStd : meanCRPS;
};

/**
 * CRPS at a single point: E[|X - x|] - 0.5 * E[|X - X'|]
 */
Scoring._crpsAtPoint = function(dist, x) {
    const samples = [];
    for (let i = 0; i < 100; i++) {
        samples.push(Scoring._sampleFromDist(dist));
    }

    // E[|X - x|]
    let term1 = 0;
    for (const s of samples) {
        term1 += Math.abs(s - x);
    }
    term1 /= samples.length;

    // E[|X - X'|] (within-sample spread)
    let term2 = 0;
    let count = 0;
    for (let i = 0; i < samples.length; i++) {
        for (let j = i + 1; j < samples.length; j++) {
            term2 += Math.abs(samples[i] - samples[j]);
            count++;
        }
    }
    term2 = count > 0 ? term2 / count : 0;

    return term1 - 0.5 * term2;
};

/**
 * Sample from a distribution object
 */
Scoring._sampleFromDist = function(dist) {
    if (typeof Distributions !== 'undefined' && Distributions.sampleOne) {
        return Distributions.sampleOne(dist);
    }

    // Basic fallback sampling
    const u = Math.random();
    switch (dist.type) {
        case 'normal':
            // Box-Muller transform
            const u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            return (dist.mean || 0) + (dist.std || 1) * z;

        case 'exponential':
            return -Math.log(1 - u) * (dist.mean || 1);

        case 'poisson':
            // Knuth algorithm
            const L = Math.exp(-(dist.lambda || 1));
            let k = 0, p = 1;
            do {
                k++;
                p *= Math.random();
            } while (p > L);
            return k - 1;

        case 'bernoulli':
            return u < (dist.p || 0.5) ? 1 : 0;

        case 'beta':
            // Simple approximation using gamma samples
            return (dist.alpha || 1) / ((dist.alpha || 1) + (dist.beta || 1));

        default:
            return (dist.mean || 0) + (dist.std || 1) * (u - 0.5);
    }
};

/**
 * Estimate standard deviation of a distribution
 */
Scoring._estimateStd = function(dist) {
    switch (dist.type) {
        case 'normal':
            return dist.std || 1;
        case 'exponential':
            return dist.mean || 1;
        case 'poisson':
            return Math.sqrt(dist.lambda || 1);
        case 'bernoulli':
            const p = dist.p || 0.5;
            return Math.sqrt(p * (1 - p));
        case 'beta':
            const a = dist.alpha || 1, b = dist.beta || 1;
            return Math.sqrt((a * b) / ((a + b) ** 2 * (a + b + 1)));
        default:
            return dist.std || 1;
    }
};

/**
 * Probability via Monte Carlo - used by store occupancy levels
 * The actual scoring is done in game.js using StoreOccupancyMC
 * This registration just makes the validator happy
 */
Scoring.register('probability-mc', {
    calculateError: (playerProb, trueProb) => Math.abs(playerProb - trueProb)
});

/**
 * Multiday probability via Monte Carlo - used by store occupancy weekday level
 * The actual scoring is done in game.js using StoreOccupancyMC
 */
Scoring.register('probability-mc-multiday', {
    calculateError: (playerProbs, trueProbs) => {
        if (!Array.isArray(playerProbs) || !Array.isArray(trueProbs)) {
            return 1;
        }
        const errors = playerProbs.map((p, i) => Math.abs(p - (trueProbs[i] || 0)));
        return errors.reduce((a, b) => a + b, 0) / errors.length;
    }
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Scoring;
}
