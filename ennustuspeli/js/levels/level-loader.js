/**
 * Level Loader
 *
 * Loads all narrative content files and registers levels.
 * This file should be loaded after all content files.
 */

const LevelLoader = {
    _loaded: false,

    /**
     * Initialize all levels from content files
     */
    init() {
        if (this._loaded) return;

        // Content files register themselves via LEVEL_CONTENT global
        if (typeof LEVEL_CONTENT === 'undefined') {
            console.warn('No LEVEL_CONTENT found');
            return;
        }

        // Register all levels
        for (const narrativeId in LEVEL_CONTENT) {
            const levels = LEVEL_CONTENT[narrativeId];
            for (const level of levels) {
                // Validate and register
                const validation = LevelValidator.validate(level);
                if (!validation.valid) {
                    console.error(`Invalid level ${level.id}:`, validation.errors);
                    continue;
                }
                LevelRegistry.register(level);
            }
        }

        this._loaded = true;
        console.log(`Loaded ${LevelRegistry.count()} levels`);
    },

    /**
     * Get all levels for a narrative
     */
    getLevelsForNarrative(narrativeId) {
        const narrative = NarrativeRegistry.get(narrativeId);
        if (!narrative) return [];

        return narrative.levels.map(id => LevelRegistry.get(id)).filter(Boolean);
    }
};

// Global content storage
const LEVEL_CONTENT = {};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LevelLoader, LEVEL_CONTENT };
}
