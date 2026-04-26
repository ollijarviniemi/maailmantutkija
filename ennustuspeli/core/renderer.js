/**
 * Renderer for Galton Board
 *
 * Draws the lattice, walls, pegs, balls, and histogram to a canvas.
 */

class GaltonRenderer {
    constructor(canvas, lattice) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.lattice = lattice;

        // Visual options
        this.options = {
            pegRadius: 6,
            pegColor: '#666',
            wallThickness: 4,
            wallColor: '#333',
            wallHoverColor: '#007bff',
            wallHighlightColor: '#28a745',
            ballRadius: 8,
            ballColor: '#e74c3c',
            backgroundColor: '#f8f9fa',
            gridColor: '#dee2e6',
            binColor: 'rgba(0, 123, 255, 0.2)',
            histogramColor: 'rgba(0, 123, 255, 0.6)'
        };

        // Interaction state
        this.hoveredWall = null;
    }

    /**
     * Clear and fill background
     */
    clear() {
        this.ctx.fillStyle = this.options.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Draw the complete scene
     * @param {Object} state - Current state (balls, histogram, etc.)
     */
    render(state = {}) {
        this.clear();
        this.drawBins();
        this.drawAllWallPositions();  // Draw possible wall positions (faint)
        this.drawActiveWalls();       // Draw active walls (solid)
        this.drawPegs();

        if (state.balls) {
            this.drawBalls(state.balls);
        }

        if (state.histogram) {
            this.drawHistogram(state.histogram);
        }
    }

    /**
     * Draw faint lines for all possible wall positions (editor mode)
     */
    drawAllWallPositions() {
        this.ctx.strokeStyle = this.options.gridColor;
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([4, 4]);

        for (let row = 0; row < this.lattice.numRows - 1; row++) {
            for (let col = 0; col <= row; col++) {
                for (const direction of ['left', 'right']) {
                    if (!this.lattice.hasWall(row, col, direction)) {
                        const { start, end } = this.lattice.getWallEndpoints(row, col, direction);
                        this.ctx.beginPath();
                        this.ctx.moveTo(start.x, start.y);
                        this.ctx.lineTo(end.x, end.y);
                        this.ctx.stroke();
                    }
                }
            }
        }

        this.ctx.setLineDash([]);
    }

    /**
     * Draw active walls (solid)
     */
    drawActiveWalls() {
        this.ctx.lineWidth = this.options.wallThickness;
        this.ctx.lineCap = 'round';

        for (const wallKey of this.lattice.walls) {
            const [row, col, direction] = wallKey.split(',');
            const r = parseInt(row);
            const c = parseInt(col);

            const { start, end } = this.lattice.getWallEndpoints(r, c, direction);

            // Check if this is the hovered wall
            const isHovered = this.hoveredWall &&
                this.hoveredWall.row === r &&
                this.hoveredWall.col === c &&
                this.hoveredWall.direction === direction;

            this.ctx.strokeStyle = isHovered ? this.options.wallHoverColor : this.options.wallColor;
            this.ctx.beginPath();
            this.ctx.moveTo(start.x, start.y);
            this.ctx.lineTo(end.x, end.y);
            this.ctx.stroke();
        }

        // Draw hovered wall (potential new wall) if it doesn't exist
        if (this.hoveredWall && !this.lattice.hasWall(this.hoveredWall.row, this.hoveredWall.col, this.hoveredWall.direction)) {
            const { start, end } = this.lattice.getWallEndpoints(
                this.hoveredWall.row,
                this.hoveredWall.col,
                this.hoveredWall.direction
            );

            this.ctx.strokeStyle = this.options.wallHighlightColor;
            this.ctx.globalAlpha = 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(start.x, start.y);
            this.ctx.lineTo(end.x, end.y);
            this.ctx.stroke();
            this.ctx.globalAlpha = 1.0;
        }
    }

    /**
     * Draw pegs at lattice points
     */
    drawPegs() {
        this.ctx.fillStyle = this.options.pegColor;

        for (let row = 0; row < this.lattice.numRows; row++) {
            for (let col = 0; col <= row; col++) {
                const pos = this.lattice.getPegPosition(row, col);

                this.ctx.beginPath();
                this.ctx.arc(pos.x, pos.y, this.options.pegRadius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    /**
     * Draw bin areas at the bottom
     */
    drawBins() {
        const numBins = this.lattice.getNumBins();
        const binWidth = this.lattice.cellSize * 0.8;
        const binHeight = 30;

        this.ctx.fillStyle = this.options.binColor;

        for (let i = 0; i < numBins; i++) {
            const pos = this.lattice.getBinPosition(i);

            this.ctx.fillRect(
                pos.x - binWidth / 2,
                pos.y + this.options.pegRadius,
                binWidth,
                binHeight
            );
        }
    }

    /**
     * Draw balls
     * @param {Array} balls - Array of {x, y, radius, completed}
     */
    drawBalls(balls) {
        for (const ball of balls) {
            this.ctx.fillStyle = ball.completed ? '#95a5a6' : this.options.ballColor;
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.radius || this.options.ballRadius, 0, Math.PI * 2);
            this.ctx.fill();

            // Add subtle shadow/outline
            this.ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
    }

    /**
     * Draw histogram bars showing ball distribution
     * @param {Array} histogram - Array of counts per bin
     */
    drawHistogram(histogram) {
        const maxCount = Math.max(...histogram, 1);
        const numBins = this.lattice.getNumBins();
        const binWidth = this.lattice.cellSize * 0.6;
        const maxBarHeight = 100;

        this.ctx.fillStyle = this.options.histogramColor;

        for (let i = 0; i < numBins; i++) {
            const pos = this.lattice.getBinPosition(i);
            const barHeight = (histogram[i] / maxCount) * maxBarHeight;

            this.ctx.fillRect(
                pos.x - binWidth / 2,
                pos.y + 50 - barHeight,
                binWidth,
                barHeight
            );

            // Draw count label
            if (histogram[i] > 0) {
                this.ctx.fillStyle = '#333';
                this.ctx.font = '12px sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(histogram[i].toString(), pos.x, pos.y + 65);
                this.ctx.fillStyle = this.options.histogramColor;
            }
        }
    }

    /**
     * Set hovered wall for highlighting
     */
    setHoveredWall(wall) {
        this.hoveredWall = wall;
    }

    /**
     * Update canvas size based on lattice
     */
    updateCanvasSize() {
        const padding = 50;
        this.canvas.width = this.lattice.width + padding * 2;
        this.canvas.height = this.lattice.height + padding + 100;  // Extra for histogram
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.GaltonRenderer = GaltonRenderer;
}
