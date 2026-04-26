/**
 * Hypothesis Editor System V2 - Level editor script execution
 *
 * PURPOSE: This file is used by editor.html for executing hypothesis scripts in the level editor.
 * It provides the HypothesisEngine class that parses and validates hypothesis scripts during
 * level creation, generating templates for sack components.
 *
 * USAGE: editor.html only (NOT used by play.html - see bayesian/hypothesis-playback-v2.js for that)
 *
 * VERSION 2: Now uses hypothesis-dsl-core.js for shared List implementation
 *
 * KEY FEATURES:
 * - List.select() returns distribution objects directly (e.g., {red: 70, blue: 30})
 * - Distribution objects get __sackId property added for schedule resolution
 * - Supports schedule() function for sampling schedule specification
 * - Exports HypothesisEngine class with execute() method
 * - Returns templates, lists, animation instructions, sampling schedule, and ball count
 *
 * KEY DIFFERENCES FROM hypothesis-playback-v2.js:
 * - No hypothesis generation (editor doesn't need full hypothesis space)
 * - Direct distribution objects instead of selector objects
 * - Template-oriented output for level editor UI
 * - Sequential list IDs (list0, list1, ...)
 *
 * Uses List API: define() → permute() → select()
 */

// VERSION MARKER

class HypothesisEngine {
  constructor() {
    this.templates = {}; // templateId -> template data
    this.lists = {};     // listId -> list info
    this.listCounter = 0;
    this.animationInstructions = []; // Animation sequence for playback
    this.samplingSchedule = null; // Sampling schedule: [{armId, time}, ...]
    this.sacks = {}; // varName -> {id, distribution, varName}
    this.arms = {}; // varName -> {id, varName}
    this.nextComponentId = 1; // Auto-incrementing ID counter
  }

  /**
   * Execute hypothesis script
   * Returns: {templates, lists, animationInstructions, samplingSchedule, ballCount, errors}
   */
  execute(scriptText) {
    this.templates = {};
    this.lists = {};
    this.listCounter = 0;
    this.animationInstructions = [];
    this.samplingSchedule = null;
    this.sacks = {};
    this.arms = {};
    this.nextComponentId = 1;
    const errors = [];

    try {
      // Create execution context with List constructor and export tracking
      const context = this.createContext();

      // Wrap script in function to capture exports
      const wrappedScript = this.wrapScript(scriptText);

      // DEBUG: Log context keys
      console.log('[HypothesisEngine-v2] Context keys:', Object.keys(context));
      console.log('[HypothesisEngine-v2] Has arm function:', 'arm' in context);

      // Execute
      const func = new Function(...Object.keys(context), wrappedScript);
      func(...Object.values(context));

      // Resolve sampling schedule (now in object format: {arm1: [times], arm2: [times]})
      if (this.samplingSchedule) {
        const flatSchedule = [];

        // Convert object format to flat array
        for (const [armRef, times] of Object.entries(this.samplingSchedule)) {
          // armRef should be the variable name, but we need to look up the actual arm object
          // The schedule function receives arm objects as keys (which become string keys in the object)
          // We need to find which arm this corresponds to

          // Actually, we need a different approach - the arm objects themselves should track their variable name
          // For now, let's check if armRef is a key in this.arms
          if (!this.arms[armRef]) {
            throw new Error(`Unknown arm "${armRef}" in schedule. Make sure to define it with arm() first.`);
          }

          const armId = this.arms[armRef].id;

          // Add each time as a separate schedule entry
          for (const time of times) {
            flatSchedule.push({armId: armId, time: time, armVarName: armRef});
          }
        }

        // Sort by time
        flatSchedule.sort((a, b) => a.time - b.time);
        this.samplingSchedule = flatSchedule;
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
      sacks: this.sacks,
      arms: this.arms,
      ballCount: ballCount,
      errors
    };
  }

  /**
   * Create execution context with List constructor
   * Uses hypothesis-dsl-core.js for shared List implementation
   */
  createContext() {
    const self = this;

    // Check that core is loaded
    if (typeof window === 'undefined' || !window.HypothesisDSLCore) {
      throw new Error('hypothesis-dsl-core.js must be loaded before hypothesis-editor-v2.js');
    }

    const {
      createListClass,
      createSequentialListIdGenerator,
      updateSelectInstructionTemplateId
    } = window.HypothesisDSLCore;

    // Create List class with editor-specific configuration
    const List = createListClass({
      animationInstructions: this.animationInstructions,
      generateListId: createSequentialListIdGenerator(),

      // Editor-specific: Register list when created
      onDefine: (list, distributions) => {
        // Register in engine if not already registered
        if (!self.lists[list.listId]) {
          self.lists[list.listId] = {
            id: list.listId,
            distributions: [],
            selections: [],
            isPermuted: false
          };
        }
        // Update distributions
        self.lists[list.listId].distributions = list.distributions;
      },

      // Editor-specific: Update isPermuted flag
      onPermute: (list) => {
        if (self.lists[list.listId]) {
          self.lists[list.listId].isPermuted = true;
        }
      },

      // Editor-specific: Return distribution directly (not wrapped)
      wrapSelectReturn: (distribution, list, index, instruction) => {
        return distribution;  // Return distribution object directly
      }
    });

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

        // Track selection in the list
        self.lists[list.listId].selections.push({
          templateId: name,
          index: index
        });

        // Update the select animation instruction that was added by select()
        // The instruction was added immediately when select() was called, we just fill in the templateId
        const updated = updateSelectInstructionTemplateId(value, name);
        if (!updated) {
          console.error(`[HypothesisEngine-v2] ERROR: Failed to update select instruction for ${name}`);
        }
      },

      // sack function for defining sacks with distributions
      sack: function(distribution) {
        // distribution is an array of color objects like [{color: 'red'}, {color: 'blue'}]
        // We'll assign an ID automatically
        const id = `sack${self.nextComponentId++}`;

        // Return a sack object that tracks its info
        const sackObj = {
          __type: 'sack',
          __id: id,
          __distribution: distribution,
          __varName: null  // Will be set by wrapper
        };

        return sackObj;
      },

      // arm function for defining arms
      arm: function() {
        // Auto-generate ID
        const id = `arm${self.nextComponentId++}`;

        // Return an arm object
        const armObj = {
          __type: 'arm',
          __id: id,
          __varName: null  // Will be set by wrapper
        };

        return armObj;
      },

      // __captureSack: internal function to capture sack variable assignment
      __captureSack: function(varName, sackObj) {
        if (!sackObj || sackObj.__type !== 'sack') {
          throw new Error(`Variable ${varName} must be assigned a sack() call`);
        }

        sackObj.__varName = varName;
        self.sacks[varName] = {
          id: sackObj.__id,
          distribution: sackObj.__distribution,
          varName: varName
        };

        return sackObj;
      },

      // __captureArm: internal function to capture arm variable assignment
      __captureArm: function(varName, armObj) {
        if (!armObj || armObj.__type !== 'arm') {
          throw new Error(`Variable ${varName} must be assigned an arm() call`);
        }

        armObj.__varName = varName;
        self.arms[varName] = {
          id: armObj.__id,
          varName: varName
        };

        return armObj;
      },

      // schedule function for sampling schedule (now expects object format)
      schedule: function(scheduleObj) {
        // scheduleObj format: {arm1: [0, 1, 2], arm2: [1, 2, 3]}
        // But arm1, arm2 are arm objects - we need to convert them to variable names

        // Convert arm objects to variable names as keys
        const normalizedSchedule = {};
        for (const [key, times] of Object.entries(scheduleObj)) {
          // key is a stringified arm object or variable name
          // We need to find which arm this is
          // Actually, the user will pass arm objects directly, which get stringified

          // Better approach: iterate through the passed object and extract variable names
          // from the arm objects themselves
          if (typeof key === 'object' && key.__varName) {
            normalizedSchedule[key.__varName] = times;
          } else {
            // Assume key is already the variable name
            normalizedSchedule[key] = times;
          }
        }

        self.samplingSchedule = normalizedSchedule;
      }
    };
  }

  /**
   * Wrap script to handle export statements and sack/arm assignments
   */
  wrapScript(scriptText) {
    let wrapped = scriptText;

    console.log('[HypothesisEngine-v2] Original script:', scriptText);

    // Replace "const varName = sack(...)" with captured version
    wrapped = wrapped.replace(
      /const\s+(\w+)\s*=\s*sack\(([\s\S]*?)\);/g,
      "const $1 = __captureSack('$1', sack($2));"
    );

    // Replace "const varName = arm()" with captured version
    wrapped = wrapped.replace(
      /const\s+(\w+)\s*=\s*arm\(\);/g,
      "const $1 = __captureArm('$1', arm());"
    );

    console.log('[HypothesisEngine-v2] Wrapped script (before export transform):', wrapped);

    // Replace "export const name = list.select(index).forBetting()"
    // with "const name = list.select(index); __export('name', name, list, index, true)"
    // This creates both a local variable and calls __export
    wrapped = wrapped.replace(
      /export\s+const\s+(\w+)\s*=\s*(\w+)\.select\((\d+)\)\.forBetting\(\)/g,
      "const $1 = $2.select($3); __export('$1', $1, $2, $3, true)"
    );

    wrapped = wrapped.replace(
      /export\s+const\s+(\w+)\s*=\s*(\w+)\.select\((\d+)\)/g,
      "const $1 = $2.select($3); __export('$1', $1, $2, $3, false)"
    );

    console.log('[HypothesisEngine-v2] Final wrapped script:', wrapped);

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
   *
   * NOTE: This method is not used by the editor but is kept for compatibility
   * and potential future use.
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
