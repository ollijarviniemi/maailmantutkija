/**
 * Histogram Animation
 *
 * Displays a histogram that builds up as data points are added.
 * Used for visualizing distributions and comparing player predictions.
 */

class HistogramAnimation extends BaseAnimation {
    constructor(canvas, config = {}) {
        super(canvas, config);

        // Configuration
        this.range = config.range || { min: 0, max: 100 };
        this.binCount = config.binCount || 20;
        this.barColor = config.barColor || '#3498db';
        this.targetColor = config.targetColor || '#e74c3c';
        this.showTarget = config.showTarget || false;
        this.targetValue = config.targetValue || null;

        // Computed
        this.binWidth = (this.range.max - this.range.min) / this.binCount;
        this.bins = new Array(this.binCount).fill(0);
        this.targetBins = null;
        this.maxCount = 0;

        this.resetState();
    }

    resetState() {
        this.bins = new Array(this.binCount).fill(0);
        this.targetBins = null;
        this.maxCount = 0;
        this.animatedHeights = new Array(this.binCount).fill(0);
        this.collectedData = {
            values: [],
            mean: 0,
            std: 0,
            count: 0
        };
    }

    updateLayout() {
        const padding = 50;
        this.plotArea = {
            x: padding,
            y: 30,
            width: this.width - padding * 2,
            height: this.height - 80
        };
        this.barWidth = this.plotArea.width / this.binCount - 2;
    }

    /**
     * Set target distribution for comparison
     */
    setTarget(bins) {
        this.targetBins = bins;
        this.showTarget = true;
    }

    /**
     * Add a value to the histogram
     */
    addValue(value) {
        const binIndex = this.valueToBin(value);
        if (binIndex >= 0 && binIndex < this.binCount) {
            this.bins[binIndex]++;
            this.maxCount = Math.max(this.maxCount, this.bins[binIndex]);

            // Update running stats
            const n = this.collectedData.count + 1;
            const oldMean = this.collectedData.mean;
            this.collectedData.mean = oldMean + (value - oldMean) / n;
            if (n === 1) {
                this.collectedData._m2 = 0;
            } else {
                this.collectedData._m2 += (value - oldMean) * (value - this.collectedData.mean);
            }
            this.collectedData.std = n > 1 ? Math.sqrt(this.collectedData._m2 / (n - 1)) : 0;
            this.collectedData.count = n;
            this.collectedData.values.push(value);

            if (this.onDataUpdate) {
                this.onDataUpdate(this.collectedData);
            }
        }
    }

    /**
     * Add multiple values at once
     */
    addValues(values) {
        for (const v of values) {
            this.addValue(v);
        }
    }

    valueToBin(value) {
        return Math.floor((value - this.range.min) / this.binWidth);
    }

    binToValue(binIndex) {
        return this.range.min + binIndex * this.binWidth;
    }

    update(dt) {
        // Animate bar heights
        const animSpeed = 10;
        for (let i = 0; i < this.binCount; i++) {
            const target = this.maxCount > 0 ? this.bins[i] / this.maxCount : 0;
            this.animatedHeights[i] += (target - this.animatedHeights[i]) * animSpeed * dt;
        }

        if (this.onStatsUpdate) {
            this.onStatsUpdate(this.collectedData);
        }
    }

    draw() {
        super.draw();
        const ctx = this.ctx;

        this.drawAxes();
        this.drawBars();

        if (this.showTarget && this.targetValue !== null) {
            this.drawTargetLine();
        }

        this.drawStats();
    }

    drawAxes() {
        const ctx = this.ctx;
        const { x, y, width, height } = this.plotArea;

        // X axis
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y + height);
        ctx.lineTo(x + width, y + height);
        ctx.stroke();

        // X labels
        ctx.fillStyle = '#333';
        ctx.font = '12px system-ui, sans-serif';
        ctx.textAlign = 'center';

        const labelCount = 5;
        for (let i = 0; i <= labelCount; i++) {
            const t = i / labelCount;
            const value = this.range.min + t * (this.range.max - this.range.min);
            const labelX = x + t * width;

            // Tick
            ctx.beginPath();
            ctx.moveTo(labelX, y + height);
            ctx.lineTo(labelX, y + height + 5);
            ctx.stroke();

            // Label
            ctx.fillText(value.toFixed(0), labelX, y + height + 18);
        }
    }

    drawBars() {
        const ctx = this.ctx;
        const { x, y, height } = this.plotArea;

        for (let i = 0; i < this.binCount; i++) {
            const barHeight = this.animatedHeights[i] * height * 0.9;
            const barX = x + i * (this.barWidth + 2);
            const barY = y + height - barHeight;

            // Target bar (semi-transparent)
            if (this.targetBins && this.targetBins[i]) {
                const targetHeight = this.targetBins[i] * height * 0.9;
                ctx.fillStyle = this.targetColor + '40';
                ctx.fillRect(barX, y + height - targetHeight, this.barWidth, targetHeight);
            }

            // Data bar
            if (barHeight > 0) {
                ctx.fillStyle = this.barColor;
                this.drawRoundedRect(barX, barY, this.barWidth, barHeight, 2);
                ctx.fill();
            }
        }
    }

    drawTargetLine() {
        const ctx = this.ctx;
        const { x, y, width, height } = this.plotArea;

        const targetX = x + ((this.targetValue - this.range.min) / (this.range.max - this.range.min)) * width;

        ctx.strokeStyle = this.targetColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(targetX, y);
        ctx.lineTo(targetX, y + height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = this.targetColor;
        ctx.font = '12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.targetValue.toFixed(1), targetX, y - 5);
    }

    drawStats() {
        const ctx = this.ctx;
        const data = this.collectedData;

        if (data.count === 0) return;

        ctx.fillStyle = '#333';
        ctx.font = '14px system-ui, sans-serif';
        ctx.textAlign = 'left';

        ctx.fillText(`n=${data.count}`, 10, 20);
        ctx.fillText(`keskiarvo=${data.mean.toFixed(2)}`, 80, 20);
        ctx.fillText(`keskihajonta=${data.std.toFixed(2)}`, 220, 20);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HistogramAnimation;
}
