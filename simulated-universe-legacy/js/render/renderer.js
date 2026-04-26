/**
 * Canvas Renderer
 *
 * Renders the simulation grid to a canvas element.
 */

import { ParticleType, ParticleColors, ParticleNames } from '../core/particles.js';

export class Renderer {
    constructor(canvas, simulation) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.simulation = simulation;

        // Rendering settings
        this.cellSize = 8;
        this.showGrid = false;
        this.showBonds = true;
        this.showVelocities = true;

        // Colors
        this.gridColor = '#1a1a2e';
        this.bondColor = '#ffffff';
        this.velocityColor = '#00ff00';

        // Resize canvas to fit grid
        this.resize();
    }

    resize() {
        this.canvas.width = this.simulation.width * this.cellSize;
        this.canvas.height = this.simulation.height * this.cellSize;
    }

    setCellSize(size) {
        this.cellSize = size;
        this.resize();
    }

    render() {
        const ctx = this.ctx;
        const grid = this.simulation.grid;
        const size = this.cellSize;

        // Clear canvas
        ctx.fillStyle = ParticleColors[ParticleType.VOID];
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw cells
        for (let y = 0; y < grid.height; y++) {
            for (let x = 0; x < grid.width; x++) {
                const cell = grid.get(x, y);
                if (cell.type !== ParticleType.VOID) {
                    ctx.fillStyle = ParticleColors[cell.type] || '#ff00ff';
                    ctx.fillRect(x * size, y * size, size, size);
                }
            }
        }

        // Draw grid lines
        if (this.showGrid) {
            ctx.strokeStyle = this.gridColor;
            ctx.lineWidth = 0.5;
            for (let x = 0; x <= grid.width; x++) {
                ctx.beginPath();
                ctx.moveTo(x * size, 0);
                ctx.lineTo(x * size, grid.height * size);
                ctx.stroke();
            }
            for (let y = 0; y <= grid.height; y++) {
                ctx.beginPath();
                ctx.moveTo(0, y * size);
                ctx.lineTo(grid.width * size, y * size);
                ctx.stroke();
            }
        }

        // Draw bonds
        if (this.showBonds) {
            ctx.strokeStyle = this.bondColor;
            ctx.lineWidth = 2;
            const bonds = this.simulation.getBonds();
            for (const [[x1, y1], [x2, y2]] of bonds) {
                const cx1 = (x1 + 0.5) * size;
                const cy1 = (y1 + 0.5) * size;
                const cx2 = (x2 + 0.5) * size;
                const cy2 = (y2 + 0.5) * size;

                ctx.beginPath();
                ctx.moveTo(cx1, cy1);
                ctx.lineTo(cx2, cy2);
                ctx.stroke();
            }
        }

        // Draw velocity vectors
        if (this.showVelocities) {
            ctx.strokeStyle = this.velocityColor;
            ctx.lineWidth = 1;

            for (const body of this.simulation.getBodies()) {
                const center = body.getCenter();
                const cx = (center.x + 0.5) * size;
                const cy = (center.y + 0.5) * size;

                // Scale velocity for display
                const scale = 0.05;
                const vx = body.vx * scale;
                const vy = body.vy * scale;

                if (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5) {
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(cx + vx, cy + vy);
                    ctx.stroke();

                    // Arrowhead
                    const angle = Math.atan2(vy, vx);
                    const headLen = 4;
                    ctx.beginPath();
                    ctx.moveTo(cx + vx, cy + vy);
                    ctx.lineTo(
                        cx + vx - headLen * Math.cos(angle - Math.PI / 6),
                        cy + vy - headLen * Math.sin(angle - Math.PI / 6)
                    );
                    ctx.moveTo(cx + vx, cy + vy);
                    ctx.lineTo(
                        cx + vx - headLen * Math.cos(angle + Math.PI / 6),
                        cy + vy - headLen * Math.sin(angle + Math.PI / 6)
                    );
                    ctx.stroke();
                }
            }
        }
    }

    /**
     * Get cell at canvas coordinates
     */
    getCellAt(canvasX, canvasY) {
        const x = Math.floor(canvasX / this.cellSize);
        const y = Math.floor(canvasY / this.cellSize);
        return { x, y };
    }

    /**
     * Get info string for cell at position
     */
    getCellInfo(x, y) {
        const cell = this.simulation.grid.get(x, y);
        if (!cell) return 'Out of bounds';

        let info = `(${x}, ${y}) ${ParticleNames[cell.type] || 'Unknown'}`;

        if (cell.bodyId !== -1) {
            const body = this.simulation.bodyManager.getBody(cell.bodyId);
            if (body) {
                info += `\nBody #${body.id}: mass=${body.mass}`;
                info += `\nVelocity: (${body.vx}, ${body.vy})`;
            }
        }

        return info;
    }
}
