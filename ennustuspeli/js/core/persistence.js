/**
 * Persistence Layer
 *
 * Handles saving and loading game progress to localStorage.
 */

const Persistence = {
    STORAGE_KEY: 'ennustuspeli_progress',

    // Default state
    defaultState: {
        version: 1,
        completedLevels: {},      // levelId -> { stars, bestScore, attempts, lastPlayed }
        unlockedFunctions: ['mean', 'std'],  // Start with basic functions
        currentLevel: null,
        totalPlayTime: 0,
        settings: {
            soundEnabled: true,
            animationSpeed: 1
        }
    },

    /**
     * Load game state from localStorage
     */
    load() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const state = JSON.parse(stored);
                // Merge with defaults to handle new fields
                return { ...this.defaultState, ...state };
            }
        } catch (e) {
            console.error('Failed to load game state:', e);
        }
        return { ...this.defaultState };
    },

    /**
     * Save game state to localStorage
     */
    save(state) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
            return true;
        } catch (e) {
            console.error('Failed to save game state:', e);
            return false;
        }
    },

    /**
     * Mark a level as completed
     */
    completeLevel(levelId, stars, score) {
        const state = this.load();
        const existing = state.completedLevels[levelId] || { attempts: 0, bestScore: 0, stars: 0 };

        state.completedLevels[levelId] = {
            stars: Math.max(existing.stars, stars),
            bestScore: Math.max(existing.bestScore, score),
            attempts: existing.attempts + 1,
            lastPlayed: Date.now()
        };

        this.save(state);
        return state.completedLevels[levelId];
    },

    /**
     * Check if a level is completed
     */
    isLevelCompleted(levelId) {
        const state = this.load();
        return !!state.completedLevels[levelId];
    },

    /**
     * Get stars for a level
     */
    getLevelStars(levelId) {
        const state = this.load();
        return state.completedLevels[levelId]?.stars || 0;
    },

    /**
     * Unlock a new function
     */
    unlockFunction(funcName) {
        const state = this.load();
        if (!state.unlockedFunctions.includes(funcName)) {
            state.unlockedFunctions.push(funcName);
            this.save(state);
            return true; // Newly unlocked
        }
        return false; // Already unlocked
    },

    /**
     * Check if a function is unlocked
     */
    isFunctionUnlocked(funcName) {
        const state = this.load();
        return state.unlockedFunctions.includes(funcName);
    },

    /**
     * Get all unlocked functions
     */
    getUnlockedFunctions() {
        const state = this.load();
        return [...state.unlockedFunctions];
    },

    /**
     * Get all completed level data (for progress checking)
     */
    getAll() {
        const state = this.load();
        return state.completedLevels;
    },

    /**
     * Get completion summary
     */
    getSummary() {
        const state = this.load();
        const levels = Object.values(state.completedLevels);

        return {
            levelsCompleted: levels.length,
            totalStars: levels.reduce((sum, l) => sum + l.stars, 0),
            totalAttempts: levels.reduce((sum, l) => sum + l.attempts, 0),
            functionsUnlocked: state.unlockedFunctions.length
        };
    },

    /**
     * Reset all progress
     */
    reset() {
        this.save({ ...this.defaultState });
    },

    /**
     * Export progress as JSON string
     */
    exportProgress() {
        return JSON.stringify(this.load(), null, 2);
    },

    /**
     * Import progress from JSON string
     */
    importProgress(jsonString) {
        try {
            const state = JSON.parse(jsonString);
            if (state.version) {
                this.save(state);
                return true;
            }
        } catch (e) {
            console.error('Failed to import progress:', e);
        }
        return false;
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Persistence;
}
