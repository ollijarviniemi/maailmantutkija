/**
 * Hypothesis Editor System - Level editor script execution
 *
 * PURPOSE: This file is used by editor.html for executing hypothesis scripts in the level editor.
 * It provides the HypothesisEngine class that parses and validates hypothesis scripts during
 * level creation, generating templates for sack components.
 *
 * USAGE: editor.html only (NOT used by play.html - see bayesian/hypothesis-playback.js for that)
 *
 * KEY FEATURES:
 * - List.select() returns distribution objects directly (e.g., {red: 70, blue: 30})
 * - Distribution objects get __sackId property added for schedule resolution
 * - Supports schedule() function for sampling schedule specification
 * - Exports HypothesisEngine class with execute() method
 * - Returns templates, lists, animation instructions, sampling schedule, and ball count
 *
 * KEY DIFFERENCES FROM hypothesis-playback.js:
 * - No hypothesis generation (editor doesn't need full hypothesis space)
 * - Direct distribution objects instead of selector objects
 * - Template-oriented output for level editor UI
 *
 * Uses List API: define() → permute() → select()
 */

// VERSION MARKER - this will log immediately when file loads

class HypothesisEngine {
  constructor() {
    this.templates = {}; // templateId -> template data
    this.lists = {};     // listId -> list info
    this.listCounter = 0;
    this.animationInstructions = []; // Animation sequence for playback
    this.samplingSchedule = null; // Sampling schedule: [{sackId, time}, ...]
    this.sackReferences = {}; // Store sack references for schedule resolution
  }

  /**
   * Execute hypothesis script
   * Returns: {templates, lists, animationInstructions, errors}
   */
  execute(scriptText) {
    this.templates = {};
    this.lists = {};
    this.listCounter = 0;
    this.animationInstructions = [];
    this.samplingSchedule = null;
    this.sackReferences = {};
    const errors = [];

    try {
      // Create execution context with List constructor and export tracking
      const context = this.createContext();

      // Wrap script in function to capture exports
      const wrappedScript = this.wrapScript(scriptText);

      // Execute
      const func = new Function(...Object.keys(context), wrappedScript);
      func(...Object.values(context));

      // Resolve sampling schedule now that sack references are populated
      if (this.samplingSchedule) {
        this.samplingSchedule = this.samplingSchedule.map(entry => {
          const [sackRef, time] = entry;

          // Get sack ID from the reference (can be string or object)
          let sackId;
          if (typeof sackRef === 'string') {
            sackId = sackRef;
          } else if (sackRef && sackRef.__sackId) {
            sackId = sackRef.__sackId;
          } else {
            throw new Error('Invalid sack reference in schedule. Must be a sack variable or string ID.');
          }

          if (!this.sackReferences[sackId]) {
            throw new Error(`Unknown sack reference "${sackId}" in schedule`);
          }
          return {sackId: sackId, time: time};
        });
      }

    } catch (error) {
      errors.push({
        message: error.message,
        line: this.extractLineNumber(error)
      });
    }

    // Derive ball count from schedule
    const ballCount = this.samplingSchedule ? this.samplingSchedule.length : 10;

    return {
      templates: this.templates,
      lists: this.lists,
      animationInstructions: this.animationInstructions,
      samplingSchedule: this.samplingSchedule,
      ballCount: ballCount,
      errors
    };
  }

  /**
   * Create execution context with List constructor
   */
  createContext() {
    const self = this;

    // List class for hypothesis scripts
    class List {
      constructor() {
        this.listId = `list${self.listCounter++}`;
        this.distributions = [];
        this.currentOrder = []; // Indices after permutation
        this.selections = []; // {templateId, index}
        this.isPermuted = false;

        // Register in engine
        self.lists[this.listId] = {
          id: this.listId,
          distributions: [],
          selections: [],
          isPermuted: false
        };
      }

      /**
       * Define sack distributions
       */
      define(distributions) {
        if (!Array.isArray(distributions)) {
          throw new Error('List.define() requires an array of distributions');
        }

        this.distributions = JSON.parse(JSON.stringify(distributions)); // Deep copy
        this.currentOrder = distributions.map((_, i) => i); // [0, 1, 2, ...]

        // Update engine state
        self.lists[this.listId].distributions = this.distributions;

        // Add animation instruction
        const defineInstruction = {
          phase: 'define',
          listId: this.listId,
          distributions: this.distributions
        };
        self.animationInstructions.push(defineInstruction);

        return this;
      }

      /**
       * Permute the list (Fisher-Yates shuffle)
       */
      permute() {
        if (this.distributions.length === 0) {
          throw new Error('List.permute() called before define()');
        }

        // Fisher-Yates shuffle of indices
        for (let i = this.currentOrder.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [this.currentOrder[i], this.currentOrder[j]] = [this.currentOrder[j], this.currentOrder[i]];
        }

        this.isPermuted = true;
        self.lists[this.listId].isPermuted = true;

        // Add animation instruction
        // Note: No finalOrder - the animation shuffle IS the randomization
        // The shuffle determines which sack gets which distribution
        const permuteInstruction = {
          phase: 'permute',
          listId: this.listId
        };
        self.animationInstructions.push(permuteInstruction);

        return this;
      }

      /**
       * Select distribution at index (after permutation)
       *
       * IMPORTANT: This adds the select animation instruction IMMEDIATELY when called,
       * not later during __export(). This ensures animation instructions appear in the
       * correct order (define → permute → select for each list).
       */
      select(index) {
        if (this.distributions.length === 0) {
          throw new Error('List.select() called before define()');
        }
        if (index < 0 || index >= this.distributions.length) {
          throw new Error(`List.select() index ${index} out of bounds [0, ${this.distributions.length - 1}]`);
        }

        // Get actual distribution (after permutation)
        const actualIndex = this.currentOrder[index];
        const distribution = this.distributions[actualIndex];

        // Track selection (will be used for exports)
        this.selections.push({index, actualIndex, distribution});

        // Add select animation instruction IMMEDIATELY (with placeholder templateId)
        const selectInstruction = {
          phase: 'select',
          listId: this.listId,
          templateId: null,  // Will be filled by __export()
          index: index,
          __placeholderForExport: true  // Mark for __export() to update
        };
        self.animationInstructions.push(selectInstruction);

        // Store reference to the instruction so __export() can update it
        distribution.__selectInstruction = selectInstruction;

        return distribution;
      }
    }

    return {
      // List constructor
      List: List,

      // export keyword handler (replaced via wrapping)
      __export: function(name, value, list, index, forBetting) {

        if (!(list instanceof List)) {
          throw new Error('export const must use List.select()');
        }

        self.templates[name] = {
          templateId: name,
          distribution: value,
          process: {
            type: 'permutation',
            listId: list.listId,
            selectedIndex: index
          },
          forBetting: forBetting || false
        };

        // Track sack reference for schedule resolution
        // Add sack ID as property on the distribution object so we can look it up later
        if (typeof value === 'object' && value !== null) {
          value.__sackId = name;
        }
        self.sackReferences[name] = name;

        // Track selection in the list
        self.lists[list.listId].selections.push({
          templateId: name,
          index: index
        });

        // Update the select animation instruction that was added by select()
        // The instruction was added immediately when select() was called, we just fill in the templateId
        if (value.__selectInstruction) {
          value.__selectInstruction.templateId = name;
          delete value.__selectInstruction.__placeholderForExport;
        } else {
          console.error(`[HypothesisEngine] ERROR: No __selectInstruction found on distribution!`);
        }
      },

      // schedule function for sampling schedule
      schedule: function(scheduleArray) {
        self.samplingSchedule = scheduleArray;
      }
    };
  }

  /**
   * Wrap script to handle export statements
   */
  wrapScript(scriptText) {
    // Replace "export const name = list.select(index).forBetting()"
    // with "const name = list.select(index); __export('name', name, list, index, true)"
    // This creates both a local variable and calls __export

    let wrapped = scriptText.replace(
      /export\s+const\s+(\w+)\s*=\s*(\w+)\.select\((\d+)\)\.forBetting\(\)/g,
      "const $1 = $2.select($3); __export('$1', $1, $2, $3, true)"
    );

    wrapped = wrapped.replace(
      /export\s+const\s+(\w+)\s*=\s*(\w+)\.select\((\d+)\)/g,
      "const $1 = $2.select($3); __export('$1', $1, $2, $3, false)"
    );

    return wrapped;
  }

  /**
   * Extract line number from error
   */
  extractLineNumber(error) {
    const match = error.stack?.match(/:(\d+):/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Generate hypothesis space from templates and lists
   * Returns all possible ordered selections (n!/(n-k)! hypotheses)
   */
  generateHypothesisSpace(templates, lists) {
    const processes = [];

    // Group templates by their source list
    Object.values(lists).forEach(list => {
      if (list.selections.length > 0) {
        processes.push({
          listId: list.listId,
          templates: list.templates,
          selections: list.selections
        });
      }
    });

    // Generate all hypotheses (cartesian product of all processes)
    const hypotheses = this.generateAllHypotheses(processes);

    return {
      processes,
      hypotheses
    };
  }

  /**
   * Generate all possible hypotheses from processes
   */
  generateAllHypotheses(processes) {
    if (processes.length === 0) return [];

    // For each process, generate all permutations
    const processPermutations = processes.map(process =>
      this.generateOrderedSelections(process.templates, process.selections)
    );

    // Cartesian product of all process permutations
    const allCombinations = this.cartesianProduct(processPermutations);

    // Convert to hypothesis format
    const hypotheses = allCombinations.map((combination, index) => {
      const assignments = {};

      combination.forEach(processAssignment => {
        Object.entries(processAssignment).forEach(([templateId, distribution]) => {
          assignments[templateId] = distribution;
        });
      });

      return {
        id: `h${index}`,
        assignments,
        probability: 1.0 / allCombinations.length // Uniform prior
      };
    });

    return hypotheses;
  }

  /**
   * Generate all ordered selections from n templates selecting k positions
   * Returns n!/(n-k)! possible assignments
   */
  generateOrderedSelections(templates, selections) {
    const n = templates.length;
    const k = selections.length;

    // Generate all permutations of indices
    const allPermutations = this.generatePermutations([...Array(n).keys()]);

    // For each permutation, extract the selected positions
    return allPermutations.map(perm => {
      const assignment = {};
      selections.forEach(sel => {
        const templateIndex = perm[sel.index];
        assignment[sel.templateId] = templates[templateIndex];
      });
      return assignment;
    });
  }

  /**
   * Generate all permutations of an array
   */
  generatePermutations(array) {
    if (array.length <= 1) return [array];

    const result = [];
    for (let i = 0; i < array.length; i++) {
      const rest = [...array.slice(0, i), ...array.slice(i + 1)];
      const perms = this.generatePermutations(rest);
      perms.forEach(perm => {
        result.push([array[i], ...perm]);
      });
    }
    return result;
  }

  /**
   * Cartesian product of arrays
   */
  cartesianProduct(arrays) {
    if (arrays.length === 0) return [[]];
    if (arrays.length === 1) return arrays[0].map(x => [x]);

    const [first, ...rest] = arrays;
    const restProduct = this.cartesianProduct(rest);

    const result = [];
    first.forEach(x => {
      restProduct.forEach(prod => {
        result.push([x, ...prod]);
      });
    });

    return result;
  }
}

// Export for use in editor
if (typeof window !== 'undefined') {
  window.HypothesisEngine = HypothesisEngine;
}
