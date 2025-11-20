/**
 * Grids Game - Distribution Utilities
 * Generators for creating 6x6 grid patterns with black cells
 */

/**
 * Helper: Get random element from array
 */
function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Helper: Random integer between min and max (inclusive)
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Helper: Shuffle array in place
 */
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * 1. Uniformly random grid
 * @returns {Array} 6x6 grid with random black cells
 */
export function uniformRandom() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));
    const count = randomInt(0, 15);
    for (let i = 0; i < count; i++) {
        grid[randomInt(0, 5)][randomInt(0, 5)] = true;
    }
    return grid;
}

/**
 * 2. Grid with exactly N black cells
 * @param {number} count - Number of black cells
 * @returns {Array} 6x6 grid
 */
export function withBlackCount(count = 5) {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    const positions = [];
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
            positions.push([i, j]);
        }
    }
    shuffle(positions);

    for (let i = 0; i < Math.min(count, 36); i++) {
        const [r, c] = positions[i];
        grid[r][c] = true;
    }

    return grid;
}

/**
 * 3. Connected blob of black cells
 * @param {number} count - Approximate number of black cells
 * @returns {Array} 6x6 grid with connected blob
 */
export function connectedBlobs(count = null) {
    if (count === null) count = randomInt(3, 10);

    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    // Start from random position
    let r = randomInt(1, 4);
    let c = randomInt(1, 4);
    grid[r][c] = true;

    // Grow blob
    const frontier = [[r, c]];
    for (let i = 1; i < count; i++) {
        if (frontier.length === 0) break;

        const baseIdx = randomInt(0, frontier.length - 1);
        const [br, bc] = frontier[baseIdx];

        // Try to add neighbor
        const neighbors = [[br-1, bc], [br+1, bc], [br, bc-1], [br, bc+1]];
        const validNeighbors = neighbors.filter(([nr, nc]) =>
            nr >= 0 && nr < 6 && nc >= 0 && nc < 6 && !grid[nr][nc]
        );

        if (validNeighbors.length === 0) {
            frontier.splice(baseIdx, 1);
            i--; // Try again
            continue;
        }

        const [nr, nc] = randomChoice(validNeighbors);
        grid[nr][nc] = true;
        frontier.push([nr, nc]);
    }

    return grid;
}

/**
 * 4. Block resolution (2x2 blocks all uniform)
 * @param {number} blockSize - Size of uniform blocks
 * @returns {Array} 6x6 grid with block structure
 */
export function blockResolution(blockSize = 2) {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    // Fill 3x3 template at block level
    const template = Array.from({ length: 3 }, () => Array(3).fill(false));
    const numBlocks = randomInt(0, 5);

    const positions = [];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            positions.push([i, j]);
        }
    }
    shuffle(positions);

    for (let k = 0; k < numBlocks; k++) {
        const [i, j] = positions[k];
        template[i][j] = true;
    }

    // Expand to 6x6
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (template[i][j]) {
                grid[i*2][j*2] = true;
                grid[i*2][j*2 + 1] = true;
                grid[i*2 + 1][j*2] = true;
                grid[i*2 + 1][j*2 + 1] = true;
            }
        }
    }

    return grid;
}

/**
 * 5. One black per row and column (like sudoku constraint)
 * @returns {Array} 6x6 grid
 */
export function onePerRowAndColumn() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    const cols = [0, 1, 2, 3, 4, 5];
    shuffle(cols);

    for (let i = 0; i < 6; i++) {
        grid[i][cols[i]] = true;
    }

    return grid;
}

/**
 * 6. Vertically symmetric
 * @returns {Array} 6x6 grid with vertical symmetry
 */
export function verticalSymmetry() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    const count = randomInt(2, 10);

    for (let i = 0; i < count; i++) {
        const r = randomInt(0, 5);
        const c = randomInt(0, 2); // Only left half
        grid[r][c] = true;
        grid[r][5 - c] = true; // Mirror
    }

    return grid;
}

/**
 * 7. Horizontally symmetric
 * @returns {Array} 6x6 grid with horizontal symmetry
 */
export function horizontalSymmetry() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    const count = randomInt(2, 10);

    for (let i = 0; i < count; i++) {
        const r = randomInt(0, 2); // Only top half
        const c = randomInt(0, 5);
        grid[r][c] = true;
        grid[5 - r][c] = true; // Mirror
    }

    return grid;
}

/**
 * 8. Tiled 3x3 pattern (same 3x3 repeated 4 times)
 * @returns {Array} 6x6 grid
 */
export function tiled3x3() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    // Create 3x3 template
    const template = Array.from({ length: 3 }, () => Array(3).fill(false));
    const count = randomInt(1, 5);

    for (let i = 0; i < count; i++) {
        template[randomInt(0, 2)][randomInt(0, 2)] = true;
    }

    // Tile it
    for (let qi = 0; qi < 2; qi++) {
        for (let qj = 0; qj < 2; qj++) {
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    grid[qi * 3 + i][qj * 3 + j] = template[i][j];
                }
            }
        }
    }

    return grid;
}

/**
 * 9. No isolated black cells (all have neighbors)
 * @returns {Array} 6x6 grid
 */
export function noIsolatedBlacks() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    // Create small connected groups
    const numGroups = randomInt(1, 3);

    for (let g = 0; g < numGroups; g++) {
        const groupSize = randomInt(2, 4);
        let r = randomInt(1, 4);
        let c = randomInt(1, 4);

        grid[r][c] = true;

        for (let i = 1; i < groupSize; i++) {
            const neighbors = [[r-1, c], [r+1, c], [r, c-1], [r, c+1]];
            const validNeighbors = neighbors.filter(([nr, nc]) =>
                nr >= 0 && nr < 6 && nc >= 0 && nc < 6 && !grid[nr][nc]
            );

            if (validNeighbors.length === 0) break;

            [r, c] = randomChoice(validNeighbors);
            grid[r][c] = true;
        }
    }

    return grid;
}

/**
 * 10. Has a 3x3 black square somewhere
 * @returns {Array} 6x6 grid with 3x3 square plus many extra cells to hide the pattern (avg 20-30 cells)
 */
export function has3x3BlackSquare() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    // Place 3x3 square (9 cells)
    const startR = randomInt(0, 3);
    const startC = randomInt(0, 3);

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            grid[startR + i][startC + j] = true;
        }
    }

    // Add many more cells to hide the 3x3 square - targeting 20-30 total cells
    // Since we have 9 already, add 11-21 more (but some may overlap)
    const extraCount = randomInt(12, 24);
    for (let i = 0; i < extraCount; i++) {
        grid[randomInt(0, 5)][randomInt(0, 5)] = true;
    }

    return grid;
}

/**
 * 11. Non-decreasing black count per row
 * @returns {Array} 6x6 grid
 */
export function nonDecreasingRows() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    // Generate non-decreasing counts
    let counts = [0];
    for (let i = 1; i < 6; i++) {
        counts.push(counts[i-1] + randomInt(0, 1));
        if (counts[i] > 6) counts[i] = 6;
    }

    for (let i = 0; i < 6; i++) {
        const positions = Array.from({length: 6}, (_, idx) => idx);
        shuffle(positions);

        for (let k = 0; k < counts[i]; k++) {
            grid[i][positions[k]] = true;
        }
    }

    return grid;
}

/**
 * 12. Has a cell with 4 neighbors
 * @returns {Array} 6x6 grid
 */
export function hasCellWith4Neighbors() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    // Place a plus pattern
    const r = randomInt(1, 4);
    const c = randomInt(1, 4);

    grid[r][c] = true;
    grid[r-1][c] = true;
    grid[r+1][c] = true;
    grid[r][c-1] = true;
    grid[r][c+1] = true;

    // Maybe add more
    if (Math.random() < 0.4) {
        const extraCount = randomInt(1, 4);
        for (let i = 0; i < extraCount; i++) {
            grid[randomInt(0, 5)][randomInt(0, 5)] = true;
        }
    }

    return grid;
}

/**
 * 13. Diagonal pattern
 * @returns {Array} 6x6 grid
 */
export function diagonalPattern() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    if (Math.random() < 0.5) {
        // Main diagonal
        for (let i = 0; i < 6; i++) {
            grid[i][i] = true;
        }
    } else {
        // Anti-diagonal
        for (let i = 0; i < 6; i++) {
            grid[i][5 - i] = true;
        }
    }

    return grid;
}

/**
 * 14. Border pattern
 * @returns {Array} 6x6 grid
 */
export function borderPattern() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    // Fill border
    for (let i = 0; i < 6; i++) {
        grid[0][i] = true;
        grid[5][i] = true;
        grid[i][0] = true;
        grid[i][5] = true;
    }

    return grid;
}

/**
 * 15. Checkerboard pattern
 * @returns {Array} 6x6 grid
 */
export function checkerboardPattern() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
            if ((i + j) % 2 === 0) {
                grid[i][j] = true;
            }
        }
    }

    return grid;
}

/**
 * 16. Near miss for "one per row and column": multiple in same row/column
 * @returns {Array} 6x6 grid with 5-7 cells, violating the constraint
 */
export function almostOnePerRowColumn() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    const numCells = randomInt(5, 7);

    if (Math.random() < 0.5) {
        // Place 5 cells (missing one row/column)
        const cols = shuffle([0, 1, 2, 3, 4, 5]).slice(0, 5);
        for (let i = 0; i < 5; i++) {
            grid[i][cols[i]] = true;
        }
    } else {
        // Place 6+ cells with duplicates in same row/column
        const cols = shuffle([0, 1, 2, 3, 4, 5]);
        for (let i = 0; i < 6; i++) {
            grid[i][cols[i]] = true;
        }
        // Add an extra cell to create duplicate
        const dupRow = randomInt(0, 5);
        const dupCol = randomInt(0, 5);
        grid[dupRow][dupCol] = true;
    }

    return grid;
}

/**
 * 17. Disconnected blobs (near miss for connectivity)
 * @returns {Array} 6x6 grid with 2-3 separate connected components
 */
export function disconnectedBlobs() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    const numBlobs = randomInt(2, 3);

    for (let b = 0; b < numBlobs; b++) {
        const blobSize = randomInt(2, 4);
        let r = randomInt(0, 5);
        let c = randomInt(0, 5);

        // Try to place in different quadrants
        if (b === 1) {
            r = randomInt(0, 2);
            c = randomInt(4, 5);
        } else if (b === 2) {
            r = randomInt(4, 5);
            c = randomInt(1, 3);
        }

        grid[r][c] = true;

        for (let i = 1; i < blobSize; i++) {
            const neighbors = [[r-1, c], [r+1, c], [r, c-1], [r, c+1]];
            const validNeighbors = neighbors.filter(([nr, nc]) =>
                nr >= 0 && nr < 6 && nc >= 0 && nc < 6 && !grid[nr][nc]
            );

            if (validNeighbors.length === 0) break;

            [r, c] = randomChoice(validNeighbors);
            grid[r][c] = true;
        }
    }

    return grid;
}

/**
 * 18. Almost symmetric (one cell breaks symmetry)
 * @returns {Array} 6x6 grid that's almost vertically symmetric
 */
export function almostSymmetric() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    const count = randomInt(3, 8);

    // Create symmetric pattern
    for (let i = 0; i < count; i++) {
        const r = randomInt(0, 5);
        const c = randomInt(0, 2);
        grid[r][c] = true;
        grid[r][5 - c] = true;
    }

    // Break symmetry with one cell
    const breakR = randomInt(0, 5);
    const breakC = randomInt(0, 5);
    grid[breakR][breakC] = !grid[breakR][breakC];

    return grid;
}

/**
 * 19. Almost block resolution (1-2 blocks are mixed)
 * @returns {Array} 6x6 grid where most 2x2 blocks are uniform but some are mixed
 */
export function almostBlockResolution() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    // Start with block-resolution pattern
    const template = Array.from({ length: 3 }, () => Array(3).fill(false));
    const numBlocks = randomInt(2, 5);

    for (let k = 0; k < numBlocks; k++) {
        template[randomInt(0, 2)][randomInt(0, 2)] = true;
    }

    // Expand to 6x6 with blocks
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (template[i][j]) {
                grid[i*2][j*2] = true;
                grid[i*2][j*2 + 1] = true;
                grid[i*2 + 1][j*2] = true;
                grid[i*2 + 1][j*2 + 1] = true;
            }
        }
    }

    // Break 1-2 blocks
    const numBreaks = randomInt(1, 2);
    for (let b = 0; b < numBreaks; b++) {
        const br = randomInt(0, 2) * 2;
        const bc = randomInt(0, 2) * 2;
        // Flip one cell in this block
        grid[br + randomInt(0, 1)][bc + randomInt(0, 1)] = !grid[br][bc];
    }

    return grid;
}

/**
 * 20. Few isolated blacks (1-2 isolated cells)
 * @returns {Array} 6x6 grid with some connected cells and 1-2 isolated ones
 */
export function fewIsolatedBlacks() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    // Create a small connected component
    const blobSize = randomInt(2, 4);
    let r = randomInt(1, 4);
    let c = randomInt(1, 4);
    grid[r][c] = true;

    for (let i = 1; i < blobSize; i++) {
        const neighbors = [[r-1, c], [r+1, c], [r, c-1], [r, c+1]];
        const validNeighbors = neighbors.filter(([nr, nc]) =>
            nr >= 0 && nr < 6 && nc >= 0 && nc < 6 && !grid[nr][nc]
        );
        if (validNeighbors.length === 0) break;
        [r, c] = randomChoice(validNeighbors);
        grid[r][c] = true;
    }

    // Add 1-2 isolated cells
    const numIsolated = randomInt(1, 2);
    for (let i = 0; i < numIsolated; i++) {
        // Find a cell with no black neighbors
        let attempts = 0;
        while (attempts < 50) {
            const ir = randomInt(0, 5);
            const ic = randomInt(0, 5);
            if (!grid[ir][ic]) {
                const neighbors = [[ir-1,ic], [ir+1,ic], [ir,ic-1], [ir,ic+1]];
                const hasBlackNeighbor = neighbors.some(([nr, nc]) =>
                    nr >= 0 && nr < 6 && nc >= 0 && nc < 6 && grid[nr][nc]
                );
                if (!hasBlackNeighbor) {
                    grid[ir][ic] = true;
                    break;
                }
            }
            attempts++;
        }
    }

    return grid;
}

/**
 * 21. Almost tiled (3 quadrants match, 1 differs)
 * @returns {Array} 6x6 grid where 3 quadrants have same pattern but 4th differs
 */
export function almostTiled() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    // Create 3x3 template
    const template = Array.from({ length: 3 }, () => Array(3).fill(false));
    const count = randomInt(2, 5);
    for (let i = 0; i < count; i++) {
        template[randomInt(0, 2)][randomInt(0, 2)] = true;
    }

    // Tile to 3 quadrants
    const quadrants = [[0,0], [0,1], [1,0], [1,1]];
    const skipQuadrant = randomInt(0, 3);

    quadrants.forEach(([qi, qj], idx) => {
        if (idx === skipQuadrant) {
            // Different pattern for this quadrant
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    if (Math.random() < 0.4) {
                        grid[qi * 3 + i][qj * 3 + j] = true;
                    }
                }
            }
        } else {
            // Same template
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    grid[qi * 3 + i][qj * 3 + j] = template[i][j];
                }
            }
        }
    });

    return grid;
}

/**
 * 22. Almost 3x3 square (2x2 square or 3x3 with one missing, plus many extra cells)
 * @returns {Array} 6x6 grid with near-miss 3x3 black square hidden among other cells (avg 20-30 cells)
 */
export function almost3x3Square() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    const startR = randomInt(0, 3);
    const startC = randomInt(0, 3);

    if (Math.random() < 0.5) {
        // 2x2 square (not 3x3) - 4 cells
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                grid[startR + i][startC + j] = true;
            }
        }
    } else {
        // 3x3 with one cell missing - 8 cells
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                grid[startR + i][startC + j] = true;
            }
        }
        // Remove one cell
        grid[startR + randomInt(0, 2)][startC + randomInt(0, 2)] = false;
    }

    // Add many more cells to hide the near-miss pattern - targeting 20-30 total cells
    // Base shape is 4-8 cells, so add 16-26 more
    const extraCount = randomInt(16, 26);
    for (let i = 0; i < extraCount; i++) {
        grid[randomInt(0, 5)][randomInt(0, 5)] = true;
    }

    return grid;
}

/**
 * 23. Mostly non-decreasing rows (1-2 rows decrease)
 * @returns {Array} 6x6 grid where most rows are non-decreasing but 1-2 break the pattern
 */
export function almostNonDecreasing() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    // Create mostly non-decreasing pattern
    let counts = [0];
    for (let i = 1; i < 6; i++) {
        counts.push(counts[i-1] + randomInt(0, 1));
        if (counts[i] > 6) counts[i] = 6;
    }

    // Make 1-2 rows decrease
    const numBreaks = randomInt(1, 2);
    for (let b = 0; b < numBreaks; b++) {
        const breakRow = randomInt(1, 5);
        if (counts[breakRow] > 0) {
            counts[breakRow] = Math.max(0, counts[breakRow - 1] - randomInt(1, 2));
        }
    }

    // Fill grid
    for (let i = 0; i < 6; i++) {
        const positions = Array.from({length: 6}, (_, idx) => idx);
        shuffle(positions);
        for (let k = 0; k < counts[i]; k++) {
            grid[i][positions[k]] = true;
        }
    }

    return grid;
}

/**
 * 24. Max 3 neighbors (plus-shape with one missing)
 * @returns {Array} 6x6 grid where some cells have 3 neighbors but none have 4
 */
export function max3Neighbors() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    // Create a plus with one arm missing (3 neighbors for center)
    const r = randomInt(1, 4);
    const c = randomInt(1, 4);

    grid[r][c] = true;

    // Add 3 of 4 neighbors
    const directions = [[r-1,c], [r+1,c], [r,c-1], [r,c+1]];
    shuffle(directions);
    for (let i = 0; i < 3; i++) {
        const [nr, nc] = directions[i];
        grid[nr][nc] = true;
    }

    // Maybe add more cells but ensure no cell gets 4 neighbors
    const extraCount = randomInt(2, 5);
    for (let i = 0; i < extraCount; i++) {
        const er = randomInt(0, 5);
        const ec = randomInt(0, 5);
        if (!grid[er][ec]) {
            // Check if this would create 4 neighbors
            grid[er][ec] = true;
            let hasCell4Neighbors = false;
            for (let checkR = 0; checkR < 6; checkR++) {
                for (let checkC = 0; checkC < 6; checkC++) {
                    if (grid[checkR][checkC]) {
                        const neighbors = [[checkR-1,checkC], [checkR+1,checkC], [checkR,checkC-1], [checkR,checkC+1]];
                        const count = neighbors.filter(([nr,nc]) =>
                            nr >= 0 && nr < 6 && nc >= 0 && nc < 6 && grid[nr][nc]
                        ).length;
                        if (count === 4) {
                            hasCell4Neighbors = true;
                            break;
                        }
                    }
                }
                if (hasCell4Neighbors) break;
            }
            if (hasCell4Neighbors) {
                grid[er][ec] = false;
            }
        }
    }

    return grid;
}

/**
 * 25. Left and right halves are equal
 * @returns {Array} 6x6 grid where left 6x3 equals right 6x3
 */
export function leftRightEqual() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    // Fill left half randomly
    const count = randomInt(2, 10);
    for (let i = 0; i < count; i++) {
        const r = randomInt(0, 5);
        const c = randomInt(0, 2);
        grid[r][c] = true;
        // Copy to right half
        grid[r][c + 3] = true;
    }

    return grid;
}

/**
 * 26. Checkerboard positions (x+y even)
 * @returns {Array} 6x6 grid where all black cells have (x+y) even
 */
export function evenSumCoordinates() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    const count = randomInt(3, 10);
    const validPositions = [];
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
            if ((i + j) % 2 === 0) {
                validPositions.push([i, j]);
            }
        }
    }

    shuffle(validPositions);
    for (let k = 0; k < Math.min(count, validPositions.length); k++) {
        const [r, c] = validPositions[k];
        grid[r][c] = true;
    }

    return grid;
}

/**
 * 27. Fully symmetric (vertical, horizontal, and diagonal)
 * @returns {Array} 6x6 grid with all symmetries
 */
export function fullySymmetric() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    // Only fill top-left triangle, mirror to all others
    const count = randomInt(2, 6);
    for (let i = 0; i < count; i++) {
        const r = randomInt(0, 2);
        const c = randomInt(0, 2);

        // Apply all symmetries
        grid[r][c] = true;
        grid[r][5-c] = true;          // vertical
        grid[5-r][c] = true;          // horizontal
        grid[5-r][5-c] = true;        // both
        grid[c][r] = true;            // diagonal
        grid[5-c][r] = true;          // diagonal + vertical
        grid[c][5-r] = true;          // diagonal + horizontal
        grid[5-c][5-r] = true;        // diagonal + both
    }

    return grid;
}

/**
 * 28. Downward-right cascade (if (x,y) black, then (x+1,y) and (x,y+1) also black)
 * @returns {Array} 6x6 grid with cascade property
 */
export function downwardRightCascade() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    // Start with some seed cells in top-left area
    const numSeeds = randomInt(1, 3);
    const seeds = [];

    for (let i = 0; i < numSeeds; i++) {
        const r = randomInt(0, 3);
        const c = randomInt(0, 3);
        seeds.push([r, c]);
    }

    // Apply cascade rule
    for (const [startR, startC] of seeds) {
        // Mark all cells that must be black due to cascade
        for (let r = startR; r < 6; r++) {
            for (let c = startC; c < 6; c++) {
                grid[r][c] = true;
            }
        }
    }

    return grid;
}

/**
 * 29. Upward cascade (if (x,y) black, then (x,y-1) also black)
 * @returns {Array} 6x6 grid where black cells cascade upward in columns
 */
export function upwardCascade() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    // For each column, randomly pick a bottom row and fill upward from there
    const numColumns = randomInt(2, 5);
    const columns = shuffle(Array.from({length: 6}, (_, i) => i)).slice(0, numColumns);

    for (const col of columns) {
        const bottomRow = randomInt(1, 5); // Start from some row (not necessarily bottom)
        for (let r = 0; r <= bottomRow; r++) {
            grid[r][col] = true;
        }
    }

    return grid;
}

/**
 * 30. Path (connected, max 2 neighbors per cell)
 * @returns {Array} 6x6 grid forming a path (no branching)
 */
export function pathPattern() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    const pathLength = randomInt(4, 12);

    // Start from random position
    let r = randomInt(1, 4);
    let c = randomInt(1, 4);
    grid[r][c] = true;

    const path = [[r, c]];

    for (let i = 1; i < pathLength; i++) {
        // Find neighbors with at most 1 existing neighbor (to maintain path property)
        const neighbors = [[r-1, c], [r+1, c], [r, c-1], [r, c+1]];
        const validNeighbors = neighbors.filter(([nr, nc]) => {
            if (nr < 0 || nr >= 6 || nc < 0 || nc >= 6) return false;
            if (grid[nr][nc]) return false;

            // Check this neighbor's neighbor count
            const neighborCount = [[nr-1,nc], [nr+1,nc], [nr,nc-1], [nr,nc+1]].filter(
                ([nnr, nnc]) => nnr >= 0 && nnr < 6 && nnc >= 0 && nnc < 6 && grid[nnr][nnc]
            ).length;

            // Must have exactly 1 neighbor (the current cell) to maintain path
            return neighborCount === 1;
        });

        if (validNeighbors.length === 0) break;

        [r, c] = randomChoice(validNeighbors);
        grid[r][c] = true;
        path.push([r, c]);
    }

    return grid;
}

/**
 * 31. High density random (20-30 cells)
 * @returns {Array} 6x6 grid with many random black cells
 */
export function highDensityRandom() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));
    const count = randomInt(20, 30);
    for (let i = 0; i < count; i++) {
        grid[randomInt(0, 5)][randomInt(0, 5)] = true;
    }
    return grid;
}

/**
 * 32. Inverted pattern (mostly black, few white)
 * @returns {Array} 6x6 grid that's mostly black with 3-10 white cells
 */
export function invertedPattern() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(true));
    const whiteCount = randomInt(3, 10);
    for (let i = 0; i < whiteCount; i++) {
        grid[randomInt(0, 5)][randomInt(0, 5)] = false;
    }
    return grid;
}

/**
 * 33. Dense connected blob (15-25 cells)
 * @returns {Array} 6x6 grid with large connected component
 */
export function denseConnectedBlob() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));
    const targetCount = randomInt(15, 25);

    // Start from center
    let r = randomInt(2, 3);
    let c = randomInt(2, 3);
    grid[r][c] = true;

    const frontier = [[r, c]];
    let currentCount = 1;

    while (currentCount < targetCount && frontier.length > 0) {
        const idx = randomInt(0, frontier.length - 1);
        const [br, bc] = frontier[idx];

        const neighbors = [[br-1, bc], [br+1, bc], [br, bc-1], [br, bc+1]];
        const validNeighbors = neighbors.filter(([nr, nc]) =>
            nr >= 0 && nr < 6 && nc >= 0 && nc < 6 && !grid[nr][nc]
        );

        if (validNeighbors.length === 0) {
            frontier.splice(idx, 1);
            continue;
        }

        const [nr, nc] = randomChoice(validNeighbors);
        grid[nr][nc] = true;
        frontier.push([nr, nc]);
        currentCount++;
    }

    return grid;
}

/**
 * 34. Multiple large blobs (2-3 large connected components, 20-28 total cells)
 * @returns {Array} 6x6 grid with several large blobs
 */
export function multipleLargeBlobs() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));
    const numBlobs = randomInt(2, 3);
    const targetTotal = randomInt(20, 28);
    const cellsPerBlob = Math.floor(targetTotal / numBlobs);

    const startPositions = [
        [1, 1], [1, 4], [4, 1], [4, 4], [2, 2], [3, 3]
    ];
    shuffle(startPositions);

    for (let b = 0; b < numBlobs; b++) {
        const [startR, startC] = startPositions[b];
        if (grid[startR][startC]) continue;

        grid[startR][startC] = true;
        let blobSize = 1;
        const frontier = [[startR, startC]];

        while (blobSize < cellsPerBlob && frontier.length > 0) {
            const idx = randomInt(0, frontier.length - 1);
            const [br, bc] = frontier[idx];

            const neighbors = [[br-1, bc], [br+1, bc], [br, bc-1], [br, bc+1]];
            const validNeighbors = neighbors.filter(([nr, nc]) =>
                nr >= 0 && nr < 6 && nc >= 0 && nc < 6 && !grid[nr][nc]
            );

            if (validNeighbors.length === 0) {
                frontier.splice(idx, 1);
                continue;
            }

            const [nr, nc] = randomChoice(validNeighbors);
            grid[nr][nc] = true;
            frontier.push([nr, nc]);
            blobSize++;
        }
    }

    return grid;
}

/**
 * 35. Striped pattern (horizontal or vertical stripes, dense)
 * @returns {Array} 6x6 grid with alternating stripes (18-24 cells)
 */
export function denseStripedPattern() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));
    const horizontal = Math.random() < 0.5;

    if (horizontal) {
        // Fill 3-4 rows
        const rowsToFill = shuffle([0, 1, 2, 3, 4, 5]).slice(0, randomInt(3, 4));
        for (const row of rowsToFill) {
            for (let col = 0; col < 6; col++) {
                grid[row][col] = true;
            }
        }
    } else {
        // Fill 3-4 columns
        const colsToFill = shuffle([0, 1, 2, 3, 4, 5]).slice(0, randomInt(3, 4));
        for (const col of colsToFill) {
            for (let row = 0; row < 6; row++) {
                grid[row][col] = true;
            }
        }
    }

    return grid;
}

/**
 * 36. Complementary to sparse pattern (what withBlackCount doesn't cover)
 * @returns {Array} 6x6 grid with 16-30 cells
 */
export function highCellCount() {
    const count = randomInt(16, 30);
    return withBlackCount(count);
}

/**
 * 37. Symmetric (vertical OR horizontal)
 * @returns {Array} 6x6 grid with either vertical or horizontal symmetry
 */
export function anySymmetry() {
    return Math.random() < 0.5 ? verticalSymmetry() : horizontalSymmetry();
}

/**
 * 38. All blacks in one half (top/bottom OR left/right)
 * @returns {Array} 6x6 grid with all blacks in one half
 */
export function allInOneHalf() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));
    const count = randomInt(3, 15);

    const halfType = randomInt(0, 3); // 0=top, 1=bottom, 2=left, 3=right

    for (let i = 0; i < count; i++) {
        let r, c;
        if (halfType === 0) { // top half
            r = randomInt(0, 2);
            c = randomInt(0, 5);
        } else if (halfType === 1) { // bottom half
            r = randomInt(3, 5);
            c = randomInt(0, 5);
        } else if (halfType === 2) { // left half
            r = randomInt(0, 5);
            c = randomInt(0, 2);
        } else { // right half
            r = randomInt(0, 5);
            c = randomInt(3, 5);
        }
        grid[r][c] = true;
    }

    return grid;
}

/**
 * 39. Has a 2x2 black square somewhere
 * @returns {Array} 6x6 grid with 2x2 square plus many extra cells
 */
export function has2x2BlackSquare() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    // Place 2x2 square
    const startR = randomInt(0, 4);
    const startC = randomInt(0, 4);

    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            grid[startR + i][startC + j] = true;
        }
    }

    // Add many more cells to hide the 2x2 square
    const extraCount = randomInt(12, 24);
    for (let i = 0; i < extraCount; i++) {
        grid[randomInt(0, 5)][randomInt(0, 5)] = true;
    }

    return grid;
}

/**
 * 40. All blacks fit in some 3x3 subgrid
 * @returns {Array} 6x6 grid where all blacks are within a 3x3 window
 */
export function fitsIn3x3() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    // Choose random 3x3 window
    const startR = randomInt(0, 3);
    const startC = randomInt(0, 3);

    const count = randomInt(3, 9);
    for (let i = 0; i < count; i++) {
        const r = startR + randomInt(0, 2);
        const c = startC + randomInt(0, 2);
        grid[r][c] = true;
    }

    return grid;
}

/**
 * 40b. All blacks fit in some 4x4 subgrid
 * @returns {Array} 6x6 grid where all blacks fit in some 4x4 window
 */
export function fitsIn4x4() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    // Choose random 4x4 window
    const startR = randomInt(0, 2);
    const startC = randomInt(0, 2);

    const count = randomInt(4, 16);
    for (let i = 0; i < count; i++) {
        const r = startR + randomInt(0, 3);
        const c = startC + randomInt(0, 3);
        grid[r][c] = true;
    }

    return grid;
}

/**
 * 41. Border only (all blacks on edges)
 * @returns {Array} 6x6 grid with blacks only on border
 */
export function borderOnly() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    const count = randomInt(4, 16);
    const borderCells = [];

    // Collect all border cells
    for (let i = 0; i < 6; i++) {
        borderCells.push([0, i]); // top row
        borderCells.push([5, i]); // bottom row
        borderCells.push([i, 0]); // left column
        borderCells.push([i, 5]); // right column
    }

    // Remove duplicates (corners) and shuffle
    const uniqueBorder = Array.from(new Set(borderCells.map(c => `${c[0]},${c[1]}`)))
        .map(s => s.split(',').map(Number));
    shuffle(uniqueBorder);

    for (let i = 0; i < Math.min(count, uniqueBorder.length); i++) {
        const [r, c] = uniqueBorder[i];
        grid[r][c] = true;
    }

    return grid;
}

/**
 * 42. Checkerboard positions only (row+col even)
 * @returns {Array} 6x6 grid with blacks on checkerboard positions
 */
export function checkerboardPositions() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    const validPositions = [];
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
            if ((i + j) % 2 === 0) {
                validPositions.push([i, j]);
            }
        }
    }

    const count = randomInt(3, 12);
    shuffle(validPositions);

    for (let i = 0; i < Math.min(count, validPositions.length); i++) {
        const [r, c] = validPositions[i];
        grid[r][c] = true;
    }

    return grid;
}

/**
 * 43. Has cell with 4 neighbors (all 4 orthogonal directions filled)
 * @returns {Array} 6x6 grid where at least one cell has all 4 neighbors black
 */
export function hasCellWith4Neighbors() {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(false));

    // Place a plus shape (5 cells) - center has 4 neighbors
    const centerR = randomInt(1, 4);
    const centerC = randomInt(1, 4);

    grid[centerR][centerC] = true;
    grid[centerR - 1][centerC] = true;
    grid[centerR + 1][centerC] = true;
    grid[centerR][centerC - 1] = true;
    grid[centerR][centerC + 1] = true;

    // Add many more cells (10-20) to hide the pattern
    const extraCount = randomInt(10, 20);
    for (let i = 0; i < extraCount; i++) {
        grid[randomInt(0, 5)][randomInt(0, 5)] = true;
    }

    return grid;
}

/**
 * Helper: Sample from weighted distribution
 * @param {Array} distributions - Array of {weight, generator} objects
 * @returns {Array} Generated 6x6 grid
 */
export function sampleFromDistribution(distributions) {
    const totalWeight = distributions.reduce((sum, d) => sum + d.weight, 0);
    let random = Math.random() * totalWeight;

    for (const dist of distributions) {
        random -= dist.weight;
        if (random <= 0) {
            return dist.generator();
        }
    }

    // Fallback
    return distributions[distributions.length - 1].generator();
}

/**
 * BASELINE DISTRIBUTION: Rich, diverse mixture used as foundation for negative examples
 * This is rule-agnostic and prevents side-channel information leakage
 *
 * Philosophy: Include a wide range of cell counts, structural patterns, and edge cases
 * to make it harder to guess the rule from what's missing in negatives.
 */
const BASELINE_DISTRIBUTION_RAW = [
    // Low cell counts (15%) - reduced from 35%
    { type: 'withBlackCount', weight: 0.02, options: { count: 0 } },
    { type: 'withBlackCount', weight: 0.02, options: { count: 1 } },
    { type: 'withBlackCount', weight: 0.02, options: { count: 2 } },
    { type: 'withBlackCount', weight: 0.02, options: { count: 3 } },
    { type: 'withBlackCount', weight: 0.02, options: { count: 4 } },
    { type: 'withBlackCount', weight: 0.02, options: { count: 5 } },
    { type: 'withBlackCount', weight: 0.03, options: { count: 6 } },

    // Medium cell counts (10%)
    { type: 'withBlackCount', weight: 0.02, options: { count: 7 } },
    { type: 'withBlackCount', weight: 0.02, options: { count: 8 } },
    { type: 'withBlackCount', weight: 0.02, options: { count: 10 } },
    { type: 'withBlackCount', weight: 0.02, options: { count: 12 } },
    { type: 'withBlackCount', weight: 0.02, options: { count: 15 } },

    // High cell counts (10%) - NEW, balances the low counts
    { type: 'withBlackCount', weight: 0.02, options: { count: 18 } },
    { type: 'withBlackCount', weight: 0.02, options: { count: 20 } },
    { type: 'withBlackCount', weight: 0.02, options: { count: 22 } },
    { type: 'withBlackCount', weight: 0.02, options: { count: 25 } },
    { type: 'withBlackCount', weight: 0.02, options: { count: 28 } },

    // Uniform random (5%) - reduced from 8%
    { type: 'uniformRandom', weight: 0.05 },

    // Connected patterns (8%) - some sparse, some dense
    { type: 'connectedBlobs', weight: 0.04 },
    { type: 'denseConnectedBlob', weight: 0.04 },

    // Structured patterns (20%)
    { type: 'blockResolution', weight: 0.05, options: { blockSize: 2 } },
    { type: 'onePerRowAndColumn', weight: 0.05 },
    { type: 'tiled3x3', weight: 0.05 },
    { type: 'noIsolatedBlacks', weight: 0.05 },

    // Symmetry patterns (15%)
    { type: 'verticalSymmetry', weight: 0.075 },
    { type: 'horizontalSymmetry', weight: 0.075 },

    // Special patterns (7%)
    { type: 'has3x3BlackSquare', weight: 0.02 },
    { type: 'nonDecreasingRows', weight: 0.015 },
    { type: 'hasCellWith4Neighbors', weight: 0.015 },
    { type: 'diagonalPattern', weight: 0.01 },
    { type: 'borderPattern', weight: 0.005 },
    { type: 'checkerboardPattern', weight: 0.005 },

    // Near-miss patterns (10%) - patterns that almost satisfy common rules
    { type: 'almostOnePerRowColumn', weight: 0.015 },
    { type: 'disconnectedBlobs', weight: 0.015 },
    { type: 'almostSymmetric', weight: 0.01 },
    { type: 'almostBlockResolution', weight: 0.01 },
    { type: 'fewIsolatedBlacks', weight: 0.015 },
    { type: 'almostTiled', weight: 0.01 },
    { type: 'almost3x3Square', weight: 0.01 },
    { type: 'almostNonDecreasing', weight: 0.01 },
    { type: 'max3Neighbors', weight: 0.01 },

    // Additional rich patterns (10%) - more structural diversity
    { type: 'leftRightEqual', weight: 0.02 },
    { type: 'evenSumCoordinates', weight: 0.02 },
    { type: 'fullySymmetric', weight: 0.015 },
    { type: 'downwardRightCascade', weight: 0.015 },
    { type: 'upwardCascade', weight: 0.015 },
    { type: 'pathPattern', weight: 0.015 },

    // High-density patterns (12%) - NEW, ensures grids can be very full
    { type: 'highDensityRandom', weight: 0.03 },
    { type: 'invertedPattern', weight: 0.025 },
    { type: 'multipleLargeBlobs', weight: 0.025 },
    { type: 'denseStripedPattern', weight: 0.02 },
    { type: 'highCellCount', weight: 0.02 }
];

// Normalize weights to sum to exactly 1.0
const totalWeight = BASELINE_DISTRIBUTION_RAW.reduce((sum, d) => sum + d.weight, 0);
export const BASELINE_DISTRIBUTION = BASELINE_DISTRIBUTION_RAW.map(d => ({
    ...d,
    weight: d.weight / totalWeight
}));

/**
 * All generators available for export
 */
export const GridDistributions = {
    uniformRandom,
    withBlackCount,
    connectedBlobs,
    blockResolution,
    onePerRowAndColumn,
    verticalSymmetry,
    horizontalSymmetry,
    tiled3x3,
    noIsolatedBlacks,
    has3x3BlackSquare,
    nonDecreasingRows,
    hasCellWith4Neighbors,
    diagonalPattern,
    borderPattern,
    checkerboardPattern,
    almostOnePerRowColumn,
    disconnectedBlobs,
    almostSymmetric,
    almostBlockResolution,
    fewIsolatedBlacks,
    almostTiled,
    almost3x3Square,
    almostNonDecreasing,
    max3Neighbors,
    leftRightEqual,
    evenSumCoordinates,
    fullySymmetric,
    downwardRightCascade,
    upwardCascade,
    pathPattern,
    highDensityRandom,
    invertedPattern,
    denseConnectedBlob,
    multipleLargeBlobs,
    denseStripedPattern,
    highCellCount,
    anySymmetry,
    allInOneHalf,
    has2x2BlackSquare,
    fitsIn3x3,
    borderOnly,
    checkerboardPositions,
    sampleFromDistribution,
    BASELINE_DISTRIBUTION
};
