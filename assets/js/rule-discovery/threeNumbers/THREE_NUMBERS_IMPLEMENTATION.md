# Three Numbers Game - Distribution Implementation

## Date: 2025-10-18

## Summary

Implemented comprehensive distribution system for the Three Numbers Game with all 25 rules. Each rule now has pedagogically designed positive and negative example generators with built-in validation.

## What Was Implemented

### 1. Distribution Generators (`three-numbers-distributions.js`)

Created 10 distribution generator functions:

1. **uniformRandom(maxElement)** - Random triples
2. **uniformRandomSum(maxSum)** - Random triples with bounded sum
3. **randomSequence(options)** - Configurable sequences (strictly/non-strictly, increasing/decreasing, arithmetic/random diffs)
4. **constantSequence(maxElement)** - All three equal
5. **linearMultiples(maxElement)** - Form [a, 2a, 3a] (shuffled)
6. **exponentialMultiples(maxElement)** - Form [a, 2a, 4a] (shuffled)
7. **extremumAtPosition(options)** - Largest/smallest at specific position
8. **equalAtPositions(options)** - Two positions equal
9. **largestIsSum(options)** - Largest = smallest + middle
10. **withEvenCount(options)** - Exactly K even integers

All generators ensure positive integers only (≥1).

### 2. Rule Distributions (`three-numbers-rules.js`)

Added distribution specifications for all 25 rules:

**Pattern used:** 20% random + 80% conceptual near-misses

**Near-miss design principles:**
- **Boundary violations**: For sum/range rules, generate values near boundaries
- **Relaxed constraints**: For strict rules, use non-strict versions (e.g., strictly increasing → non-strict)
- **Alternative patterns**: For specific patterns, use similar but different patterns
- **Parity/divisibility**: For even/GCD rules, use odd numbers or consecutive numbers
- **Position swaps**: For position-based rules, use different positions

**Examples of near-miss distributions:**

**Rule 1 (Strictly increasing):**
- Positive: `randomSequence({ strictly: true, direction: 'increasing' })`
- Negative (near-misses):
  - 40% non-strict increasing (allows equal consecutive values)
  - 20% strictly decreasing
  - 20% constant sequence

**Rule 4 (Arithmetic and increasing):**
- Positive: `randomSequence({ strictly: true, direction: 'increasing', arithmetic: 2 })`
- Negative (near-misses):
  - 40% increasing but not arithmetic (random diffs)
  - 20% [a, 2a, 3a] (not equal differences)
  - 20% constant (equal diffs but not increasing)

**Rule 15 (All even):**
- Positive: `withEvenCount({ numEven: 3 })`
- Negative (near-misses):
  - 40% exactly 2 even (near-miss)
  - 40% all odd

**Rule 25 (GCD > 1):**
- Positive:
  - 50% all even (GCD ≥ 2)
  - 50% [a, 2a, 3a] (GCD = a)
- Negative (near-misses):
  - 40% all odd (often coprime)
  - 40% consecutive integers (GCD = 1)

### 3. Game Logic Updates (`three-numbers-game.js`)

**Added imports:**
```javascript
import { ThreeNumberDistributions, sampleFromDistribution } from './three-numbers-distributions.js?v7';
```

**New methods:**

1. **generateTripleForRule(shouldSatisfy)**
   - Uses distribution specs from rule definitions
   - Handles different generator signatures appropriately
   - Falls back to random generation if no distribution specified

2. **generateTripleFallback(shouldSatisfy)**
   - Fallback random generation with retry logic
   - Ensures generated triples match desired satisfaction status

**Updated method:**

1. **generateUnitTests()**
   - Now uses `generateTripleForRule()` instead of pure random
   - **CRITICAL: Validates all generated examples**
     - Positive examples MUST satisfy the rule
     - Negative examples MUST NOT satisfy the rule
     - Logs warnings if validation fails
   - Generates 5 positive + 5 negative unit tests
   - Shuffles them together for presentation

## Validation System

**Key safety feature:** All generated examples are validated against the rule:

```javascript
// For positive examples
if (!rule.check(a, b, c)) {
    console.warn(`Generated positive example that doesn't satisfy rule: [${a}, ${b}, ${c}]`);
    continue; // Reject and retry
}

// For negative examples
if (rule.check(a, b, c)) {
    console.warn(`Generated negative example that satisfies rule: [${a}, ${b}, ${c}]`);
    continue; // Reject and retry
}
```

This ensures that distribution bugs don't result in incorrect examples being shown to students.

## Fixed Issues

### Issue 1: Contradictory Distribution Specs

**Problem:** Some distributions had contradictory parameters:
- `{ strictly: false, direction: 'increasing', arithmetic: 2 }`
- This is contradictory because `arithmetic: 2` forces increments of 2, making it strictly increasing

**Fixed:** Rule 4 now correctly specifies:
- Positive: `arithmetic: 2` (actually generates arithmetic sequences)
- Negative: `arithmetic: null` for random differences (not arithmetic)

### Issue 2: Missing Positive Generator Specs

**Problem:** Rule 4 had `arithmetic: null` for positive examples
**Fixed:** Now uses `arithmetic: 2` to generate actual arithmetic sequences

## All 25 Rules Coverage

✅ Rule 1: Strictly increasing
✅ Rule 2: All equal
✅ Rule 3: Strictly decreasing
✅ Rule 4: Arithmetic and increasing
✅ Rule 5: Doubling (b=2a, c=4a)
✅ Rule 6: Largest at end
✅ Rule 7: Largest in middle
✅ Rule 8: Exactly two equal
✅ Rule 9: First and last equal
✅ Rule 10: All different
✅ Rule 11: Sum < 15
✅ Rule 12: Sum > 20
✅ Rule 13: Consecutive (diff=1)
✅ Rule 14: Range ≤ 5
✅ Rule 15: All even
✅ Rule 16: At least one even
✅ Rule 17: All < 10
✅ Rule 18: a + b = c
✅ Rule 19: Three consecutive (any order)
✅ Rule 20: Median = 5
✅ Rule 21: Triangle inequality
✅ Rule 22: Each is multiple of previous
✅ Rule 23: Largest > 2 × second-largest
✅ Rule 24: All in [5, 15]
✅ Rule 25: GCD > 1

## Testing Status

- ✅ Code implementation complete
- ✅ Distribution specs designed for all 25 rules
- ✅ Validation system implemented
- ⏳ Browser testing pending

## Next Steps

1. Test in browser at `http://localhost:4000/saannon-keksiminen.html`
2. Select "Three Numbers" game
3. Play through several rules to verify:
   - Unit tests generate appropriate examples
   - Positive examples all satisfy rules
   - Negative examples all violate rules
   - Near-miss examples are pedagogically useful
4. Check browser console for any validation warnings

## Files Modified

1. `/website_project/assets/js/rule-discovery/threeNumbers/three-numbers-distributions.js` (CREATED, 340 lines)
2. `/website_project/assets/js/rule-discovery/threeNumbers/three-numbers-rules.js` (UPDATED with distributions)
3. `/website_project/assets/js/rule-discovery/threeNumbers/three-numbers-game.js` (UPDATED with validation)
4. `/website_project/assets/js/rule-discovery/threeNumbers/THREE_NUMBERS_DISTRIBUTIONS.md` (CREATED, documentation)
5. `/website_project/assets/js/rule-discovery/threeNumbers/THREE_NUMBERS_IMPLEMENTATION.md` (THIS FILE)

## Design Philosophy

**Pedagogical value:** Near-misses help students refine their understanding by testing boundary cases and conceptually similar alternatives.

**Validation-first:** Always validate generated examples match expected satisfaction status to prevent teaching errors.

**Flexibility:** System gracefully falls back to random generation if distributions aren't specified or generators fail.
