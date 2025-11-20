/**
 * Hypothesis Playback System V2 - Runtime execution of hypothesis scripts
 *
 * PURPOSE: This file is used by play.html for executing hypothesis scripts during gameplay/playback.
 * It provides the DSL (Domain-Specific Language) for defining permutation-based hypothesis spaces
 * at runtime and generates all possible hypotheses for Bayesian inference.
 *
 * USAGE: play.html only (NOT used by editor.html - see editor/hypothesis-editor-v2.js for that)
 *
 * VERSION 2: Now uses hypothesis-dsl-core.js for shared List implementation
 *
 * KEY FEATURES:
 * - List.select() returns selector objects with _sackId property
 * - Supports schedule() function for sampling schedule
 * - Exports executeHypothesisScript() function
 * - Generates full hypothesis space with componentAssignments
 * - Random list IDs (list_xxxxx)
 *
 * KEY DIFFERENCES FROM hypothesis-editor-v2.js:
 * - Selector objects instead of direct distributions
 * - Full hypothesis space generation
 * - Random list IDs instead of sequential
 * - Post-execution export processing
 *
 * Example usage:
 *   const list = new List();
 *   list.define([
 *     {red: 70, blue: 30},
 *     {red: 30, blue: 70}
 *   ]);
 *   list.permute();
 *   export const sackA = list.select(0).forBetting();
 *   export const sackB = list.select(1);
 *   schedule([[sackA, 0], [sackB, 1]]);
 */

// VERSION MARKER

/**
 * Execute a hypothesis script and generate all hypotheses
 *
 * @param {string} scriptCode - The script code to execute
 * @returns {Object} - {lists: Map, hypotheses: Array, sackTemplates: Object, animationInstructions: Array, ballCount: number, samplingSchedule: Array, bettingSack: string}
 */
function executeHypothesisScript(scriptCode) {
  // Check that core is loaded
  if (typeof window === 'undefined' || !window.HypothesisDSLCore) {
    throw new Error('hypothesis-dsl-core.js must be loaded before hypothesis-playback-v2.js');
  }

  const {
    createListClass,
    createRandomListIdGenerator,
    updateSelectInstructionTemplateId
  } = window.HypothesisDSLCore;

  // Transform ES6 export syntax to CommonJS-style exports
  // Convert: export const sackA = ... → const sackA = exports.sackA = ...
  // This creates both a local variable and an export property
  const transformedCode = scriptCode.replace(/export\s+const\s+(\w+)\s*=/g, 'const $1 = exports.$1 =');

  // Track animation instructions during execution
  const animationInstructions = [];

  // Track sampling schedule (store raw schedule during execution)
  let rawSchedule = null;

  // Create helper function for sampling schedule
  // Store raw schedule with selector references - will resolve sack IDs later
  const schedule = function(scheduleArray) {
    rawSchedule = scheduleArray;
  };

  // Track betting buckets
  let bettingBuckets = null;

  // Create helper function for betting buckets
  const buckets = function(numBuckets) {
    if (typeof numBuckets !== 'number' || numBuckets < 2 || numBuckets > 10) {
      throw new Error('buckets() requires a number between 2 and 10');
    }
    bettingBuckets = numBuckets;
  };

  // Create List class with playback-specific configuration
  const List = createListClass({
    animationInstructions: animationInstructions,
    generateListId: createRandomListIdGenerator(),

    // Playback-specific: Wrap return value as selector object
    wrapSelectReturn: (distribution, list, index, instruction) => {
      // Create selector object (playback expects this format)
      const selector = {
        _type: 'selection',
        _listId: list.listId,
        _index: index,
        _list: list,
        _forBetting: false,
        _sackId: null,  // Will be set during export processing
        _distribution: distribution,  // Store reference to actual distribution
        _selectInstruction: instruction  // Store reference to instruction for later update
      };

      // Add forBetting() method to selector
      selector.forBetting = function() {
        this._forBetting = true;
        return this;
      };

      return selector;
    }
  });

  // Create execution context
  const contextCode = `
    const List = List_constructor;
    const schedule = _schedule;
    const buckets = _buckets;
    ${transformedCode}
    return exports;
  `;

  // Execute script
  const exports = {};

  // DEBUG: Check buckets is defined

  const scriptFunction = new Function('List_constructor', '_schedule', '_buckets', 'exports', contextCode);
  const result = scriptFunction(List, schedule, buckets, exports);

  // Extract lists and selections
  const lists = new Map();
  const selections = new Map(); // sackId -> {listId, index}
  let bettingSack = null; // Track which sack is marked for betting

  // Process exports to extract selections and update animation instructions
  Object.entries(result).forEach(([exportName, value]) => {
    if (value && value._type === 'selection') {
      const list = value._list;

      // Add sackId to selector for schedule() function
      value._sackId = exportName;

      // Register list
      if (!lists.has(list.listId)) {
        lists.set(list.listId, {
          id: list.listId,
          templates: list.templates,
          isPermuted: list.isPermuted
        });
      }

      // Register selection
      selections.set(exportName, {
        listId: list.listId,
        index: value._index
      });

      // Track betting designation
      if (value._forBetting) {
        if (bettingSack !== null) {
          throw new Error(`Multiple sacks marked for betting: ${bettingSack} and ${exportName}. Only one sack can be marked with .forBetting()`);
        }
        bettingSack = exportName;
      }

      // Update the select animation instruction that was added by core during select()
      // The instruction was added immediately when select() was called (THE FIX!),
      // we just need to fill in the templateId now that we know the export name
      if (value._selectInstruction) {
        value._selectInstruction.templateId = exportName;
        delete value._selectInstruction.__placeholderForExport;
      } else {
        console.error(`[Playback-v2] ERROR: No _selectInstruction found on selector for ${exportName}!`);
      }
    }
  });

  // Generate all hypotheses
  const hypotheses = generatePermutationHypotheses(lists, selections);

  // Create sackTemplates for compatibility
  const sackTemplates = {};
  selections.forEach((selection, sackId) => {
    const list = lists.get(selection.listId);
    sackTemplates[sackId] = {
      process: {
        listId: selection.listId,
        selectedIndex: selection.index
      },
      // No distribution - represents uncertainty over hypothesis space
      distribution: null
    };
  });

  // Resolve sampling schedule now that we have sack IDs
  let samplingSchedule = null;
  if (rawSchedule) {
    samplingSchedule = rawSchedule.map(entry => {
      const [sackRef, time] = entry;

      // Get sack ID from selector reference
      let sackId;
      if (typeof sackRef === 'string') {
        sackId = sackRef;
      } else if (sackRef && sackRef._sackId) {
        sackId = sackRef._sackId;
      } else {
        throw new Error('Invalid sack reference in schedule. Must be a sack selector or string ID.');
      }

      return {sackId, time};
    });
  }

  // Derive ball count from schedule (or default to 10 if no schedule)
  const ballCount = samplingSchedule ? samplingSchedule.length : 10;

  // Validate required parameters
  if (bettingBuckets === null) {
    throw new Error('buckets() must be specified in the hypothesis script (e.g., buckets(2))');
  }

  return {
    lists: lists,
    hypotheses: hypotheses,
    sackTemplates: sackTemplates,
    selections: selections,
    animationInstructions: animationInstructions,
    bettingSack: bettingSack,  // Export name of sack marked for betting (or null)
    ballCount: ballCount,  // Number of balls to sample (derived from schedule or default)
    samplingSchedule: samplingSchedule,  // Schedule array or null
    bettingBuckets: bettingBuckets  // Number of betting buckets (required)
  };
}

/**
 * Generate all permutation hypotheses from lists and selections
 */
function generatePermutationHypotheses(lists, selections) {
  const hypotheses = [];
  let nextId = 0;

  // Count how many selections are made from each list
  const selectionsPerList = new Map();
  selections.forEach((selection, sackId) => {
    const count = selectionsPerList.get(selection.listId) || 0;
    selectionsPerList.set(selection.listId, count + 1);
  });


  // For each list that needs permutation, generate k-permutations
  const listPermutations = new Map();

  lists.forEach((list, listId) => {
    if (list.isPermuted) {
      // Only generate k-permutations where k = number of selections from this list
      // This reduces n! to n!/(n-k)!
      const k = selectionsPerList.get(listId) || list.templates.length;
      const perms = generateKPermutations(list.templates, k);
      listPermutations.set(listId, perms);
    } else {
      // Single ordering (identity)
      listPermutations.set(listId, [list.templates]);
    }
  });

  // Generate Cartesian product of all list permutations
  const listIds = Array.from(lists.keys());

  function generateHypothesesRecursive(listIndex, currentPermutations) {
    if (listIndex === listIds.length) {
      // Complete hypothesis - assign sacks based on selections
      const componentAssignments = {};

      selections.forEach((selection, sackId) => {
        const listId = selection.listId;
        const index = selection.index;
        const permutation = currentPermutations.get(listId);
        componentAssignments[sackId] = permutation[index];
      });

      hypotheses.push({
        id: `h${nextId++}`,
        componentAssignments: componentAssignments,
        probability: 1.0 // Uniform prior (will be normalized)
      });
      return;
    }

    const listId = listIds[listIndex];
    const permutations = listPermutations.get(listId);

    // Try each permutation for this list
    permutations.forEach(perm => {
      const newPermutations = new Map(currentPermutations);
      newPermutations.set(listId, perm);
      generateHypothesesRecursive(listIndex + 1, newPermutations);
    });
  }

  generateHypothesesRecursive(0, new Map());


  // Normalize probabilities
  const totalProb = hypotheses.length;
  hypotheses.forEach(h => {
    h.probability = 1.0 / totalProb;
  });

  return hypotheses;
}

/**
 * Generate all permutations of an array
 */
function generatePermutations(array) {
  if (array.length === 0) return [[]];
  if (array.length === 1) return [[array[0]]];

  const permutations = [];

  for (let i = 0; i < array.length; i++) {
    const current = array[i];
    const remaining = [...array.slice(0, i), ...array.slice(i + 1)];
    const remainingPerms = generatePermutations(remaining);

    remainingPerms.forEach(perm => {
      permutations.push([current, ...perm]);
    });
  }

  return permutations;
}

/**
 * Generate k-permutations of an array (ordered selections of k items)
 * Returns n!/(n-k)! permutations instead of n!
 *
 * Example: generateKPermutations([A, B, C], 2) returns:
 * [[A, B], [A, C], [B, A], [B, C], [C, A], [C, B]]
 * That's 3!/(3-2)! = 6 permutations instead of 3! = 6 full permutations
 */
function generateKPermutations(array, k) {
  if (k === 0) return [[]];
  if (k > array.length) return [];
  if (k === array.length) return generatePermutations(array);

  const result = [];

  // For each element, put it first and recursively generate (k-1)-permutations from remaining
  for (let i = 0; i < array.length; i++) {
    const current = array[i];
    const remaining = [...array.slice(0, i), ...array.slice(i + 1)];
    const subPerms = generateKPermutations(remaining, k - 1);

    subPerms.forEach(subPerm => {
      result.push([current, ...subPerm]);
    });
  }

  return result;
}

/**
 * Calculate factorial (for logging purposes)
 */
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
