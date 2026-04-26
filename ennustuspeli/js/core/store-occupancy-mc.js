/**
 * Monte Carlo Simulation for Store Occupancy
 *
 * Simulates the store DGP many times to compute true exceedance probabilities.
 * Used for scoring player predictions.
 */

const StoreOccupancyMC = {
    /**
     * Run Monte Carlo simulation to estimate exceedance probability
     * @param {Object} config - DGP configuration
     * @param {number} threshold - Customer count threshold
     * @param {number} numSimulations - Number of simulations (default 5000)
     * @returns {number} Probability that max occupancy exceeds threshold
     */
    simulateExceedanceProbability(config, threshold, numSimulations = 5000) {
        let exceedances = 0;

        for (let i = 0; i < numSimulations; i++) {
            const maxOccupancy = this.simulateDay(config);
            if (maxOccupancy > threshold) {
                exceedances++;
            }
        }

        return exceedances / numSimulations;
    },

    /**
     * Run Monte Carlo for each day of the week
     * @param {Object} config - DGP configuration
     * @param {number} threshold - Customer count threshold
     * @param {number} numSimulations - Simulations per day
     * @returns {Array<number>} Array of 7 probabilities (Mon-Sun)
     */
    simulateExceedanceProbabilityByDay(config, threshold, numSimulations = 2000) {
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const probabilities = [];

        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            let exceedances = 0;
            const dayConfig = { ...config, forceDayOfWeek: dayNames[dayIndex] };

            for (let i = 0; i < numSimulations; i++) {
                const maxOccupancy = this.simulateDay(dayConfig);
                if (maxOccupancy > threshold) {
                    exceedances++;
                }
            }

            probabilities.push(exceedances / numSimulations);
        }

        return probabilities;
    },

    /**
     * Simulate a single day and return max occupancy
     * @param {Object} config - DGP configuration
     * @returns {number} Maximum occupancy during the day
     */
    simulateDay(config) {
        const openTime = 9 * 60;   // 09:00
        const closeTime = 21 * 60; // 21:00

        // Generate arrivals
        const arrivals = this.generateArrivals(config, openTime, closeTime);

        // Track occupancy over time
        let maxOccupancy = 0;
        const events = [];

        // Create arrival and departure events
        for (const arrival of arrivals) {
            events.push({ time: arrival.time, type: 'arrival', count: arrival.count });
            events.push({ time: arrival.departureTime, type: 'departure', count: arrival.count });
        }

        // Sort by time
        events.sort((a, b) => a.time - b.time);

        // Process events
        let currentOccupancy = 0;
        for (const event of events) {
            if (event.type === 'arrival') {
                currentOccupancy += event.count;
                if (currentOccupancy > maxOccupancy) {
                    maxOccupancy = currentOccupancy;
                }
            } else {
                currentOccupancy -= event.count;
            }
        }

        return maxOccupancy;
    },

    /**
     * Generate arrivals for a day
     */
    generateArrivals(config, openTime, closeTime) {
        const arrivals = [];
        let time = openTime;
        let currentOccupancy = 0;  // Track for crowding effects

        // Simple event list for crowding calculation
        const occupancyEvents = [];

        while (time < closeTime) {
            // Update current occupancy based on past events
            if (config.crowdingEffect) {
                currentOccupancy = 0;
                for (const evt of occupancyEvents) {
                    if (evt.time <= time && evt.departureTime > time) {
                        currentOccupancy += evt.count;
                    }
                }
            }

            // Get arrival rate
            const rate = this.getArrivalRate(time, config, currentOccupancy);

            if (rate <= 0) {
                time += 1;
                continue;
            }

            // Inter-arrival time (exponential)
            const interArrival = -Math.log(Math.random()) / rate;
            time += interArrival;

            if (time >= closeTime) break;

            // Generate customer(s)
            const group = this.generateGroup(time, config, currentOccupancy);
            arrivals.push(group);
            occupancyEvents.push(group);
        }

        return arrivals;
    },

    /**
     * Get arrival rate at given time
     */
    getArrivalRate(time, config, currentOccupancy = 0) {
        let rate = config.baseArrivalRate || 0.5;

        // Peak hours effect
        if (config.type === 'peak-hours' || config.peakHours) {
            const peakTime = config.peakTime || (17 * 60);
            const peakWidth = config.peakWidth || 120;
            const peakMultiplier = config.peakMultiplier || 3;

            const distFromPeak = Math.abs(time - peakTime);
            const peakEffect = Math.exp(-0.5 * (distFromPeak / (peakWidth / 2)) ** 2);
            rate *= (1 + (peakMultiplier - 1) * peakEffect);
        }

        // Weekday effect
        if (config.weekdayEffects || config.type === 'weekday') {
            const dayOfWeek = config.forceDayOfWeek || 'Wednesday';  // Default to mid-week
            const multipliers = config.weekdayMultipliers || {};
            rate *= multipliers[dayOfWeek] || 1.0;
        }

        // Crowding effect on arrivals
        if (config.crowdingEffect && currentOccupancy > 0) {
            const crowdThreshold = config.crowdThreshold || 20;
            const crowdReduction = config.crowdReduction || 0.5;
            if (currentOccupancy > crowdThreshold) {
                const excess = currentOccupancy - crowdThreshold;
                rate *= Math.max(0.1, 1 - crowdReduction * (excess / crowdThreshold));
            }
        }

        return rate;
    },

    /**
     * Generate a group (or single customer)
     */
    generateGroup(time, config, currentOccupancy = 0) {
        let groupSize = 1;

        // Group probability
        if (config.groups) {
            const groupProb = config.groupProbability || 0.3;
            if (Math.random() < groupProb) {
                if (config.groupSizeDistribution === 'poisson') {
                    groupSize = 1 + this.samplePoisson((config.meanGroupSize || 2.5) - 1);
                } else {
                    groupSize = 2 + Math.floor(Math.random() * 3);
                }
            }
        }

        // Stay time
        let stayTime = this.sampleStayTime(config);

        // Crowding effect on stay time
        if (config.crowdingEffect && currentOccupancy > 0) {
            const crowdThreshold = config.crowdThreshold || 20;
            if (currentOccupancy > crowdThreshold) {
                const reduction = config.stayTimeReduction || 0.3;
                stayTime *= (1 - reduction);
            }
        }

        stayTime = Math.max(2, stayTime);

        return {
            time,
            count: groupSize,
            departureTime: time + stayTime
        };
    },

    /**
     * Sample stay time based on config
     */
    sampleStayTime(config) {
        if (config.customerTypes === 'discrete') {
            const fastProb = config.fastProbability || 0.5;
            if (Math.random() < fastProb) {
                return this.sampleExponential(config.fastMeanStay || 8);
            } else {
                return this.sampleExponential(config.slowMeanStay || 25);
            }
        } else if (config.customerTypes === 'continuous') {
            const minMean = config.minMeanStay || 5;
            const maxMean = config.maxMeanStay || 30;
            const meanStay = minMean + Math.random() * (maxMean - minMean);
            return this.sampleExponential(meanStay);
        } else {
            return this.sampleExponential(config.meanStayTime || 15);
        }
    },

    /**
     * Sample from exponential distribution
     */
    sampleExponential(mean) {
        return -mean * Math.log(Math.random());
    },

    /**
     * Sample from Poisson distribution
     */
    samplePoisson(lambda) {
        let L = Math.exp(-lambda);
        let k = 0;
        let p = 1;
        do {
            k++;
            p *= Math.random();
        } while (p > L);
        return k - 1;
    },

    /**
     * Score player's probability estimate against Monte Carlo truth
     * @param {number} playerProb - Player's probability (0-1)
     * @param {Object} trueDGP - True DGP config
     * @param {Object} scoring - Scoring config with thresholds
     * @returns {Object} {stars, error, trueProb}
     */
    scoreExceedanceProbability(playerProb, trueDGP, scoring) {
        const trueProb = this.simulateExceedanceProbability(
            trueDGP.config,
            trueDGP.threshold,
            5000
        );

        const error = Math.abs(playerProb - trueProb);
        const thresholds = scoring.thresholds || [0.15, 0.08, 0.04];

        let stars = 0;
        if (error <= thresholds[2]) stars = 3;
        else if (error <= thresholds[1]) stars = 2;
        else if (error <= thresholds[0]) stars = 1;

        return {
            stars,
            error,
            trueProb,
            playerProb
        };
    },

    /**
     * Score player's multiday probability estimates
     * @param {Array<number>} playerProbs - Array of 7 probabilities
     * @param {Object} trueDGP - True DGP config
     * @param {Object} scoring - Scoring config
     * @returns {Object} {stars, errors, trueProbs}
     */
    scoreMultidayProbability(playerProbs, trueDGP, scoring) {
        const trueProbs = this.simulateExceedanceProbabilityByDay(
            trueDGP.config,
            trueDGP.threshold,
            2000
        );

        const errors = playerProbs.map((p, i) => Math.abs(p - trueProbs[i]));
        const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;

        const thresholds = scoring.thresholds || [0.12, 0.07, 0.04];

        let stars = 0;
        if (avgError <= thresholds[2]) stars = 3;
        else if (avgError <= thresholds[1]) stars = 2;
        else if (avgError <= thresholds[0]) stars = 1;

        return {
            stars,
            avgError,
            errors,
            trueProbs,
            playerProbs
        };
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StoreOccupancyMC;
}
