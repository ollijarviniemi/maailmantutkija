/**
 * Triangular Lattice Coordinate System
 *
 * Pegs are arranged in a triangular pattern:
 * - Row 0: 1 peg (the apex)
 * - Row 1: 2 pegs
 * - Row 2: 3 pegs
 * - etc.
 *
 * Coordinate system: (row, col) where col ranges from 0 to row
 *
 * Walls connect adjacent pegs. Each peg (except bottom row) has up to 2 walls
 * going down-left and down-right to the next row.
 */

class TriangularLattice {
    constructor(numRows, cellSize = 60) {
        this.numRows = numRows;
        this.cellSize = cellSize;

        // Walls are stored as a Set of strings "row,col,direction"
        // direction is 'left' or 'right' (going downward)
        this.walls = new Set();

        // Calculate dimensions
        this.width = (numRows) * cellSize;
        this.height = (numRows) * cellSize * Math.sqrt(3) / 2;
    }

    /**
     * Get pixel position of a peg
     * @param {number} row - Row index (0 = top)
     * @param {number} col - Column index within row (0 to row)
     * @returns {{x: number, y: number}} Pixel coordinates
     */
    getPegPosition(row, col) {
        // Vertical spacing between rows
        const rowHeight = this.cellSize * Math.sqrt(3) / 2;

        // Horizontal offset: center the row, then offset by col
        const rowWidth = row * this.cellSize;
        const startX = (this.width - rowWidth) / 2;

        return {
            x: startX + col * this.cellSize,
            y: row * rowHeight + this.cellSize / 2  // Add margin at top
        };
    }

    /**
     * Get the wall segment endpoints
     * @param {number} row - Row of the upper peg
     * @param {number} col - Column of the upper peg
     * @param {string} direction - 'left' or 'right'
     * @returns {{start: {x, y}, end: {x, y}}} Wall endpoints
     */
    getWallEndpoints(row, col, direction) {
        const start = this.getPegPosition(row, col);
        const endRow = row + 1;
        const endCol = direction === 'left' ? col : col + 1;
        const end = this.getPegPosition(endRow, endCol);
        return { start, end };
    }

    /**
     * Check if a wall exists
     */
    hasWall(row, col, direction) {
        return this.walls.has(`${row},${col},${direction}`);
    }

    /**
     * Toggle a wall on/off
     */
    toggleWall(row, col, direction) {
        const key = `${row},${col},${direction}`;
        if (this.walls.has(key)) {
            this.walls.delete(key);
        } else {
            this.walls.add(key);
        }
    }

    /**
     * Set a wall
     */
    setWall(row, col, direction, enabled) {
        const key = `${row},${col},${direction}`;
        if (enabled) {
            this.walls.add(key);
        } else {
            this.walls.delete(key);
        }
    }

    /**
     * Get all valid wall positions
     * @returns {Array<{row, col, direction}>}
     */
    getAllWallPositions() {
        const positions = [];
        for (let row = 0; row < this.numRows - 1; row++) {
            for (let col = 0; col <= row; col++) {
                positions.push({ row, col, direction: 'left' });
                positions.push({ row, col, direction: 'right' });
            }
        }
        return positions;
    }

    /**
     * Get the number of bins (endpoints at the bottom)
     */
    getNumBins() {
        return this.numRows;
    }

    /**
     * Get pixel position of a bin (bottom endpoint)
     * @param {number} binIndex - 0 to numRows-1
     */
    getBinPosition(binIndex) {
        return this.getPegPosition(this.numRows - 1, binIndex);
    }

    /**
     * Find the nearest wall segment to a point
     * @param {number} x - Mouse x coordinate
     * @param {number} y - Mouse y coordinate
     * @param {number} threshold - Maximum distance to consider
     * @returns {{row, col, direction, distance}|null}
     */
    findNearestWall(x, y, threshold = 20) {
        let nearest = null;
        let minDist = threshold;

        for (let row = 0; row < this.numRows - 1; row++) {
            for (let col = 0; col <= row; col++) {
                for (const direction of ['left', 'right']) {
                    const { start, end } = this.getWallEndpoints(row, col, direction);
                    const dist = this.pointToSegmentDistance(x, y, start.x, start.y, end.x, end.y);

                    if (dist < minDist) {
                        minDist = dist;
                        nearest = { row, col, direction, distance: dist };
                    }
                }
            }
        }

        return nearest;
    }

    /**
     * Calculate distance from point to line segment
     */
    pointToSegmentDistance(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;

        if (lengthSquared === 0) {
            return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
        }

        let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t));

        const nearestX = x1 + t * dx;
        const nearestY = y1 + t * dy;

        return Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2);
    }

    /**
     * Export walls to JSON format
     */
    toJSON() {
        return {
            numRows: this.numRows,
            cellSize: this.cellSize,
            walls: Array.from(this.walls)
        };
    }

    /**
     * Import walls from JSON format
     */
    static fromJSON(json) {
        const lattice = new TriangularLattice(json.numRows, json.cellSize);
        lattice.walls = new Set(json.walls);
        return lattice;
    }

    /**
     * Resize the lattice (changing number of rows)
     * Keeps walls that are still valid
     */
    resize(newNumRows) {
        const oldWalls = this.walls;
        this.numRows = newNumRows;
        this.walls = new Set();

        // Re-add walls that are still valid
        for (const wallKey of oldWalls) {
            const [row, col, direction] = wallKey.split(',');
            const r = parseInt(row);
            const c = parseInt(col);

            if (r < newNumRows - 1 && c <= r) {
                this.walls.add(wallKey);
            }
        }

        // Recalculate dimensions
        this.width = (newNumRows) * this.cellSize;
        this.height = (newNumRows) * this.cellSize * Math.sqrt(3) / 2;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.TriangularLattice = TriangularLattice;
}
