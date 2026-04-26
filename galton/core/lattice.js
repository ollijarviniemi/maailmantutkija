/**
 * RectangularLattice - A symmetric grid of pegs with staggered rows
 *
 * Grid layout (symmetric, alternating row sizes):
 *   Row 0 (even):    o   o   o   o   o       (numCols pegs)
 *   Row 1 (odd):   o   o   o   o   o   o     (numCols+1 pegs, shifted left)
 *   Row 2 (even):    o   o   o   o   o       (numCols pegs)
 *   Row 3 (odd):   o   o   o   o   o   o     (numCols+1 pegs)
 *
 * Wall directions from peg (row, col):
 *   - 'right': horizontal to (row, col+1)
 *   - 'down': vertical to (row+2, col)
 *   - 'downleft': diagonal to lower-left peg
 *   - 'downright': diagonal to lower-right peg
 */
class RectangularLattice {
    constructor(numRows, numCols, cellSize = 50) {
        this.numRows = numRows;
        this.numCols = numCols;  // Number of pegs in even rows
        this.cellSize = cellSize;
        this.rowHeight = cellSize * 0.866; // sqrt(3)/2 for equilateral spacing
        this.walls = new Set();
        this.removedPegs = new Set();
    }

    // Peg management
    pegKey(row, col) {
        return `${row},${col}`;
    }

    isPegRemoved(row, col) {
        return this.removedPegs.has(this.pegKey(row, col));
    }

    togglePeg(row, col) {
        const key = this.pegKey(row, col);
        if (this.removedPegs.has(key)) {
            this.removedPegs.delete(key);
        } else {
            this.removedPegs.add(key);
        }
    }

    // Find nearest peg to a point (for click detection)
    findNearestPeg(x, y, threshold = 15) {
        let nearest = null;
        let minDist = threshold;

        for (let row = 0; row < this.numRows; row++) {
            const colCount = this.getColCount(row);
            for (let col = 0; col < colCount; col++) {
                const pos = this.getPegPosition(row, col);
                const dist = Math.hypot(x - pos.x, y - pos.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = { row, col };
                }
            }
        }
        return nearest;
    }

    // Number of pegs in a row
    getColCount(row) {
        return (row % 2 === 0) ? this.numCols : this.numCols + 1;
    }

    get width() {
        // Odd rows are wider (numCols+1 pegs, but start at 0)
        return this.numCols * this.cellSize;
    }

    get height() {
        return (this.numRows - 1) * this.rowHeight;
    }

    // Get pixel position of a peg
    getPegPosition(row, col) {
        const isOddRow = row % 2 === 1;
        // Even rows: centered, starting at cellSize/2
        // Odd rows: starting at 0 (shifted left by half cell)
        const x = isOddRow
            ? col * this.cellSize
            : col * this.cellSize + this.cellSize / 2;
        return {
            x: x,
            y: row * this.rowHeight
        };
    }

    // Check if a peg exists at given grid position
    pegExists(row, col) {
        if (row < 0 || row >= this.numRows) return false;
        if (col < 0 || col >= this.getColCount(row)) return false;
        return true;
    }

    // Get the target peg for a wall direction
    getWallTarget(row, col, direction) {
        const isOddRow = row % 2 === 1;

        switch (direction) {
            case 'right':
                return { row: row, col: col + 1 };
            case 'down':
                // Vertical down two rows (same relative position)
                return { row: row + 2, col: col };
            case 'downleft':
                if (isOddRow) {
                    // Odd to even: col-1 in even row
                    return { row: row + 1, col: col - 1 };
                } else {
                    // Even to odd: same col in odd row
                    return { row: row + 1, col: col };
                }
            case 'downright':
                if (isOddRow) {
                    // Odd to even: same col in even row
                    return { row: row + 1, col: col };
                } else {
                    // Even to odd: col+1 in odd row
                    return { row: row + 1, col: col + 1 };
                }
            default:
                return null;
        }
    }

    // Check if a wall can exist (both pegs exist)
    canHaveWall(row, col, direction) {
        if (!this.pegExists(row, col)) return false;
        const target = this.getWallTarget(row, col, direction);
        if (!target) return false;
        return this.pegExists(target.row, target.col);
    }

    // Get wall endpoints in pixel coordinates
    getWallEndpoints(row, col, direction) {
        const start = this.getPegPosition(row, col);
        const target = this.getWallTarget(row, col, direction);
        if (!target) return null;
        const end = this.getPegPosition(target.row, target.col);
        return { start, end };
    }

    // Wall key for storage
    wallKey(row, col, direction) {
        return `${row},${col},${direction}`;
    }

    hasWall(row, col, direction) {
        return this.walls.has(this.wallKey(row, col, direction));
    }

    toggleWall(row, col, direction) {
        const key = this.wallKey(row, col, direction);
        if (this.walls.has(key)) {
            this.walls.delete(key);
        } else {
            this.walls.add(key);
        }
    }

    // Find nearest wall to a point (for click detection)
    findNearestWall(x, y, threshold = 15) {
        let nearest = null;
        let minDist = threshold;

        for (let row = 0; row < this.numRows; row++) {
            const colCount = this.getColCount(row);
            for (let col = 0; col < colCount; col++) {
                for (const dir of ['right', 'down', 'downleft', 'downright']) {
                    if (!this.canHaveWall(row, col, dir)) continue;

                    const endpoints = this.getWallEndpoints(row, col, dir);
                    if (!endpoints) continue;

                    const dist = this.pointToSegmentDistance(
                        x, y,
                        endpoints.start.x, endpoints.start.y,
                        endpoints.end.x, endpoints.end.y
                    );

                    if (dist < minDist) {
                        minDist = dist;
                        nearest = { row, col, direction: dir };
                    }
                }
            }
        }
        return nearest;
    }

    pointToSegmentDistance(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSq = dx * dx + dy * dy;

        if (lengthSq === 0) return Math.hypot(px - x1, py - y1);

        let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
        t = Math.max(0, Math.min(1, t));

        const nearestX = x1 + t * dx;
        const nearestY = y1 + t * dy;

        return Math.hypot(px - nearestX, py - nearestY);
    }

    // Get all possible wall positions for rendering
    getAllPossibleWalls() {
        const walls = [];
        for (let row = 0; row < this.numRows; row++) {
            const colCount = this.getColCount(row);
            for (let col = 0; col < colCount; col++) {
                for (const dir of ['right', 'down', 'downleft', 'downright']) {
                    if (this.canHaveWall(row, col, dir)) {
                        walls.push({ row, col, direction: dir });
                    }
                }
            }
        }
        return walls;
    }

    toJSON() {
        return {
            numRows: this.numRows,
            numCols: this.numCols,
            cellSize: this.cellSize,
            walls: Array.from(this.walls),
            removedPegs: Array.from(this.removedPegs)
        };
    }

    static fromJSON(data) {
        const lattice = new RectangularLattice(data.numRows, data.numCols, data.cellSize);
        lattice.walls = new Set(data.walls);
        lattice.removedPegs = new Set(data.removedPegs || []);
        return lattice;
    }
}

// Keep old name for compatibility
const TriangularLattice = RectangularLattice;
