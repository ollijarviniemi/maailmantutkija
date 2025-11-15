# Shapes Game - Distribution Implementation

## Date: 2025-10-18

## Summary

Implemented comprehensive distribution system for the Shapes Game with all 27 rules (12 existing + 15 new). Each rule now has pedagogically designed positive and negative example generators with built-in validation.

## Game Structure

**Input:** Sequence of 4 (color, type) pairs in left-to-right order
- **Colors:** red, blue, green, purple, black, yellow (6 total)
- **Types:** circle, square, triangle, star, heart, plus (6 total)
- **Rules:** 27 total (s1-s27)

## What Was Implemented

### 1. Distribution Generators (`shapes-distributions.js`)

Created 19 distribution generator functions:

#### Basic Generators (1-7):
1. **uniformRandom()** - 4 random (color, type) pairs
2. **allSameColor(color)** - All 4 shapes same color, random types
3. **allSameType(type)** - All 4 shapes same type, random colors
4. **allDifferentColors()** - 4 different colors
5. **allDifferentTypes()** - 4 different types
6. **exactlyKColors(k)** - Exactly k distinct colors (1-4)
7. **exactlyKTypes(k)** - Exactly k distinct types (1-4)

#### Positional Generators (8-11):
8. **firstAndLastSame(attribute)** - First and last match on 'color' or 'type'
9. **specificAtPosition(pos, color, type)** - Specific shape at position
10. **colorPattern(pattern)** - Specific color sequence (e.g., [red, blue, red, blue])
11. **typePattern(pattern)** - Specific type sequence

#### Counting Generators (12-13):
12. **atLeastK(attribute, value, k)** - At least k shapes with specific color/type
13. **exactlyK(attribute, value, k)** - Exactly k shapes with specific color/type

#### Complexity Generators (14-19):
14. **increasingCorners()** - Corner count strictly increasing
15. **nonDecreasingCorners()** - Corner count non-decreasing
16. **symmetricColors()** - Palindromic color sequence
17. **symmetricTypes()** - Palindromic type sequence
18. **noAdjacentSameColor()** - No two adjacent shapes same color
19. **noAdjacentSameType()** - No two adjacent shapes same type

### 2. Rule Additions (`shapes-rules.js`)

**Existing Rules (s1-s12):**
- s1: All same color
- s2: All same type
- s3: All different colors
- s4: Contains green
- s5: First and last same color
- s6: Exactly two colors
- s7: All different types
- s8: Contains triangle
- s9: At least two circles
- s10: Exactly two types
- s11: First is red circle
- s12: Corner count strictly increasing

**New Rules (s13-s27):**
- s13: First and last different colors
- s14: Color palindrome (positions 0==3, 1==2)
- s15: Exactly three colors
- s16: No two adjacent same color
- s17: Type palindrome
- s18: Exactly three types
- s19: At least three circles
- s20: No two adjacent same type
- s21: Corner count non-decreasing
- s22: First and last same corner count
- s23: All same corner count
- s24: Same color → same type (logical implication)
- s25: If red exists, blue exists (logical implication)
- s26: First and third identical (both color AND type)
- s27: Exactly two pairs of identical shapes

### 3. Distribution Design Patterns

**Pattern used:** 20% random + 80% conceptual near-misses

**Example Near-Miss Designs:**

**s1 (All same color):**
- ✓ Positive: `allSameColor(randomColor)`
- ✗ Negative near-misses:
  - 40% exactly 3 colors (near-miss!)
  - 40% exactly 2 colors (near-miss!)

**s12 (Corners strictly increasing):**
- ✓ Positive: `increasingCorners()` → [circle, triangle, square, star]
- ✗ Negative near-misses:
  - 40% `nonDecreasingCorners()` (allows equal - near-miss!)
  - 40% `allDifferentTypes()` (random corners)

**s14 (Color palindrome):**
- ✓ Positive: `symmetricColors()` → [red, blue, blue, red]
- ✗ Negative near-misses:
  - 40% `firstAndLastSame('color')` (only ends match - near-miss!)
  - 40% `symmetricTypes()` (wrong attribute - near-miss!)

**s16 (No adjacent same color):**
- ✓ Positive: `noAdjacentSameColor()`
- ✗ Negative near-misses:
  - 40% `allSameColor()` (extreme opposite)
  - 40% `exactlyKColors(2)` (likely has adjacent)

**s24 (Same color → same type):**
- ✓ Positive:
  - 50% `allDifferentColors()` (vacuously true)
  - 50% `uniformRandom()` (some satisfy)
- ✗ Negative:
  - 60% `exactlyKColors(2)` (likely violates)
  - 40% `allSameColor()` with different types

### 4. Game Logic Updates (`shapes-game.js`)

**Added methods:**

1. **generateShapesForRule(shouldSatisfy)**
   - Uses distribution specs from rule definitions
   - Handles different generator signatures
   - Falls back to random generation if no distribution

2. **generateShapesFallback(shouldSatisfy)**
   - Fallback random generation with retry logic
   - Ensures generated shapes match desired satisfaction status

**Added validation:**
- Logs console warnings if positive example doesn't satisfy rule
- Logs warnings if negative example satisfies rule
- Helps identify distribution bugs during development

## Corner Count System

Corner counts used for ordering rules:
- **circle, heart:** 0 corners
- **triangle:** 3 corners
- **square, plus:** 4 corners
- **star:** 5 corners

This enables rules about increasing/decreasing/equal corner counts.

## Logical Implication Rules

**s24:** "Same color → same type"
- Checks: For all pairs (i,j), if color[i] == color[j], then type[i] == type[j]
- Vacuously true when all colors different

**s25:** "If red exists, blue exists"
- Checks: hasRed → hasBlue (equivalent to !hasRed OR hasBlue)
- Vacuously true when no red shapes

## Testing Checklist

- [✓] 27 rules with distributions
- [✓] 19 generators produce valid 4-shape sequences
- [✓] Validation logs warnings for incorrect examples
- [ ] Browser testing at /saannon-keksiminen.html
- [ ] Near-misses are pedagogically useful (verify in testing)

## Files Modified/Created

1. `/shapes/shapes-distributions.js` (CREATED, 450 lines)
2. `/shapes/shapes-rules.js` (UPDATED, 550 lines)
3. `/shapes/shapes-game.js` (UPDATED, added validation + distributions)
4. `/shapes/SHAPES_IMPLEMENTATION.md` (THIS FILE)

## Design Philosophy

**Pedagogical value:** Near-misses help students refine understanding by testing:
- **Boundary cases:** "Almost all same color" vs "all same color"
- **Attribute confusion:** Color palindrome vs type palindrome
- **Count variations:** Exactly 2 vs exactly 3 distinct colors
- **Logical near-misses:** Only ends match vs full palindrome

**Validation-first:** Always validate generated examples match expected satisfaction status.

**Flexibility:** System gracefully falls back to random generation if distributions aren't specified.

## Next Steps

1. Test in browser at `http://localhost:4000/saannon-keksiminen.html`
2. Select "Shapes" game
3. Play through several rules (especially new ones s13-s27)
4. Verify:
   - Examples generate correctly
   - Validation warnings (if any) in console
   - Near-misses are pedagogically useful
   - Corner-based rules work correctly
   - Logical implication rules (s24, s25) work

## Version

All files use `?v7` query parameter for cache busting.
