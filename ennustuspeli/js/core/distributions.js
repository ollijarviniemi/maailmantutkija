/**
 * Distribution Sampling Functions
 *
 * All the statistical distribution samplers used by the DSL.
 */

const Distributions = {
    // Box-Muller transform for normal distribution
    sampleNormal(mean = 0, std = 1) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mean + std * z;
    },

    // Exponential distribution via inverse CDF
    sampleExponential(mean) {
        return -mean * Math.log(Math.random());
    },

    // LogNormal distribution (parameterized by desired mean and std)
    sampleLognormal(mean, std) {
        // Convert mean/std to mu/sigma of underlying normal
        const cv = std / mean;
        const sigma2 = Math.log(1 + cv * cv);
        const sigma = Math.sqrt(sigma2);
        const mu = Math.log(mean) - sigma2 / 2;

        const normalSample = this.sampleNormal(mu, sigma);
        return Math.exp(normalSample);
    },

    // Uniform distribution
    sampleUniform(min, max) {
        return min + Math.random() * (max - min);
    },

    // Binomial distribution
    sampleBinomial(n, p) {
        let successes = 0;
        for (let i = 0; i < n; i++) {
            if (Math.random() < p) successes++;
        }
        return successes;
    },

    // Poisson distribution (using Knuth algorithm for small lambda)
    samplePoisson(lambda) {
        if (lambda < 30) {
            // Knuth algorithm
            const L = Math.exp(-lambda);
            let k = 0;
            let p = 1;
            do {
                k++;
                p *= Math.random();
            } while (p > L);
            return k - 1;
        } else {
            // Normal approximation for large lambda
            return Math.max(0, Math.round(this.sampleNormal(lambda, Math.sqrt(lambda))));
        }
    },

    // Geometric distribution (number of trials until first success)
    sampleGeometric(p) {
        return Math.floor(Math.log(Math.random()) / Math.log(1 - p)) + 1;
    },

    // Beta distribution (using rejection sampling for simplicity)
    sampleBeta(alpha, beta) {
        // Use gamma samples: Beta(a,b) = Gamma(a,1) / (Gamma(a,1) + Gamma(b,1))
        const x = this.sampleGamma(alpha, 1);
        const y = this.sampleGamma(beta, 1);
        return x / (x + y);
    },

    // Gamma distribution (using Marsaglia and Tsang's method)
    sampleGamma(shape, scale = 1) {
        if (shape < 1) {
            // Use Gamma(1+shape) * U^(1/shape)
            return this.sampleGamma(1 + shape, scale) * Math.pow(Math.random(), 1 / shape);
        }

        const d = shape - 1/3;
        const c = 1 / Math.sqrt(9 * d);

        while (true) {
            let x, v;
            do {
                x = this.sampleNormal(0, 1);
                v = 1 + c * x;
            } while (v <= 0);

            v = v * v * v;
            const u = Math.random();

            if (u < 1 - 0.0331 * (x * x) * (x * x)) {
                return d * v * scale;
            }

            if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
                return d * v * scale;
            }
        }
    },

    // Weibull distribution (for failure modeling - lightbulbs, reliability)
    sampleWeibull(shape, scale) {
        // Inverse CDF: X = scale * (-ln(U))^(1/shape)
        const u = Math.random();
        return scale * Math.pow(-Math.log(u), 1 / shape);
    },

    // Student's t distribution (heavy tails, used for robust modeling)
    sampleStudentT(df, loc = 0, scale = 1) {
        // Using ratio of normal and chi-squared
        const z = this.sampleNormal(0, 1);
        const chi2 = this.sampleGamma(df / 2, 2); // Chi-squared = Gamma(df/2, 2)
        return loc + scale * z / Math.sqrt(chi2 / df);
    },

    // Mixture of distributions (weighted random selection)
    sampleMixture(weights, distributions) {
        // Normalize weights
        const total = weights.reduce((a, b) => a + b, 0);
        const normalized = weights.map(w => w / total);

        // Random selection
        const u = Math.random();
        let cumsum = 0;
        for (let i = 0; i < normalized.length; i++) {
            cumsum += normalized[i];
            if (u <= cumsum) {
                return this.sampleOne(distributions[i]);
            }
        }
        // Fallback to last distribution
        return this.sampleOne(distributions[distributions.length - 1]);
    },

    // Generate multiple samples
    sample(dist, n = 1) {
        const samples = [];
        for (let i = 0; i < n; i++) {
            samples.push(this.sampleOne(dist));
        }
        return n === 1 ? samples[0] : samples;
    },

    sampleOne(dist) {
        switch (dist.type) {
            case 'normal': return this.sampleNormal(dist.mean, dist.std);
            case 'exponential': return this.sampleExponential(dist.mean);
            case 'lognormal': return this.sampleLognormal(dist.mean, dist.std);
            case 'uniform': return this.sampleUniform(dist.min, dist.max);
            case 'binomial': return this.sampleBinomial(dist.n, dist.p);
            case 'poisson': return this.samplePoisson(dist.lambda);
            case 'geometric': return this.sampleGeometric(dist.p);
            case 'beta': return this.sampleBeta(dist.alpha, dist.beta);
            case 'gamma': return this.sampleGamma(dist.shape, dist.scale);
            case 'weibull': return this.sampleWeibull(dist.shape, dist.scale);
            case 'studentT': return this.sampleStudentT(dist.df, dist.loc, dist.scale);
            case 'mixture': return this.sampleMixture(dist.weights, dist.distributions);
            default: throw new Error(`Unknown distribution: ${dist.type}`);
        }
    },

    // PDF/CDF functions for analytical solutions where possible
    normalCDF(x, mean = 0, std = 1) {
        // Using error function approximation
        const z = (x - mean) / (std * Math.sqrt(2));
        return 0.5 * (1 + this.erf(z));
    },

    erf(x) {
        // Horner form approximation
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;

        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x);

        const t = 1 / (1 + p * x);
        const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

        return sign * y;
    },

    exponentialCDF(x, mean) {
        if (x < 0) return 0;
        return 1 - Math.exp(-x / mean);
    },

    // Weibull CDF
    weibullCDF(x, shape, scale) {
        if (x < 0) return 0;
        return 1 - Math.exp(-Math.pow(x / scale, shape));
    },

    // Binomial CDF (exact calculation)
    binomialCDF(k, n, p) {
        if (k < 0) return 0;
        if (k >= n) return 1;
        let sum = 0;
        for (let i = 0; i <= Math.floor(k); i++) {
            sum += this.binomialPMF(i, n, p);
        }
        return sum;
    },

    // Binomial PMF helper
    binomialPMF(k, n, p) {
        return this.binomialCoeff(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
    },

    // Binomial coefficient
    binomialCoeff(n, k) {
        if (k > n) return 0;
        if (k === 0 || k === n) return 1;
        let result = 1;
        for (let i = 0; i < k; i++) {
            result = result * (n - i) / (i + 1);
        }
        return result;
    },

    // Poisson CDF
    poissonCDF(k, lambda) {
        if (k < 0) return 0;
        let sum = 0;
        for (let i = 0; i <= Math.floor(k); i++) {
            sum += this.poissonPMF(i, lambda);
        }
        return sum;
    },

    // Poisson PMF helper
    poissonPMF(k, lambda) {
        return Math.exp(-lambda + k * Math.log(lambda) - this.logFactorial(k));
    },

    // Log factorial helper (for numerical stability)
    logFactorial(n) {
        if (n <= 1) return 0;
        let sum = 0;
        for (let i = 2; i <= n; i++) {
            sum += Math.log(i);
        }
        return sum;
    },

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    // Sigmoid / Logistic function (used for ELO scoring)
    sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    },

    // ELO probability: P(A beats B) given rating difference
    eloWinProbability(ratingA, ratingB, k = 400) {
        const diff = ratingA - ratingB;
        return this.sigmoid(diff * Math.log(10) / k);
    },

    // Probability calculations (analytical where possible, Monte Carlo otherwise)
    probability(dist, op, threshold, numSamples = 10000) {
        // Try analytical solution first
        if (dist.type === 'normal' && (op === '<' || op === '<=')) {
            return this.normalCDF(threshold, dist.mean, dist.std);
        }
        if (dist.type === 'normal' && (op === '>' || op === '>=')) {
            return 1 - this.normalCDF(threshold, dist.mean, dist.std);
        }
        if (dist.type === 'exponential' && (op === '<' || op === '<=')) {
            return this.exponentialCDF(threshold, dist.mean);
        }
        if (dist.type === 'exponential' && (op === '>' || op === '>=')) {
            return 1 - this.exponentialCDF(threshold, dist.mean);
        }

        // Fall back to Monte Carlo
        let count = 0;
        for (let i = 0; i < numSamples; i++) {
            const sample = this.sampleOne(dist);
            if (this.checkCondition(sample, op, threshold)) {
                count++;
            }
        }
        return count / numSamples;
    },

    checkCondition(value, op, threshold) {
        switch (op) {
            case '>': return value > threshold;
            case '<': return value < threshold;
            case '>=': return value >= threshold;
            case '<=': return value <= threshold;
            case '==': return Math.abs(value - threshold) < 1e-9;
            case '!=': return Math.abs(value - threshold) >= 1e-9;
            default: return false;
        }
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Distributions;
}
