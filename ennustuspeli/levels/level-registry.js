/**
 * Level Registry for Ennustuspeli
 *
 * Manages saving, loading, and organizing levels.
 * Uses localStorage for persistence.
 */

const LevelRegistry = {
    STORAGE_KEYS: {
        LEVELS: 'ennustuspeli_levels',
        HISTORY: 'ennustuspeli_history',
        GROUPS: 'ennustuspeli_groups'
    },

    // Group names for organizing levels
    GROUP_NAMES: [
        'Alkeet',        // Basics
        'Vinoumat',      // Biases
        'Kanavat',       // Channels
        'Monimutkaisia', // Complex
        'Muut'           // Other
    ],

    /**
     * Save a level
     */
    saveLevel(levelData) {
        const levels = this.getAllLevels();

        // Check if updating existing level
        const existingIndex = levels.findIndex(l => l.id === levelData.id);
        if (existingIndex >= 0) {
            levels[existingIndex] = levelData;
        } else {
            levels.push(levelData);
        }

        localStorage.setItem(this.STORAGE_KEYS.LEVELS, JSON.stringify(levels));
        return levelData.id;
    },

    /**
     * Get all levels
     */
    getAllLevels() {
        const data = localStorage.getItem(this.STORAGE_KEYS.LEVELS);
        if (!data) {
            // Return default levels if none saved
            return this.getDefaultLevels();
        }
        return JSON.parse(data);
    },

    /**
     * Get a specific level by ID
     */
    getLevel(levelId) {
        const levels = this.getAllLevels();
        return levels.find(l => l.id === levelId);
    },

    /**
     * Delete a level
     */
    deleteLevel(levelId) {
        const levels = this.getAllLevels();
        const filtered = levels.filter(l => l.id !== levelId);
        localStorage.setItem(this.STORAGE_KEYS.LEVELS, JSON.stringify(filtered));

        // Also remove from groups
        const groups = this.loadGroups();
        for (const groupId in groups) {
            groups[groupId] = groups[groupId].filter(id => id !== levelId);
        }
        this.saveGroups(groups);
    },

    /**
     * Get level groups
     */
    loadGroups() {
        const data = localStorage.getItem(this.STORAGE_KEYS.GROUPS);
        if (!data) {
            return this.getDefaultGroups();
        }
        return JSON.parse(data);
    },

    /**
     * Save level groups
     */
    saveGroups(groups) {
        localStorage.setItem(this.STORAGE_KEYS.GROUPS, JSON.stringify(groups));
    },

    /**
     * Add level to group
     */
    addToGroup(levelId, groupId) {
        const groups = this.loadGroups();
        if (!groups[groupId]) {
            groups[groupId] = [];
        }

        // Remove from other groups first
        for (const gid in groups) {
            groups[gid] = groups[gid].filter(id => id !== levelId);
        }

        groups[groupId].push(levelId);
        this.saveGroups(groups);
    },

    /**
     * Get play history for a level
     */
    getLevelHistory(levelId) {
        const allHistory = this.getAllHistory();
        return allHistory[levelId] || [];
    },

    /**
     * Add history entry for a level
     */
    addHistoryEntry(levelId, entry) {
        const allHistory = this.getAllHistory();
        if (!allHistory[levelId]) {
            allHistory[levelId] = [];
        }
        allHistory[levelId].push(entry);
        localStorage.setItem(this.STORAGE_KEYS.HISTORY, JSON.stringify(allHistory));
    },

    /**
     * Get all history
     */
    getAllHistory() {
        const data = localStorage.getItem(this.STORAGE_KEYS.HISTORY);
        return data ? JSON.parse(data) : {};
    },

    /**
     * Get best stats for a level
     */
    getBestStats(levelId) {
        const history = this.getLevelHistory(levelId);
        if (history.length === 0) return null;

        const scores = history.map(h => h.score || 0);
        return {
            bestScore: Math.max(...scores),
            plays: history.length,
            avgScore: scores.reduce((a, b) => a + b, 0) / scores.length
        };
    },

    /**
     * Default groups structure
     */
    getDefaultGroups() {
        return {
            group0: ['level_intro_1', 'level_intro_2', 'level_intro_3'],
            group1: [],
            group2: [],
            group3: [],
            group4: []
        };
    },

    /**
     * Default levels (built-in levels)
     */
    getDefaultLevels() {
        return [
            // Level 1: Simple 3-row symmetric board
            {
                id: 'level_intro_1',
                name: 'Ensimmäinen lauta',
                description: 'Yksinkertainen 3 rivin lauta ilman seiniä.',
                lattice: {
                    numRows: 3,
                    cellSize: 60,
                    walls: []
                },
                created: '2024-01-01T00:00:00.000Z'
            },

            // Level 2: 3-row with one wall
            {
                id: 'level_intro_2',
                name: 'Yksi seinä',
                description: 'Kokeile miten yksi seinä vaikuttaa jakaumaan.',
                lattice: {
                    numRows: 3,
                    cellSize: 60,
                    walls: ['1,0,right']
                },
                created: '2024-01-01T00:00:00.000Z'
            },

            // Level 3: 4-row with symmetric walls
            {
                id: 'level_intro_3',
                name: 'Symmetrinen',
                description: 'Symmetrinen lauta kahdella seinällä.',
                lattice: {
                    numRows: 4,
                    cellSize: 60,
                    walls: ['1,0,left', '1,0,right']
                },
                created: '2024-01-01T00:00:00.000Z'
            }
        ];
    },

    /**
     * Reset all data
     */
    resetAll() {
        localStorage.removeItem(this.STORAGE_KEYS.LEVELS);
        localStorage.removeItem(this.STORAGE_KEYS.HISTORY);
        localStorage.removeItem(this.STORAGE_KEYS.GROUPS);
    },

    /**
     * Export all data
     */
    exportAll() {
        return {
            levels: this.getAllLevels(),
            groups: this.loadGroups(),
            history: this.getAllHistory()
        };
    },

    /**
     * Import data
     */
    importData(data, mode = 'merge') {
        if (mode === 'replace') {
            this.resetAll();
        }

        if (data.levels) {
            const existing = mode === 'merge' ? this.getAllLevels() : [];
            const merged = [...existing];

            for (const level of data.levels) {
                const idx = merged.findIndex(l => l.id === level.id);
                if (idx >= 0) {
                    merged[idx] = level;
                } else {
                    merged.push(level);
                }
            }

            localStorage.setItem(this.STORAGE_KEYS.LEVELS, JSON.stringify(merged));
        }

        if (data.groups && mode === 'replace') {
            this.saveGroups(data.groups);
        }

        if (data.history && mode === 'replace') {
            localStorage.setItem(this.STORAGE_KEYS.HISTORY, JSON.stringify(data.history));
        }
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.LevelRegistry = LevelRegistry;
}
