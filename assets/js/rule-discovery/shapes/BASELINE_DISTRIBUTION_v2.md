# Shapes Game - Baseline Distribution v2

## Summary of Changes (2025-10-19)

**Goal:** Eliminate side-channel information leakage from negative example distributions.

### Problem (v1)

Each rule had custom-tailored negative distributions that avoided the rule, making it easier to guess the rule by noticing conspicuous gaps:

- **Rule "All same color"**: Negatives had 20% random, 40% exactly 3 colors, 40% exactly 2 colors
  - **Leak:** Negatives avoid 1 color and 4 colors, suggesting rule is about color uniformity

- **Rule "Contains green"**: Negatives had 100% zero greens
  - **Leak:** If you never see green in negatives, rule must be about green

- **Rule "At least two circles"**: Negatives had 40% one circle, 35% zero circles
  - **Leak:** Negatives always have 0-1 circles, revealing threshold is 2

- **Rule "Exactly two colors"**: Negatives carefully avoided exactly 2 colors
  - **Leak:** Distribution gap at k=2 is obvious giveaway

### Solution (v2)

**All rules now use the same BASELINE_DISTRIBUTION** for negatives.

The baseline is a rich mixture of ~35 pattern types:

| Category | Patterns | Weight |
|----------|----------|--------|
| Core diversity | uniformRandom, allSameColor, allSameType, allDifferentColors, allDifferentTypes, allDifferentColorsAndTypes | 44% |
| Exactly K | exactlyKColors (k=2,3), exactlyKTypes (k=2,3) | 30% |
| Symmetry | symmetricColors, symmetricTypes, firstAndLastSame, noAdjacent | 16% |
| Combined | allDifferentColorsAndSameShape, allDifferentShapesAndSameColor | 8% |
| Green counts | withGreenCount (0,1,2,3,4) | 6% |
| Triangle counts | withTriangleCount (0,1,2,3,4) | 6% |
| Circle counts | withCircleCount (0,1,2,3,4) | 6% |

### Key Benefits

1. **No side-channel leakage:** Same baseline for all rules
2. **Rich diversity:** 35+ patterns ensure natural variety
3. **Natural frequencies:** Specific attribute counts (green, triangle, circle) appear at realistic rates
4. **No obvious gaps:** Can't exploit "what's missing" heuristic
5. **Harder gameplay:** Must genuinely test hypotheses instead of pattern-matching distribution gaps
6. **Easier maintenance:** Change baseline once, affects all rules

### Implementation Details

**Before (v1):**
```javascript
distribution: {
    positive: [...],
    negative: [
        { type: 'uniformRandom', weight: 0.20 },
        { type: 'exactlyKColors', weight: 0.40, options: { k: 3 } },
        { type: 'exactlyKColors', weight: 0.40, options: { k: 2 } }
    ]
}
```

**After (v2):**
```javascript
distribution: {
    positive: [...],
    negative: BASELINE_DISTRIBUTION // Rule-agnostic rich baseline
}
```

### Collision Handling

Since baseline is rule-agnostic, some patterns may accidentally satisfy the rule. The game handles this via retry-with-fallback:

1. Sample from BASELINE_DISTRIBUTION
2. Check if it violates the rule (as needed for negative example)
3. If not, retry up to 100 times
4. If still fails, use guaranteed `generateNegative()` fallback

**Performance:** 100 attempts at <1ms each = acceptable. Fallback ensures correctness.

### Expected Collision Rates

Estimated percentage of baseline that accidentally satisfies each rule:

| Rule | Collision Rate | Notes |
|------|---------------|-------|
| All same color | ~7% | Only allSameColor pattern satisfies |
| All same type | ~7% | Only allSameType pattern satisfies |
| All different colors | ~6% | Only allDifferentColors + allDifferentColorsAndTypes |
| Contains green | ~5% | Green count patterns 1-4 |
| Exactly two colors | ~8% | exactlyKColors k=2 |
| Contains triangle | ~5% | Triangle count patterns 1-4 |
| At least two circles | ~3% | Circle count patterns 2-4 |
| First is red circle | ~4% | 1/6 colors × 1/6 shapes in random |
| Color palindrome | ~7% | symmetricColors + allSameColor |
| All colors & types different | ~6% | Only allDifferentColorsAndTypes |

Average collision rate: **~6%**, well within acceptable range (< 50%).

### Testing Checklist

- [ ] Play each rule and verify negatives feel diverse
- [ ] Confirm no obvious distribution gaps
- [ ] Verify fallback `generateNegative()` rarely triggers (should be < 5% of negatives)
- [ ] Check console for warnings about failed validations
- [ ] Playtest: Confirm humans can't easily guess rules from distribution patterns

### Future Enhancements

If desired, we can add **per-rule near-miss boosters** on top of baseline:

```javascript
negative: [
    ...BASELINE_DISTRIBUTION.map(d => ({ ...d, weight: d.weight * 0.70 })), // 70% baseline
    { type: 'nearMiss1', weight: 0.15 }, // 15% near-miss
    { type: 'nearMiss2', weight: 0.15 }  // 15% near-miss
]
```

This preserves baseline diversity while adding pedagogical near-misses. However, current v2 uses pure baseline to maximize anti-leakage.

### Files Modified

- `shapes-distributions.js`: Added BASELINE_DISTRIBUTION (lines 578-639)
- `shapes-rules.js`: Updated all 9 rules to use BASELINE_DISTRIBUTION for negatives
- `BASELINE_DISTRIBUTION_v2.md`: This documentation
- `IMPROVEMENT_PLAN.md`: Original design document

### Version History

- **v1 (2025-10-18)**: Custom per-rule negative distributions (information leakage)
- **v2 (2025-10-19)**: Universal BASELINE_DISTRIBUTION (no leakage)

---

**Result:** The shapes game is now significantly more challenging and intellectually honest. Players must genuinely form and test hypotheses rather than exploiting statistical artifacts of the distribution.
