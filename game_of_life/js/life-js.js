/**
 * Pure JavaScript Game of Life Implementation
 * Uses flat Uint8Array for GPU-friendly data structure
 */

export class LifeJS {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.size = width * height;

        // Double buffer - current and next state
        this.current = new Uint8Array(this.size);
        this.next = new Uint8Array(this.size);

        this.timestep = 0;
    }

    /**
     * Initialize with random state
     * @param {number} density - Probability of cell being alive (0-1)
     */
    randomize(density = 0.3) {
        for (let i = 0; i < this.size; i++) {
            this.current[i] = Math.random() < density ? 1 : 0;
        }
        this.timestep = 0;
    }

    /**
     * Get cell index from coordinates (with wrapping)
     */
    index(x, y) {
        // Wrap around edges (toroidal)
        x = ((x % this.width) + this.width) % this.width;
        y = ((y % this.height) + this.height) % this.height;
        return y * this.width + x;
    }

    /**
     * Count live neighbors for cell at (x, y)
     */
    countNeighbors(x, y) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                count += this.current[this.index(x + dx, y + dy)];
            }
        }
        return count;
    }

    /**
     * Advance simulation by one timestep
     */
    step() {
        const w = this.width;
        const h = this.height;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = y * w + x;
                const neighbors = this.countNeighbors(x, y);
                const alive = this.current[i];

                // Conway's rules:
                // - Live cell with 2 or 3 neighbors survives
                // - Dead cell with exactly 3 neighbors becomes alive
                // - All other cells die or stay dead
                if (alive) {
                    this.next[i] = (neighbors === 2 || neighbors === 3) ? 1 : 0;
                } else {
                    this.next[i] = (neighbors === 3) ? 1 : 0;
                }
            }
        }

        // Swap buffers
        [this.current, this.next] = [this.next, this.current];
        this.timestep++;
    }

    /**
     * Run multiple steps without rendering
     * @returns {number} Time taken in milliseconds
     */
    runSteps(n) {
        const start = performance.now();
        for (let i = 0; i < n; i++) {
            this.step();
        }
        return performance.now() - start;
    }

    /**
     * Count live cells
     */
    countLive() {
        let count = 0;
        for (let i = 0; i < this.size; i++) {
            count += this.current[i];
        }
        return count;
    }

    /**
     * Get current state for rendering
     */
    getState() {
        return this.current;
    }
}
