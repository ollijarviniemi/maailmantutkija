/**
 * Level Registry
 *
 * Manages levels, groups, and history in localStorage
 */

const LevelRegistry = {
  STORAGE_KEYS: {
    LEVELS: 'bayesianFactoryLevels',
    GROUPS: 'bayesianFactoryGroups',
    HISTORY: 'bayesianFactoryHistory'
  },

  GROUP_NAMES: ['Group 1', 'Group 2', 'Group 3', 'Group 4', 'Group 5', 'Group 6', 'Other'],

  /**
   * Initialize and migrate if needed
   */
  init() {
    this.migrateIfNeeded();
  },

  /**
   * Migrate old format to new grouped format if needed
   */
  migrateIfNeeded() {
    const groups = localStorage.getItem(this.STORAGE_KEYS.GROUPS);

    if (!groups) {
      console.warn('[LevelRegistry] Migrating to grouped format');

      // Get all existing levels
      const levels = this.getAllLevels();

      // Create new groups structure
      const newGroups = {
        'group1': [],
        'group2': [],
        'group3': [],
        'group4': [],
        'group5': [],
        'group6': [],
        'other': levels.map(l => l.meta.id)  // All existing levels → "other"
      };

      this.saveGroups(newGroups);

      // Create empty history
      if (!localStorage.getItem(this.STORAGE_KEYS.HISTORY)) {
        localStorage.setItem(this.STORAGE_KEYS.HISTORY, '{}');
      }

      console.warn('[LevelRegistry] Migration complete. All levels moved to "Other" group');
    }
  },

  // ==================== LEVEL MANAGEMENT ====================

  /**
   * Get level by ID from localStorage
   */
  getLevel(id) {
    const levels = this.getAllLevels();
    return levels.find(l => l.meta.id === id);
  },

  /**
   * Get all levels from localStorage
   */
  getAllLevels() {
    const saved = localStorage.getItem(this.STORAGE_KEYS.LEVELS);
    return saved ? JSON.parse(saved) : [];
  },

  /**
   * Save all levels to localStorage
   */
  saveLevels(levels) {
    localStorage.setItem(this.STORAGE_KEYS.LEVELS, JSON.stringify(levels));
  },

  /**
   * Get level count
   */
  getLevelCount() {
    return this.getAllLevels().length;
  },

  /**
   * Delete a level by ID (also removes from groups and history)
   */
  deleteLevel(id) {
    // Remove from levels array
    const levels = this.getAllLevels();
    const filtered = levels.filter(l => l.meta.id !== id);
    this.saveLevels(filtered);

    // Remove from groups
    const groups = this.loadGroups();
    for (const groupId in groups) {
      groups[groupId] = groups[groupId].filter(levelId => levelId !== id);
    }
    this.saveGroups(groups);

    // Remove history
    const history = this.loadHistory();
    delete history[id];
    this.saveHistory(history);
  },

  /**
   * Duplicate a level (creates new ID, adds to same group)
   */
  duplicateLevel(id) {
    const level = this.getLevel(id);
    if (!level) {
      console.error(`[LevelRegistry] Cannot duplicate level ${id} - not found`);
      return null;
    }

    // Create copy with new ID
    const levels = this.getAllLevels();
    const maxId = Math.max(0, ...levels.map(l => {
      const match = l.meta.id.match(/^level-(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    }));
    const newId = `level-${maxId + 1}`;
    const newLevel = JSON.parse(JSON.stringify(level));  // Deep clone
    newLevel.meta.id = newId;
    newLevel.meta.title = `Taso ${maxId + 1}`;

    // Add to levels array
    levels.push(newLevel);
    this.saveLevels(levels);

    // Add to same group as original
    const groups = this.loadGroups();
    for (const groupId in groups) {
      if (groups[groupId].includes(id)) {
        groups[groupId].push(newId);
        break;
      }
    }
    this.saveGroups(groups);

    return newId;
  },

  // ==================== GROUP MANAGEMENT ====================

  /**
   * Load groups from localStorage
   */
  loadGroups() {
    const saved = localStorage.getItem(this.STORAGE_KEYS.GROUPS);
    return saved ? JSON.parse(saved) : {
      'group1': [], 'group2': [], 'group3': [], 'group4': [],
      'group5': [], 'group6': [], 'other': []
    };
  },

  /**
   * Save groups to localStorage
   */
  saveGroups(groups) {
    localStorage.setItem(this.STORAGE_KEYS.GROUPS, JSON.stringify(groups));
  },

  /**
   * Get levels for a specific group
   */
  getGroupLevels(groupId) {
    const groups = this.loadGroups();
    const levelIds = groups[groupId] || [];
    const allLevels = this.getAllLevels();
    return levelIds.map(id => allLevels.find(l => l.meta.id === id)).filter(Boolean);
  },

  /**
   * Move level to a different position (within or between groups)
   */
  moveLevel(levelId, fromGroupId, toGroupId, newIndex) {
    const groups = this.loadGroups();

    // Remove from source
    groups[fromGroupId] = groups[fromGroupId].filter(id => id !== levelId);

    // Insert into target at position
    groups[toGroupId].splice(newIndex, 0, levelId);

    this.saveGroups(groups);
  },

  /**
   * Get which group a level belongs to
   */
  findGroupForLevel(levelId) {
    const groups = this.loadGroups();
    for (const groupId in groups) {
      if (groups[groupId].includes(levelId)) {
        return groupId;
      }
    }
    return null;
  },

  // ==================== HISTORY MANAGEMENT ====================

  /**
   * Load history from localStorage
   */
  loadHistory() {
    const saved = localStorage.getItem(this.STORAGE_KEYS.HISTORY);
    return saved ? JSON.parse(saved) : {};
  },

  /**
   * Save history to localStorage
   */
  saveHistory(history) {
    localStorage.setItem(this.STORAGE_KEYS.HISTORY, JSON.stringify(history));
  },

  /**
   * Get history for a specific level
   */
  getLevelHistory(levelId) {
    const history = this.loadHistory();
    return history[levelId] || [];
  },

  /**
   * Add a history entry for a level
   */
  addHistoryEntry(levelId, entry) {
    const history = this.loadHistory();
    if (!history[levelId]) {
      history[levelId] = [];
    }
    history[levelId].push(entry);
    this.saveHistory(history);
  },

  /**
   * Get play count for a level (completed plays only)
   */
  getPlayCount(levelId) {
    return this.getLevelHistory(levelId).length;
  },

  /**
   * Get best stats for a level
   */
  getBestStats(levelId) {
    const history = this.getLevelHistory(levelId);
    if (history.length === 0) {
      return null;
    }

    const bestKL = Math.min(...history.map(h => h.klDivergence));
    const bestStars = Math.max(...history.map(h => h.stars));
    const avgKL = history.reduce((sum, h) => sum + h.klDivergence, 0) / history.length;
    const avgStars = history.reduce((sum, h) => sum + h.stars, 0) / history.length;

    return {
      bestKL,
      bestStars,
      avgKL,
      avgStars,
      plays: history.length
    };
  },

  // ==================== IMPORT/EXPORT ====================

  /**
   * Export all data (levels, groups, history) to JSON
   */
  exportAll() {
    return {
      levels: this.getAllLevels(),
      groups: this.loadGroups(),
      history: this.loadHistory(),
      exportDate: new Date().toISOString(),
      version: 1
    };
  },

  /**
   * Import data (merge or replace mode)
   */
  importData(data, mode = 'merge') {
    if (!data.levels || !data.groups) {
      throw new Error('Invalid import data: missing levels or groups');
    }

    if (mode === 'replace') {
      // Replace everything
      this.saveLevels(data.levels);
      this.saveGroups(data.groups);
      this.saveHistory(data.history || {});
    } else if (mode === 'merge') {
      // Merge: renumber IDs if conflicts exist
      const existingLevels = this.getAllLevels();
      const existingIds = new Set(existingLevels.map(l => l.meta.id));

      // Find highest ID number
      const maxId = Math.max(0, ...existingLevels.map(l => {
        const match = l.meta.id.match(/^level-(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      }));

      let nextId = maxId + 1;
      const idMapping = {};  // oldId -> newId

      // Renumber conflicting imports
      const importedLevels = data.levels.map(level => {
        if (existingIds.has(level.meta.id)) {
          const newId = `level-${nextId++}`;
          idMapping[level.meta.id] = newId;
          level = JSON.parse(JSON.stringify(level));  // Clone
          level.meta.id = newId;
          level.meta.title = `Taso ${nextId - 1}`;
        } else {
          idMapping[level.meta.id] = level.meta.id;  // No change
        }
        return level;
      });

      // Save merged levels
      this.saveLevels([...existingLevels, ...importedLevels]);

      // Merge groups (apply ID mapping)
      const existingGroups = this.loadGroups();
      const importedGroups = data.groups;

      for (const groupId in importedGroups) {
        const mappedIds = importedGroups[groupId].map(oldId => idMapping[oldId]);
        existingGroups[groupId].push(...mappedIds);
      }

      this.saveGroups(existingGroups);

      // Merge history (apply ID mapping)
      const existingHistory = this.loadHistory();
      const importedHistory = data.history || {};

      for (const oldId in importedHistory) {
        const newId = idMapping[oldId];
        if (!existingHistory[newId]) {
          existingHistory[newId] = [];
        }
        existingHistory[newId].push(...importedHistory[oldId]);
      }

      this.saveHistory(existingHistory);
    }
  }
};

// Initialize on load
LevelRegistry.init();

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.LevelRegistry = LevelRegistry;
}
