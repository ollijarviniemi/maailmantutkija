/**
 * Grid Data Structure
 *
 * 2D grid of cells. Each cell has:
 * - type: ParticleType constant
 * - hidden: binary hidden state (0 or 1)
 * - bodyId: which body this cell belongs to (-1 if none)
 */

import { ParticleType } from './particles.js';

export class Grid {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.cells = this._createEmptyGrid();
    }

    _createEmptyGrid() {
        const cells = [];
        for (let y = 0; y < this.height; y++) {
            const row = [];
            for (let x = 0; x < this.width; x++) {
                row.push({
                    type: ParticleType.VOID,
                    hidden: 0,
                    bodyId: -1,
                });
            }
            cells.push(row);
        }
        return cells;
    }

    inBounds(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    get(x, y) {
        if (!this.inBounds(x, y)) return null;
        return this.cells[y][x];
    }

    set(x, y, type, hidden = 0, bodyId = -1) {
        if (!this.inBounds(x, y)) return;
        this.cells[y][x] = { type, hidden, bodyId };
    }

    setType(x, y, type) {
        if (!this.inBounds(x, y)) return;
        this.cells[y][x].type = type;
    }

    setBodyId(x, y, bodyId) {
        if (!this.inBounds(x, y)) return;
        this.cells[y][x].bodyId = bodyId;
    }

    /**
     * Clone the grid (for double-buffering)
     */
    clone() {
        const newGrid = new Grid(this.width, this.height);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.cells[y][x];
                newGrid.cells[y][x] = {
                    type: cell.type,
                    hidden: cell.hidden,
                    bodyId: cell.bodyId,
                };
            }
        }
        return newGrid;
    }

    /**
     * Copy state from another grid
     */
    copyFrom(other) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = other.cells[y][x];
                this.cells[y][x].type = cell.type;
                this.cells[y][x].hidden = cell.hidden;
                this.cells[y][x].bodyId = cell.bodyId;
            }
        }
    }

    /**
     * Check if cell is passable (not Wall)
     */
    isPassable(x, y) {
        if (!this.inBounds(x, y)) return false;
        return this.cells[y][x].type !== ParticleType.WALL;
    }

    /**
     * Check if cell is empty (Void)
     */
    isEmpty(x, y) {
        if (!this.inBounds(x, y)) return false;
        return this.cells[y][x].type === ParticleType.VOID;
    }

    /**
     * Get 3x3 neighborhood around (x, y)
     * Returns array of 9 cells in row-major order (NW, N, NE, W, C, E, SW, S, SE)
     */
    getNeighborhood(x, y) {
        const neighbors = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                neighbors.push(this.get(x + dx, y + dy));
            }
        }
        return neighbors;
    }
}
