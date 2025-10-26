# Shapes Game Distribution Improvement Plan

## Problem Analysis

**Current Issue:** Negative examples are too closely tailored to each rule, creating side-channel information leakage.

### Examples of Side-Channel Leakage:

1. **Rule: "All same color"**
   - Negatives: 60% have exactly 2 colors, 20% have 3 colors, 20% random
   - **Leak:** If you see lots of 2-color examples in negatives, you can guess the rule is about same color

2. **Rule: "Contains green"**
   - Negatives: 100% have 0 greens
   - **Leak:** If you NEVER see green in negatives, the rule is obviously about green

3. **Rule: "At least two circles"**
   - Negatives: 40% exactly 1 circle, 35% zero circles
   - **Leak:** If negatives consistently have 0-1 circles, rule is about circles

4. **Rule: "Exactly two colors"**
   - Negatives: 25% one color, 30% three colors, 30% four colors
   - **Leak:** Negatives avoid exactly 2 colors, revealing the rule

## Solution: Broad Baseline Distribution

### Key Principle
**Negatives should come from a rich, diverse baseline that doesn't change per rule.**

The baseline should contain:
- High diversity across all attributes
- Natural variation that's rule-agnostic
- No obvious gaps that reveal what's being tested

### Proposed Baseline Mixture (30+ generators)

**Color Diversity (7 patterns):**
- uniformRandom (15%)
- allSameColor (8%)
- exactlyKColors k=2 (10%)
- exactlyKColors k=3 (10%)
- allDifferentColors (8%)
- symmetricColors (palindrome) (5%)
- firstAndLastSameColor (5%)

**Shape Diversity (7 patterns):**
- uniformRandom (already counted above)
- allSameType (8%)
- exactlyKTypes k=2 (10%)
- exactlyKTypes k=3 (10%)
- allDifferentTypes (8%)
- symmetricTypes (palindrome) (5%)
- firstAndLastSameType (5%)

**Combined Patterns (4 patterns):**
- allDifferentColorsAndTypes (5%)
- allDifferentColorsAndSameShape (4%)
- allDifferentShapesAndSameColor (4%)
- noAdjacentSameColor (3%)
- noAdjacentSameType (3%)

**Specific Attributes (weighted by population):**
- Contains green (proportional to 1/6 in random)
- Contains triangle (proportional to 1/6 in random)
- Contains red circle at position 0 (proportional to 1/24 in random)
- 1 circle, 2 circles, 3 circles (various counts)

**Total:** ~100% weight distributed across 30+ generator types

### Implementation Strategy

**Phase 1: Create BASELINE_DISTRIBUTION**
```javascript
export const BASELINE_DISTRIBUTION = [
    { type: 'uniformRandom', weight: 0.15 },
    { type: 'allSameColor', weight: 0.08 },
    { type: 'allSameType', weight: 0.08 },
    { type: 'exactlyKColors', weight: 0.10, options: { k: 2 } },
    { type: 'exactlyKColors', weight: 0.10, options: { k: 3 } },
    { type: 'exactlyKTypes', weight: 0.10, options: { k: 2 } },
    { type: 'exactlyKTypes', weight: 0.10, options: { k: 3 } },
    { type: 'allDifferentColors', weight: 0.08 },
    { type: 'allDifferentTypes', weight: 0.08 },
    { type: 'allDifferentColorsAndTypes', weight: 0.05 },
    { type: 'symmetricColors', weight: 0.05 },
    { type: 'symmetricTypes', weight: 0.05 },
    { type: 'firstAndLastSame', weight: 0.03, options: { attribute: 'color' } },
    { type: 'firstAndLastSame', weight: 0.03, options: { attribute: 'shape' } },
    { type: 'allDifferentColorsAndSameShape', weight: 0.04 },
    { type: 'allDifferentShapesAndSameColor', weight: 0.04 },
    { type: 'noAdjacentSameColor', weight: 0.03 },
    { type: 'noAdjacentSameType', weight: 0.03 },
    // Specific counts for various shapes
    { type: 'withGreenCount', weight: 0.02, options: { numGreen: 0 } },
    { type: 'withGreenCount', weight: 0.02, options: { numGreen: 1 } },
    { type: 'withGreenCount', weight: 0.015, options: { numGreen: 2 } },
    { type: 'withGreenCount', weight: 0.01, options: { numGreen: 3 } },
    { type: 'withTriangleCount', weight: 0.02, options: { numTriangles: 0 } },
    { type: 'withTriangleCount', weight: 0.02, options: { numTriangles: 1 } },
    { type: 'withTriangleCount', weight: 0.015, options: { numTriangles: 2 } },
    { type: 'withCircleCount', weight: 0.02, options: { numCircles: 0 } },
    { type: 'withCircleCount', weight: 0.02, options: { numCircles: 1 } },
    { type: 'withCircleCount', weight: 0.015, options: { numCircles: 2 } },
    { type: 'withCircleCount', weight: 0.01, options: { numCircles: 3 } }
];
```

**Phase 2: Per-Rule Adjustments (Optional)**

For each rule, we can ADD a small weight to near-misses without REMOVING the baseline:

```javascript
distribution: {
    positive: [...],
    negative: [
        ...BASELINE_DISTRIBUTION,  // 70% baseline
        { type: 'nearMiss1', weight: 0.15 },  // 15% near-miss
        { type: 'nearMiss2', weight: 0.15 }   // 15% near-miss
    ]
}
```

The key is that baseline patterns still appear frequently, masking which near-miss is relevant.

**Phase 3: Validation Filter**

Instead of generating distributions that AVOID satisfying the rule, we:
1. Sample from baseline
2. Check if it satisfies the rule
3. If it does (for negative) → reject and resample
4. Use fallback generateNegative() after N attempts

This way the baseline can include ANYTHING, and we just filter out false negatives.

## Benefits

1. **No side-channel:** Baseline is same for all rules
2. **Rich diversity:** 30+ patterns ensure variety
3. **Natural distribution:** Reflects broad space of possibilities
4. **Harder to guess:** Can't use "what's missing" heuristic
5. **Easier to maintain:** Change baseline once, affects all rules

## Risks & Mitigations

**Risk 1: Collision rate too high**
- Some rules might satisfy 50% of baseline (e.g., "contains any color")
- **Mitigation:** Use retry + fallback. After 100 attempts, use generateNegative()

**Risk 2: Baseline too uniform**
- If everything is uniform random, no pedagogical value
- **Mitigation:** Include structured patterns (palindromes, exactly K, etc.)

**Risk 3: Too slow**
- Rejecting many samples could be slow
- **Mitigation:** Profile and optimize. 100 attempts at <1ms each = acceptable

## Testing Plan

1. Generate 1000 negatives for each rule
2. Measure collision rate (how many satisfy the rule)
3. Visualize distribution of patterns in negatives
4. Confirm no obvious gaps or biases
5. Playtest: Can humans exploit side-channels?

## Implementation Steps

1. Create BASELINE_DISTRIBUTION in shapes-distributions.js
2. Update shapes-rules.js to use BASELINE_DISTRIBUTION for all rules
3. Add optional per-rule near-miss boosters (15-30% extra weight)
4. Test collision rates
5. Adjust weights if needed
6. Remove or minimize uniformRandom if collision rates too high for some rules
7. Document final distribution in comments

## Expected Outcome

Players face a rich, diverse set of negative examples that:
- Don't telegraph the rule
- Require genuine hypothesis testing
- Include interesting near-misses organically
- Feel natural and unpredictable

This makes the game significantly harder and more intellectually engaging.
