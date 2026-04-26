/**
 * DSL Evaluator for Probabilistic Programming
 *
 * Evaluates player-written DSL code that returns probability distributions.
 * The DSL is Python-like with probabilistic primitives.
 */

const DSLEvaluator = {
    /**
     * Built-in distribution constructors
     */
    distributions: {
        Normal: (mean, std) => ({ type: 'normal', mean, std }),
        Exponential: (mean) => ({ type: 'exponential', mean }),
        Poisson: (lambda) => ({ type: 'poisson', lambda }),
        Bernoulli: (p) => ({ type: 'bernoulli', p }),
        Uniform: (min, max) => ({ type: 'uniform', min, max }),
        Beta: (alpha, beta) => ({ type: 'beta', alpha, beta }),
        Gamma: (shape, rate) => ({ type: 'gamma', shape, rate }),
        LogNormal: (mu, sigma) => ({ type: 'lognormal', mu, sigma }),
        Weibull: (shape, scale) => ({ type: 'weibull', shape, scale }),
        Mixture: (weights, dists) => ({ type: 'mixture', weights, distributions: dists }),

        // Discrete
        Categorical: (probs) => ({ type: 'categorical', probs }),
    },

    /**
     * Built-in functions for data analysis
     */
    functions: {
        // Basic statistics
        mean: (arr) => arr.reduce((a, b) => a + b, 0) / arr.length,
        std: (arr) => {
            const m = DSLEvaluator.functions.mean(arr);
            const variance = arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / arr.length;
            return Math.sqrt(variance);
        },
        variance: (arr) => {
            const m = DSLEvaluator.functions.mean(arr);
            return arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / arr.length;
        },
        median: (arr) => {
            const sorted = [...arr].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        },
        sum: (arr) => arr.reduce((a, b) => a + b, 0),
        len: (arr) => arr.length,
        min: (arr) => Math.min(...arr),
        max: (arr) => Math.max(...arr),

        // Counting
        count: (arr, condition) => {
            if (typeof condition === 'function') {
                return arr.filter(condition).length;
            }
            return arr.filter(x => x === condition).length;
        },
        countAbove: (arr, threshold) => arr.filter(x => x > threshold).length,
        countBelow: (arr, threshold) => arr.filter(x => x < threshold).length,

        // Math helpers
        sqrt: Math.sqrt,
        log: Math.log,
        exp: Math.exp,
        pow: Math.pow,
        abs: Math.abs,

        // Array operations
        filter: (arr, fn) => arr.filter(fn),
        map: (arr, fn) => arr.map(fn),

        // Quantiles
        quantile: (arr, p) => {
            const sorted = [...arr].sort((a, b) => a - b);
            const idx = p * (sorted.length - 1);
            const lo = Math.floor(idx);
            const hi = Math.ceil(idx);
            return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
        },
    },

    /**
     * Probability operators
     * These work on distribution objects
     */
    probabilityOps: {
        // P(X > threshold) - exceedance probability
        P_gt: (dist, threshold) => {
            return 1 - DSLEvaluator.cdf(dist, threshold);
        },

        // P(X < threshold)
        P_lt: (dist, threshold) => {
            return DSLEvaluator.cdf(dist, threshold);
        },

        // P(a < X < b)
        P_between: (dist, a, b) => {
            return DSLEvaluator.cdf(dist, b) - DSLEvaluator.cdf(dist, a);
        },

        // E[X] - expected value
        E: (dist) => {
            switch (dist.type) {
                case 'normal': return dist.mean;
                case 'exponential': return dist.mean;
                case 'poisson': return dist.lambda;
                case 'uniform': return (dist.min + dist.max) / 2;
                case 'bernoulli': return dist.p;
                case 'beta': return dist.alpha / (dist.alpha + dist.beta);
                case 'gamma': return dist.shape / dist.rate;
                default: return null;
            }
        },

        // Var[X] - variance
        Var: (dist) => {
            switch (dist.type) {
                case 'normal': return dist.std ** 2;
                case 'exponential': return dist.mean ** 2;
                case 'poisson': return dist.lambda;
                case 'uniform': return (dist.max - dist.min) ** 2 / 12;
                case 'bernoulli': return dist.p * (1 - dist.p);
                case 'beta': {
                    const a = dist.alpha, b = dist.beta;
                    return (a * b) / ((a + b) ** 2 * (a + b + 1));
                }
                default: return null;
            }
        },
    },

    /**
     * CDF evaluation for distributions
     */
    cdf: (dist, x) => {
        switch (dist.type) {
            case 'normal':
                return Distributions.normalCDF(x, dist.mean, dist.std);
            case 'exponential':
                return x < 0 ? 0 : 1 - Math.exp(-x / dist.mean);
            case 'poisson':
                return Distributions.poissonCDF(x, dist.lambda);
            case 'uniform':
                if (x < dist.min) return 0;
                if (x > dist.max) return 1;
                return (x - dist.min) / (dist.max - dist.min);
            case 'bernoulli':
                if (x < 0) return 0;
                if (x < 1) return 1 - dist.p;
                return 1;
            default:
                throw new Error(`CDF not implemented for ${dist.type}`);
        }
    },

    /**
     * Sample from a distribution
     */
    sample: (dist, n = 1) => {
        const samples = [];
        for (let i = 0; i < n; i++) {
            samples.push(DSLEvaluator.sampleOne(dist));
        }
        return n === 1 ? samples[0] : samples;
    },

    sampleOne: (dist) => {
        switch (dist.type) {
            case 'normal':
                return Distributions.sampleNormal(dist.mean, dist.std);
            case 'exponential':
                return -dist.mean * Math.log(Math.random());
            case 'poisson':
                return Distributions.samplePoisson(dist.lambda);
            case 'uniform':
                return dist.min + Math.random() * (dist.max - dist.min);
            case 'bernoulli':
                return Math.random() < dist.p ? 1 : 0;
            default:
                throw new Error(`Sampling not implemented for ${dist.type}`);
        }
    },

    /**
     * Evaluate player code
     * Returns { success: boolean, result: any, error?: string }
     */
    evaluate(code, dataContext) {
        try {
            // Build the evaluation context
            const context = {
                // Data from animation
                data: dataContext.data || [],
                ...dataContext.variables,

                // Distribution constructors
                ...this.distributions,

                // Statistical functions
                ...this.functions,

                // Probability operators
                P: (dist, op, threshold) => {
                    if (op === '>') return this.probabilityOps.P_gt(dist, threshold);
                    if (op === '<') return this.probabilityOps.P_lt(dist, threshold);
                    throw new Error(`Unknown operator: ${op}`);
                },
                P_gt: this.probabilityOps.P_gt,
                P_lt: this.probabilityOps.P_lt,
                P_between: this.probabilityOps.P_between,
                E: this.probabilityOps.E,
                Var: this.probabilityOps.Var,

                // Sampling
                sample: this.sample.bind(this),

                // CDF access
                cdf: this.cdf.bind(this),
            };

            // Parse and execute the code
            const result = this.executeCode(code, context);

            return { success: true, result };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    /**
     * Execute code with given context
     * Supports Python-like syntax with 'return' statement
     */
    executeCode(code, context) {
        // Extract variable assignments and return statement
        const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

        let returnExpr = null;
        const assignments = [];

        for (const line of lines) {
            if (line.startsWith('return ')) {
                returnExpr = line.slice(7).trim();
            } else if (line.includes('=') && !line.includes('==')) {
                // Variable assignment
                const [varName, expr] = line.split('=').map(s => s.trim());
                assignments.push({ varName, expr });
            }
        }

        if (!returnExpr) {
            throw new Error('Koodista puuttuu return-lause');
        }

        // Build function body
        let funcBody = '';

        // Add context variables
        for (const [key, value] of Object.entries(context)) {
            if (typeof value === 'function') {
                funcBody += `const ${key} = this.${key};\n`;
            } else if (typeof value === 'object' && value !== null) {
                funcBody += `const ${key} = this.${key};\n`;
            } else {
                funcBody += `const ${key} = ${JSON.stringify(value)};\n`;
            }
        }

        // Add user assignments
        for (const { varName, expr } of assignments) {
            funcBody += `const ${varName} = ${expr};\n`;
        }

        // Add return
        funcBody += `return ${returnExpr};`;

        // Execute
        const func = new Function(funcBody);
        return func.call(context);
    },
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DSLEvaluator;
}
