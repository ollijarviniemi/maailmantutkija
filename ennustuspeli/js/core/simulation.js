/**
 * Simulation Functions
 *
 * Complex simulations that can be used in the DSL via registerSimulation.
 */

const Simulations = {
    /**
     * Simulate a single-server queue for one day
     *
     * @param {Object} config
     * @param {number} config.interarrivalMean - Mean time between arrivals
     * @param {number} config.serviceMean - Mean service time
     * @param {number} config.serviceStd - Std of service time (for lognormal)
     * @param {number} config.openTime - Opening time in minutes
     * @param {number} config.lastArrival - Last arrival time
     * @param {number} config.closeTime - Closing time
     * @returns {Object} Simulation results
     */
    simulateQueueDay(config) {
        const {
            interarrivalMean,
            serviceMean,
            serviceStd = serviceMean * 0.4,
            openTime = 540,      // 09:00
            lastArrival = 990,   // 16:30
            closeTime = 1020     // 17:00
        } = config;

        const customers = [];
        let currentTime = openTime;
        let serverFreeAt = openTime;
        let maxWait = 0;

        // Generate arrivals
        while (currentTime < lastArrival) {
            const interarrival = Distributions.sampleExponential(interarrivalMean);
            currentTime += interarrival;

            if (currentTime >= lastArrival) break;

            const arrivalTime = currentTime;
            const serviceTime = Distributions.sampleLognormal(serviceMean, serviceStd);
            const serviceStartTime = Math.max(arrivalTime, serverFreeAt);
            const waitTime = serviceStartTime - arrivalTime;
            const serviceEndTime = serviceStartTime + serviceTime;

            serverFreeAt = serviceEndTime;
            maxWait = Math.max(maxWait, waitTime);

            customers.push({
                arrivalTime,
                serviceTime,
                waitTime,
                serviceStartTime,
                serviceEndTime
            });
        }

        return {
            maxWait,
            totalCustomers: customers.length,
            customers,
            avgWait: customers.length > 0
                ? customers.reduce((s, c) => s + c.waitTime, 0) / customers.length
                : 0,
            avgService: customers.length > 0
                ? customers.reduce((s, c) => s + c.serviceTime, 0) / customers.length
                : 0
        };
    },

    /**
     * Simulate compound success/failure over N trials
     *
     * @param {number} n - Number of trials
     * @param {number} successProb - Probability of success per trial
     * @returns {Object} Results including success count and whether all succeeded
     */
    simulateCompound(n, successProb) {
        let successes = 0;
        let allSucceeded = true;

        for (let i = 0; i < n; i++) {
            if (Math.random() < successProb) {
                successes++;
            } else {
                allSucceeded = false;
            }
        }

        return {
            successes,
            failures: n - successes,
            allSucceeded,
            successRate: successes / n
        };
    },

    /**
     * Simulate sampling from a finite population (capture-recapture style)
     *
     * @param {number} populationSize - Total population
     * @param {number} sampleSize - How many to sample
     * @param {boolean} withReplacement - Whether to replace after sampling
     * @returns {Array} Sample values (indices into population)
     */
    simulateSampling(populationSize, sampleSize, withReplacement = false) {
        const sample = [];

        if (withReplacement) {
            for (let i = 0; i < sampleSize; i++) {
                sample.push(Math.floor(Math.random() * populationSize));
            }
        } else {
            // Fisher-Yates partial shuffle
            const population = Array.from({ length: populationSize }, (_, i) => i);
            for (let i = 0; i < Math.min(sampleSize, populationSize); i++) {
                const j = i + Math.floor(Math.random() * (populationSize - i));
                [population[i], population[j]] = [population[j], population[i]];
                sample.push(population[i]);
            }
        }

        return sample;
    },

    /**
     * Simulate disease spread (simple SIR model)
     *
     * @param {Object} config
     * @param {number} config.population - Total population
     * @param {number} config.initialInfected - Starting infected
     * @param {number} config.transmissionRate - Probability of transmission per contact
     * @param {number} config.recoveryRate - Probability of recovery per day
     * @param {number} config.contactsPerDay - Average contacts per person per day
     * @param {number} config.days - Number of days to simulate
     * @returns {Object} Time series of S, I, R
     */
    simulateSIR(config) {
        const {
            population,
            initialInfected,
            transmissionRate,
            recoveryRate,
            contactsPerDay,
            days
        } = config;

        let S = population - initialInfected;
        let I = initialInfected;
        let R = 0;

        const history = [{ day: 0, S, I, R }];
        let peakInfected = I;

        for (let day = 1; day <= days; day++) {
            // New infections
            const contactProb = I / population;
            const newInfections = Math.min(S,
                Distributions.sampleBinomial(S, contactProb * transmissionRate * contactsPerDay / population * I));

            // Recoveries
            const recoveries = Distributions.sampleBinomial(I, recoveryRate);

            S -= newInfections;
            I += newInfections - recoveries;
            R += recoveries;

            history.push({ day, S, I, R });
            peakInfected = Math.max(peakInfected, I);
        }

        return {
            history,
            peakInfected,
            totalInfected: R + I,
            finalSusceptible: S
        };
    },

    /**
     * Simulate inventory management
     *
     * @param {Object} config
     * @param {number} config.initialStock - Starting inventory
     * @param {number} config.demandMean - Mean daily demand
     * @param {number} config.demandStd - Std of daily demand
     * @param {number} config.reorderPoint - When to reorder
     * @param {number} config.orderQuantity - How much to order
     * @param {number} config.leadTime - Days until order arrives
     * @param {number} config.days - Days to simulate
     * @returns {Object} Results including stockouts
     */
    simulateInventory(config) {
        const {
            initialStock,
            demandMean,
            demandStd,
            reorderPoint,
            orderQuantity,
            leadTime,
            days
        } = config;

        let stock = initialStock;
        let pendingOrders = []; // { arrivalDay, quantity }
        let stockouts = 0;
        let totalDemand = 0;
        let totalSatisfied = 0;

        const history = [{ day: 0, stock, demand: 0, satisfied: 0 }];

        for (let day = 1; day <= days; day++) {
            // Receive pending orders
            pendingOrders = pendingOrders.filter(order => {
                if (order.arrivalDay === day) {
                    stock += order.quantity;
                    return false;
                }
                return true;
            });

            // Generate demand
            const demand = Math.max(0, Math.round(Distributions.sampleNormal(demandMean, demandStd)));
            totalDemand += demand;

            // Satisfy demand
            const satisfied = Math.min(demand, stock);
            stock -= satisfied;
            totalSatisfied += satisfied;

            if (satisfied < demand) {
                stockouts++;
            }

            // Check reorder point
            if (stock <= reorderPoint && pendingOrders.length === 0) {
                pendingOrders.push({ arrivalDay: day + leadTime, quantity: orderQuantity });
            }

            history.push({ day, stock, demand, satisfied });
        }

        return {
            history,
            stockouts,
            serviceLevel: totalSatisfied / totalDemand,
            finalStock: stock
        };
    },

    /**
     * Generate data from a simple DGP for training
     *
     * @param {Object} dgp - Data generating process specification
     * @param {number} n - Number of samples
     * @returns {Array} Generated data
     */
    generateData(dgp, n) {
        const data = [];

        for (let i = 0; i < n; i++) {
            let value;

            switch (dgp.distribution) {
                case 'normal':
                    value = Distributions.sampleNormal(dgp.mean, dgp.std);
                    break;
                case 'exponential':
                    value = Distributions.sampleExponential(dgp.mean);
                    break;
                case 'lognormal':
                    value = Distributions.sampleLognormal(dgp.mean, dgp.std);
                    break;
                case 'uniform':
                    value = Distributions.sampleUniform(dgp.min, dgp.max);
                    break;
                case 'poisson':
                    value = Distributions.samplePoisson(dgp.lambda);
                    break;
                case 'binomial':
                    value = Distributions.sampleBinomial(dgp.n, dgp.p);
                    break;
                default:
                    throw new Error(`Unknown distribution: ${dgp.distribution}`);
            }

            // Apply rounding if specified
            if (dgp.round) {
                value = Math.round(value * dgp.round) / dgp.round;
            } else if (dgp.integer) {
                value = Math.round(value);
            }

            data.push(value);
        }

        return data;
    },

    /**
     * Monte Carlo probability estimation
     *
     * @param {Function} sampleFn - Function that generates one sample
     * @param {Function} conditionFn - Function that checks if condition is met
     * @param {number} n - Number of simulations
     * @returns {Object} Probability estimate and confidence interval
     */
    monteCarlo(sampleFn, conditionFn, n = 10000) {
        let count = 0;

        for (let i = 0; i < n; i++) {
            const sample = sampleFn();
            if (conditionFn(sample)) {
                count++;
            }
        }

        const p = count / n;
        const se = Math.sqrt(p * (1 - p) / n);

        return {
            probability: p,
            standardError: se,
            confidenceInterval: [p - 1.96 * se, p + 1.96 * se],
            numSimulations: n,
            countPassing: count
        };
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Simulations;
}
