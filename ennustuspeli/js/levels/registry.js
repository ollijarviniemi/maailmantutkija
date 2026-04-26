/**
 * Level Registry
 *
 * Manages level definitions, unlocking, and progress tracking.
 */

const LevelRegistry = {
    levels: [],
    _levelMap: new Map(),

    /**
     * Initialize the registry (can be called with existing definitions or empty)
     */
    init(levels = null) {
        if (levels && Array.isArray(levels)) {
            // Legacy mode: init with array
            this.levels = levels;
            this._levelMap.clear();
            for (const level of this.levels) {
                this._levelMap.set(level.id, level);
            }
        }
        // Otherwise just ensure arrays exist
        if (!this.levels) this.levels = [];
    },

    /**
     * Register a single level (used by LevelLoader)
     */
    register(level) {
        if (this._levelMap.has(level.id)) {
            console.warn(`Level ${level.id} already registered, skipping`);
            return;
        }
        this.levels.push(level);
        this._levelMap.set(level.id, level);
    },

    /**
     * Get count of registered levels
     */
    count() {
        return this.levels.length;
    },

    /**
     * Get all levels
     */
    getAll() {
        return this.levels;
    },

    /**
     * Get a level by ID
     */
    get(id) {
        return this._levelMap.get(id) || this.levels.find(l => l.id === id);
    },

    /**
     * Get the index of a level
     */
    getIndex(id) {
        return this.levels.findIndex(l => l.id === id);
    },

    /**
     * Get the next level after the given one
     */
    getNext(id) {
        const index = this.getIndex(id);
        if (index === -1 || index >= this.levels.length - 1) {
            return null;
        }
        return this.levels[index + 1];
    },

    /**
     * Check if a level is unlocked
     */
    isUnlocked(id) {
        const level = this.get(id);
        if (!level) return false;

        // First level is always unlocked
        if (level.requires.length === 0) return true;

        // Check if all prerequisites are completed
        for (const reqId of level.requires) {
            if (!Persistence.isLevelCompleted(reqId)) {
                return false;
            }
        }
        return true;
    },

    /**
     * Get levels with their unlock status
     */
    getLevelsWithStatus() {
        return this.levels.map(level => ({
            ...level,
            unlocked: this.isUnlocked(level.id),
            completed: Persistence.isLevelCompleted(level.id),
            stars: Persistence.getLevelStars(level.id)
        }));
    },

    /**
     * Get available (unlocked but not 3-starred) levels
     */
    getAvailableLevels() {
        return this.getLevelsWithStatus().filter(
            l => l.unlocked && l.stars < 3
        );
    },

    /**
     * Complete a level and return unlocked content
     */
    completeLevel(id, stars, score) {
        const level = this.get(id);
        if (!level) {
            throw new Error(`Unknown level: ${id}`);
        }

        // Save progress
        const result = Persistence.completeLevel(id, stars, score);

        // Check for newly unlocked functions
        const unlockedFunctions = [];
        if (stars >= 1 && level.unlocks) {
            for (const func of level.unlocks) {
                if (Persistence.unlockFunction(func)) {
                    unlockedFunctions.push(func);
                }
            }
        }

        // Check for newly unlocked levels
        const unlockedLevels = [];
        for (const l of this.levels) {
            if (l.requires.includes(id) && this.isUnlocked(l.id)) {
                // Check if this level was just unlocked
                const otherReqs = l.requires.filter(r => r !== id);
                const wasLocked = otherReqs.some(r => !Persistence.isLevelCompleted(r));
                if (!wasLocked) {
                    unlockedLevels.push(l);
                }
            }
        }

        return {
            ...result,
            unlockedFunctions,
            unlockedLevels
        };
    },

    /**
     * Generate data for a level based on its DGP
     */
    generateData(level) {
        const { dgp } = level;

        if (dgp.type === 'simple') {
            return Simulations.generateData(dgp.distribution, dgp.sampleSize);
        }

        if (dgp.type === 'simulation') {
            switch (dgp.simulation) {
                case 'compound':
                    return Simulations.simulateCompound(dgp.params.n, dgp.params.successProb);
                case 'queue':
                    return Simulations.simulateQueueDay(dgp.params);
                default:
                    throw new Error(`Unknown simulation type: ${dgp.simulation}`);
            }
        }

        throw new Error(`Unknown DGP type: ${dgp.type}`);
    },

    /**
     * Calculate the true answer for a level
     */
    calculateTrueAnswer(level, data) {
        const { question, dgp } = level;
        const target = question.target;

        // Handle DSL expressions
        if (target.startsWith('P(')) {
            // Monte Carlo probability
            if (dgp.type === 'simple') {
                const match = target.match(/P\((\w+)\s*([<>=!]+)\s*([\d.]+)\)/);
                if (match) {
                    const threshold = parseFloat(match[3]);
                    const op = match[2];
                    return Distributions.probability(dgp.distribution, op, threshold) * 100;
                }
            }
            // For simulations, we need to run many times
            if (dgp.type === 'simulation') {
                const match = target.match(/P\((\w+)\s*([<>=!]+)\s*([\d.]+)\)/);
                if (match) {
                    const field = match[1];
                    const op = match[2];
                    const threshold = parseFloat(match[3]);

                    let count = 0;
                    const n = 1000;
                    for (let i = 0; i < n; i++) {
                        const simData = this.generateData(level);
                        const value = simData[field];
                        if (Distributions.checkCondition(value, op, threshold)) {
                            count++;
                        }
                    }
                    return (count / n) * 100;
                }
            }
        }

        // Handle simple field references
        if (target === 'mean' && Array.isArray(data)) {
            return data.reduce((a, b) => a + b, 0) / data.length;
        }
        if (target === 'count' && Array.isArray(data)) {
            return data.length;
        }
        if (target === 'allSucceeded' && typeof data === 'object') {
            // For compound events, run Monte Carlo
            const n = 1000;
            let count = 0;
            for (let i = 0; i < n; i++) {
                const sim = Simulations.simulateCompound(dgp.params.n, dgp.params.successProb);
                if (sim.allSucceeded) count++;
            }
            return (count / n) * 100;
        }

        // Direct field access
        if (typeof data === 'object' && target in data) {
            return data[target];
        }

        throw new Error(`Cannot calculate answer for target: ${target}`);
    },

    /**
     * Score a player's answer
     */
    scoreAnswer(level, playerAnswer, trueAnswer) {
        const { scoring } = level;
        const { thresholds } = scoring;

        let error;
        if (scoring.type === 'probability' || scoring.type === 'absolute') {
            error = Math.abs(playerAnswer - trueAnswer);
        } else if (scoring.type === 'relative') {
            error = Math.abs(playerAnswer - trueAnswer) / Math.abs(trueAnswer);
        }

        let stars = 0;
        if (error <= thresholds[2]) stars = 3;
        else if (error <= thresholds[1]) stars = 2;
        else if (error <= thresholds[0]) stars = 1;

        return {
            stars,
            error,
            playerAnswer,
            trueAnswer,
            thresholds
        };
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LevelRegistry;
}
