/**
 * Points Animation
 *
 * Displays data points appearing one by one on a number line or scatter plot.
 * Used for simpler levels where we visualize samples from a distribution.
 */

class PointsAnimation extends BaseAnimation {
    constructor(canvas, config = {}) {
        super(canvas, config);

        // Configuration
        this.mode = config.mode || 'numberline'; // 'numberline' or 'scatter'
        this.range = config.range || { min: 0, max: 100 };
        this.pointsPerSecond = config.pointsPerSecond || 5;
        this.maxPoints = config.maxPoints || 100;
        this.pointSize = config.pointSize || 8;
        this.pointColor = config.pointColor || '#3498db';
        this.showStats = config.showStats !== false;

        // Data
        this.points = [];
        this.pendingPoints = [];
        this.timeSinceLastPoint = 0;

        this.resetState();
    }

    resetState() {
        this.points = [];
        this.pendingPoints = [];
        this.timeSinceLastPoint = 0;
        this.collectedData = {
            values: [],
            mean: 0,
            std: 0,
            min: Infinity,
            max: -Infinity
        };
    }

    updateLayout() {
        const padding = 40;

        if (this.mode === 'numberline') {
            this.lineY = this.height * 0.6;
            this.lineStart = padding;
            this.lineEnd = this.width - padding;
            this.lineLength = this.lineEnd - this.lineStart;
        } else {
            // Scatter plot area
            this.plotArea = {
                x: padding,
                y: padding,
                width: this.width - padding * 2,
                height: this.height - padding * 2
            };
        }
    }

    /**
     * Add points to be animated
     * @param {number[]} values - Array of values to visualize
     */
    setData(values) {
        this.pendingPoints = [...values];
        this.points = [];
        this.collectedData.values = [];
    }

    /**
     * Add a single point immediately (for real-time updates)
     */
    addPoint(value, y = null) {
        const point = {
            value,
            y: y !== null ? y : (this.mode === 'scatter' ? Math.random() : 0),
            x: this.valueToX(value),
            opacity: 0,
            scale: 0
        };
        this.points.push(point);
        this.updateStats(value);
    }

    valueToX(value) {
        const t = (value - this.range.min) / (this.range.max - this.range.min);
        if (this.mode === 'numberline') {
            return this.lineStart + t * this.lineLength;
        } else {
            return this.plotArea.x + t * this.plotArea.width;
        }
    }

    valueToY(value) {
        if (this.mode !== 'scatter') return this.lineY;
        const t = (value - this.range.min) / (this.range.max - this.range.min);
        return this.plotArea.y + this.plotArea.height - t * this.plotArea.height;
    }

    updateStats(value) {
        this.collectedData.values.push(value);
        const n = this.collectedData.values.length;

        // Update min/max
        this.collectedData.min = Math.min(this.collectedData.min, value);
        this.collectedData.max = Math.max(this.collectedData.max, value);

        // Running mean
        const oldMean = this.collectedData.mean;
        this.collectedData.mean = oldMean + (value - oldMean) / n;

        // Running variance (Welford's algorithm)
        if (n === 1) {
            this.collectedData._m2 = 0;
        } else {
            this.collectedData._m2 += (value - oldMean) * (value - this.collectedData.mean);
        }
        this.collectedData.std = n > 1 ? Math.sqrt(this.collectedData._m2 / (n - 1)) : 0;

        // Callback
        if (this.onDataUpdate) {
            this.onDataUpdate(this.collectedData);
        }
    }

    update(dt) {
        // Add pending points at configured rate
        if (this.pendingPoints.length > 0) {
            this.timeSinceLastPoint += dt;
            const interval = 1 / this.pointsPerSecond;

            while (this.timeSinceLastPoint >= interval && this.pendingPoints.length > 0) {
                this.timeSinceLastPoint -= interval;
                const value = this.pendingPoints.shift();
                this.addPoint(value);
            }
        }

        // Animate points
        for (const point of this.points) {
            // Fade in
            if (point.opacity < 1) {
                point.opacity = Math.min(1, point.opacity + dt * 3);
            }
            // Scale in
            if (point.scale < 1) {
                point.scale = Math.min(1, point.scale + dt * 5);
            }
        }

        // Check if done
        if (this.pendingPoints.length === 0 && this.points.every(p => p.opacity >= 1)) {
            this.finish();
        }

        // Stats callback
        if (this.onStatsUpdate && this.points.length > 0) {
            this.onStatsUpdate({
                count: this.points.length,
                pending: this.pendingPoints.length,
                ...this.collectedData
            });
        }
    }

    draw() {
        super.draw();
        const ctx = this.ctx;

        if (this.mode === 'numberline') {
            this.drawNumberLine();
        } else {
            this.drawScatterPlot();
        }

        // Draw points
        for (const point of this.points) {
            const size = this.pointSize * point.scale;
            ctx.globalAlpha = point.opacity;

            if (this.mode === 'numberline') {
                // Draw point on number line with slight vertical jitter to show density
                const jitter = (Math.random() - 0.5) * 10;
                this.drawEntity(point.x, this.lineY + jitter, size, this.pointColor, 'circle');
            } else {
                this.drawEntity(point.x, this.valueToY(point.y), size, this.pointColor, 'circle');
            }
        }
        ctx.globalAlpha = 1;

        // Draw stats if enabled
        if (this.showStats && this.points.length > 0) {
            this.drawStats();
        }
    }

    drawNumberLine() {
        const ctx = this.ctx;

        // Main line
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.lineStart, this.lineY);
        ctx.lineTo(this.lineEnd, this.lineY);
        ctx.stroke();

        // Tick marks and labels
        ctx.fillStyle = '#333';
        ctx.font = '12px system-ui, sans-serif';
        ctx.textAlign = 'center';

        const tickCount = 5;
        for (let i = 0; i <= tickCount; i++) {
            const t = i / tickCount;
            const x = this.lineStart + t * this.lineLength;
            const value = this.range.min + t * (this.range.max - this.range.min);

            // Tick
            ctx.beginPath();
            ctx.moveTo(x, this.lineY - 5);
            ctx.lineTo(x, this.lineY + 5);
            ctx.stroke();

            // Label
            ctx.fillText(value.toFixed(0), x, this.lineY + 20);
        }
    }

    drawScatterPlot() {
        const ctx = this.ctx;
        const { x, y, width, height } = this.plotArea;

        // Axes
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + height);
        ctx.lineTo(x + width, y + height);
        ctx.stroke();
    }

    drawStats() {
        const ctx = this.ctx;
        const data = this.collectedData;

        ctx.fillStyle = '#333';
        ctx.font = '14px system-ui, sans-serif';
        ctx.textAlign = 'left';

        const y = 20;
        ctx.fillText(`n=${data.values.length}`, 10, y);
        ctx.fillText(`keskiarvo=${data.mean.toFixed(1)}`, 80, y);
        ctx.fillText(`keskihajonta=${data.std.toFixed(1)}`, 200, y);

        // Draw mean marker on number line
        if (this.mode === 'numberline' && data.values.length > 0) {
            const meanX = this.valueToX(data.mean);
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.moveTo(meanX, this.lineY - 25);
            ctx.lineTo(meanX - 6, this.lineY - 35);
            ctx.lineTo(meanX + 6, this.lineY - 35);
            ctx.closePath();
            ctx.fill();
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PointsAnimation;
}
