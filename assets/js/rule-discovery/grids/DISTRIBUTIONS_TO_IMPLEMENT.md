# Distribution Generators to Implement for Grids Game

This document lists all the distribution generator functions that need to be implemented in `grids-distributions.js` based on the updated `grids-rules.js`.

## Already Implemented (from previous version)
- `withBlackCount(count)`
- `anySymmetry()`
- `fullySymmetric()`
- `fitsIn3x3()`
- `fitsIn4x4()`
- `onePerRowAndColumn()`
- `almostOnePerRowColumn()`
- `max3Neighbors()`

## Rule 1: At Most 6 Cells
All needed generators already implemented (`withBlackCount`).

## Rule 2: Symmetric (Vertical OR Horizontal)

### Positive:
- `anySymmetry()` ✓ (already implemented)
- `fullySymmetric()` ✓ (already implemented)

### Round-Specific Negative:
- `almostSymmetric()` - symmetric except for 1-2 cells
- `leftRightEqual()` - left 3 columns equal to right 3 columns (not mirrored)
- `topBottomEqual()` - top 3 rows equal to bottom 3 rows (not mirrored)
- `copy3X3()` - some 3×3 region copied to another location
- `leftRightMirror()` - only left/right mirror (not vertical axis)
- `topBottomMirror()` - only top/bottom mirror (not horizontal axis)
- `180degreeRotInv()` - 180-degree rotational invariance (not vertical/horizontal symmetry)

## Rule 3: Connected (One Blob)

### Positive:
- `connectedLongSquiggle()` - long meandering connected path
- `connectedManyBlacks(count)` - large connected blob with specified count
- `twoBlobsConViaPath()` - two blobs connected by thin path
- `tree()` - tree-like structure (branching, no cycles)
- `thinkBlob()` - compact thick connected blob

### Round-Specific Negative:
- `twoLargeComponents()` - two separate large blobs (8-12 cells each)
- `threeMediumComponents()` - three separate medium blobs (5-8 cells each)
- `fourSquiggles()` - four separate squiggle shapes
- `fiveSquiggles()` - five separate small squiggles
- `many2-4()` - many small components of size 2-4

## Rule 4: Border Only

### Positive:
- `borderUniRand()` - uniform random on border cells
- `threeEdgesRand()` - random placement on 3 edges
- `twoEdgesRand()` - random placement on 2 edges
- `corner2x2sRand()` - random cells in corner 2×2 regions

### Round-Specific Negative:
- `noDeadCenter()` - everywhere except center 2×2
- `on3VerticalStripes()` - only on columns 0-1, 2-3, 4-5
- `on2HorizontalStripes()` - only on rows 0-2 and 3-5
- `noCenter2Columns()` - not on center 2 columns
- `noCenter2Rows()` - not on center 2 rows
- `corner2x2s()` - only in corner 2×2 regions
- `noBorders()` - only interior (no border cells)

## Rule 5: No Isolated

### Positive:
- `many2-4s()` - many components of size 2-4, no isolated
- `twoLargeComponents()` - (reuse from rule 3)
- `threeMediumComponents()` - (reuse from rule 3)
- `fourSquiqqles()` - four separate squiggles (note: typo variant)
- `many3s()` - many components of size exactly 3
- `longSquiqqle()` - single long meandering path (note: typo variant)

### Round-Specific Negative:
- `many1-4s()` - mix of sizes 1-4 including isolated
- `many1-2s()` - mix of sizes 1-2 including isolated
- `many1-3s()` - mix of sizes 1-3 including isolated
- `fourSquiqqlesOne1()` - four squiggles plus one isolated cell
- `isolatedDots(count)` - specified number of isolated single cells

## Rule 6: All in One Half

### Positive:
- `allInOneHalf()` - all blacks in one half (top/bottom/left/right)
- `allInOneThird()` - all in one third (e.g., rows 0-1)
- `allInOneCol()` - all in single column
- `allInOneRow()` - all in single row
- `allInOneHalfMiddleRemoved()` - in one half but not on middle row/col of that half
- `allInOneHalfEdgeRemoved()` - in one half but not on edge
- `allInCorner3x3()` - all in one corner 3×3
- `allInEdge2x3s()` - all in edge 2×3 regions
- `allInOneHalfBordersOnly()` - in one half, only on borders

### Round-Specific Negative:
- `noCenter2RorC()` - not in center 2 rows or center 2 columns
- `noEdge2RorC()` - not in edge 2 rows or edge 2 columns
- `allInTwoThirds()` - fits in two thirds
- `allInCorner2x2s()` - distributed in corner 2×2 regions
- `allInThreeRorC()` - all in any 3 rows or any 3 columns
- `allInMiddle2RorC()` - all in middle 2 rows or middle 2 columns
- `allInMiddle4x4()` - all in center 4×4

## Rule 7: One Per Row/Column

### Positive:
- `onePerRowAndColumn()` ✓ (already implemented)

### Round-Specific Negative:
- `almostOnePerRowColumn()` ✓ (already implemented)
- `onePerRowColumnOneMissing()` - one per row/col but one row/col empty
- `onePerRowColumnOneExtra()` - one per row/col but one row/col has 2

## Rule 8: Fits in 4×4

### Positive:
- `fitsIn4x4()` ✓ (already implemented)
- `fitsIn3x3()` ✓ (already implemented)
- `fitsIn3x4()` - fits in 3×4 window
- `fitsIn2x4()` - fits in 2×4 window
- `fitsIn2x3()` - fits in 2×3 window
- `twoCompsIn4x4()` - two components both in same 4×4
- `pentominoIn4x4()` - pentomino shape (5 cells) with extras in 4×4
- `randomTetris()` - tetris-like shapes in 4×4
- `sextominoIn4x4()` - 6-cell polyomino with extras in 4×4

### Round-Specific Negative:
- `fitsIn2x5()` - fits in 2×5 window (not 4×4)
- `fitsIn3x5()` - fits in 3×5 window
- `fitsIn4x5()` - fits in 4×5 window
- `sextominoNot4x4()` - 6-cell shape that doesn't fit in 4×4
- `septominoNot4x4()` - 7-cell shape that doesn't fit in 4×4
- `fitsInTwo2x2s()` - fits in two disjoint 2×2 regions
- `fitsInTwo2x3s()` - fits in two disjoint 2×3 regions
- `fitsInTwo2x4s()` - fits in two disjoint 2×4 regions
- `fitsIn2x6()` - fits in 2×6 window (full row/column strip)

## Rule 9: Has 2×2 Square

### Positive:
- `has2x2Plus10-15()` - 2×2 square plus 10-15 extra cells
- `has2x2Plus15-20()` - 2×2 square plus 15-20 extra cells
- `has2x2Plus20-25()` - 2×2 square plus 20-25 extra cells
- `has3x3Square()` - 3×3 filled square (implies 2×2)
- `has4x4Square()` - 4×4 filled square
- `multiple2x2s()` - multiple 2×2 squares
- `has2x3RectPlus()` - 2×3 rectangle plus extras
- `has3x2RectPlus()` - 3×2 rectangle plus extras
- `hasTshape()` - T-shaped pattern (implies 2×2)

### Round-Specific Negative:
- `has2x1Plus()` - 2×1 domino shapes with extras (no 2×2)
- `has1x2Plus()` - 1×2 domino shapes with extras (no 2×2)
- `hasLshape()` - L-shaped patterns (3 cells)
- `hasPlusShape()` - plus/cross shapes (5 cells, no 2×2)
- `hasDiagonal3()` - diagonal patterns of length 3
- `hasDiagonal4()` - diagonal patterns of length 4
- `denseCheckerboard()` - dense checkerboard pattern
- `denseStripedPattern()` - dense striped pattern
- `denseSpiralPattern()` - dense spiral pattern
- `denseZigzag()` - dense zigzag pattern

## Rule 10: Has Cell with 4 Neighbors

### Positive:
- `plusShapePlus10-15()` - plus shape (5 cells) plus 10-15 extras
- `plusShapePlus15-20()` - plus shape plus 15-20 extras
- `plusShapePlus20-25()` - plus shape plus 20-25 extras
- `multiplePlusShapes()` - multiple plus shapes
- `has3x3Square()` - (reuse from rule 9)
- `has4x4Square()` - (reuse from rule 9)
- `crossShapePlus()` - cross/X shape with center having 4 neighbors
- `denseBlob4Neighbors()` - dense blob with multiple cells having 4 neighbors
- `largeBlobMany4Neighbors()` - large blob with many cells having 4 neighbors

### Round-Specific Negative:
- `max3Neighbors()` ✓ (already implemented)
- `denseMax3Neighbors()` - dense pattern where max is 3 neighbors
- `longSnake()` - long meandering path (max 2 neighbors)
- `treeMax3()` - tree structure (max 3 neighbors)
- `checkerboardDense()` - dense checkerboard (max 2 neighbors)
- `spiralNoCenter()` - spiral pattern without filled center
- `borderThickNoCenter()` - thick border but hollow center
- `multipleDisjointBlobs()` - multiple separate blobs
- `lShapesMany()` - many L-shaped patterns
- `tShapesMany()` - many T-shaped patterns (3 neighbors at junction)

---

## Summary Statistics

- **Total unique distribution types**: 113
- **Already implemented**: ~8
- **Need to implement**: ~105

## Implementation Notes

Many distributions can share helper functions:
- Random placement within regions
- Component generation (squiggles, blobs, trees)
- Symmetry operations
- Polyomino generation
- Neighbor counting utilities
- Boundary detection

Suggested implementation order:
1. **Helper utilities** (random placement, neighbor counting)
2. **Simple spatial constraints** (allInOneHalf, fitsInNxM)
3. **Component generators** (connected blobs, squiggles, trees)
4. **Shape generators** (polyominoes, L/T shapes, plus shapes)
5. **Pattern generators** (checkerboard, spiral, striped)
6. **Complex combinations** (component + density variations)
