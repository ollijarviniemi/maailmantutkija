/**
 * Animation Registry
 *
 * Central registry for all animation types. Animations self-register
 * with their class, stats configuration, and output declarations.
 *
 * This eliminates switch statements in game.js and makes the
 * animation-level contract explicit.
 */

const AnimationRegistry = {
    _animations: new Map(),

    /**
     * Register an animation type
     *
     * @param {string} type - Unique identifier (e.g., 'scale', 'bulbs')
     * @param {object} config - Registration config
     * @param {class} config.class - The animation class
     * @param {object} config.statsConfig - Stats panel configuration
     * @param {string[]} config.outputs - Fields this animation produces in collectedData
     * @param {function} config.statsMapper - Maps raw stats to display values
     */
    register(type, config) {
        if (this._animations.has(type)) {
            console.warn(`Animation '${type}' already registered, overwriting`);
        }

        this._animations.set(type, {
            class: config.class,
            statsConfig: config.statsConfig || {},
            outputs: config.outputs || [],
            statsMapper: config.statsMapper || null
        });
    },

    /**
     * Check if an animation type is registered
     */
    has(type) {
        return this._animations.has(type);
    },

    /**
     * Create an animation instance
     */
    create(type, canvas, config) {
        const entry = this._animations.get(type);
        if (!entry) {
            throw new Error(`Unknown animation type: '${type}'. Available: ${this.getTypes().join(', ')}`);
        }
        return new entry.class(canvas, config);
    },

    /**
     * Get stats panel configuration for an animation type
     */
    getStatsConfig(type) {
        const entry = this._animations.get(type);
        return entry?.statsConfig || {};
    },

    /**
     * Get declared outputs for an animation type
     */
    getOutputs(type) {
        const entry = this._animations.get(type);
        return entry?.outputs || [];
    },

    /**
     * Map raw stats from animation to display values
     */
    mapStats(type, rawStats) {
        const entry = this._animations.get(type);
        if (entry?.statsMapper) {
            return entry.statsMapper(rawStats);
        }
        return rawStats;
    },

    /**
     * Get all registered animation types
     */
    getTypes() {
        return Array.from(this._animations.keys());
    },

    /**
     * Get full registration info (for debugging)
     */
    getInfo(type) {
        return this._animations.get(type);
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationRegistry;
}
