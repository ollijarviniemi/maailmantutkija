/**
 * Reusable Histogram Component
 *
 * A visual histogram that can be embedded in any animation.
 * Automatically bins data and renders bars with optional styling.
 */

class HistogramComponent {
    constructor(config = {}) {
        this.data = [];
        this.bins = [];
        this.numBins = config.numBins || 10;
        this.min = config.min || null;
        this.max = config.max || null;
        this.color = config.color || '#3498db';
        this.highlightColor = config.highlightColor || '#e74c3c';
        this.backgroundColor = config.backgroundColor || '#f8f8f8';
        this.borderColor = config.borderColor || '#ddd';
        this.showLabels = config.showLabels !== false;
        this.showMean = config.showMean || false;
        this.showStd = config.showStd || false;
        this.highlightThreshold = config.highlightThreshold || null;
        this.label = config.label || '';
        this.unit = config.unit || '';
    }

    /**
     * Set/update the data
     */
    setData(data) {
        this.data = [...data].filter(x => isFinite(x));
        this.computeBins();
    }

    /**
     * Add a single data point
     */
    addPoint(value) {
        if (isFinite(value)) {
            this.data.push(value);
            this.computeBins();
        }
    }

    /**
     * Clear all data
     */
    clear() {
        this.data = [];
        this.bins = [];
    }

    /**
     * Compute histogram bins
     */
    computeBins() {
        if (this.data.length === 0) {
            this.bins = [];
            return;
        }

        const min = this.min !== null ? this.min : Math.min(...this.data);
        const max = this.max !== null ? this.max : Math.max(...this.data);
        const range = max - min || 1;
        const binWidth = range / this.numBins;

        // Initialize bins
        this.bins = [];
        for (let i = 0; i < this.numBins; i++) {
            this.bins.push({
                start: min + i * binWidth,
                end: min + (i + 1) * binWidth,
                count: 0
            });
        }

        // Fill bins
        for (const value of this.data) {
            const binIndex = Math.min(
                Math.floor((value - min) / binWidth),
                this.numBins - 1
            );
            if (binIndex >= 0 && binIndex < this.numBins) {
                this.bins[binIndex].count++;
            }
        }

        this.binMin = min;
        this.binMax = max;
        this.binWidth = binWidth;
    }

    /**
     * Get statistics
     */
    getStats() {
        if (this.data.length === 0) return { mean: 0, std: 0, count: 0 };

        const n = this.data.length;
        const mean = this.data.reduce((a, b) => a + b, 0) / n;
        const variance = this.data.reduce((sum, x) => sum + (x - mean) ** 2, 0) / n;
        const std = Math.sqrt(variance);
        const median = this.getMedian();

        return { mean, std, variance, count: n, median };
    }

    getMedian() {
        if (this.data.length === 0) return 0;
        const sorted = [...this.data].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    /**
     * Draw the histogram
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x - Left edge x
     * @param {number} y - Top edge y
     * @param {number} width - Total width
     * @param {number} height - Total height
     */
    draw(ctx, x, y, width, height) {
        const padding = { top: 30, bottom: 40, left: 50, right: 20 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        const plotX = x + padding.left;
        const plotY = y + padding.top;

        // Background
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(plotX, plotY, plotWidth, plotHeight);
        ctx.strokeStyle = this.borderColor;
        ctx.strokeRect(plotX, plotY, plotWidth, plotHeight);

        // Title/Label
        if (this.label) {
            ctx.fillStyle = '#333';
            ctx.font = 'bold 12px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(this.label, x + width / 2, y + 16);
        }

        if (this.bins.length === 0 || this.data.length === 0) {
            ctx.fillStyle = '#999';
            ctx.font = '12px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('Ei dataa', x + width / 2, y + height / 2);
            return;
        }

        // Find max count for scaling
        const maxCount = Math.max(...this.bins.map(b => b.count), 1);
        const barWidth = plotWidth / this.bins.length;

        // Draw bars
        this.bins.forEach((bin, i) => {
            const barHeight = (bin.count / maxCount) * plotHeight;
            const barX = plotX + i * barWidth;
            const barY = plotY + plotHeight - barHeight;

            // Check if this bin should be highlighted
            const shouldHighlight = this.highlightThreshold !== null &&
                ((bin.start >= this.highlightThreshold) || (bin.end > this.highlightThreshold && bin.start < this.highlightThreshold));

            ctx.fillStyle = shouldHighlight ? this.highlightColor : this.color;
            ctx.fillRect(barX + 1, barY, barWidth - 2, barHeight);

            // Bar border
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.strokeRect(barX + 1, barY, barWidth - 2, barHeight);
        });

        // X-axis labels
        if (this.showLabels) {
            ctx.fillStyle = '#666';
            ctx.font = '10px system-ui';
            ctx.textAlign = 'center';

            // Start, middle, end labels
            const formatVal = (v) => v.toFixed(v < 10 ? 1 : 0);
            ctx.fillText(formatVal(this.binMin) + this.unit, plotX, plotY + plotHeight + 15);
            ctx.fillText(formatVal((this.binMin + this.binMax) / 2) + this.unit, plotX + plotWidth / 2, plotY + plotHeight + 15);
            ctx.fillText(formatVal(this.binMax) + this.unit, plotX + plotWidth, plotY + plotHeight + 15);
        }

        // Y-axis labels
        ctx.fillStyle = '#666';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText(maxCount.toString(), plotX - 5, plotY + 10);
        ctx.fillText('0', plotX - 5, plotY + plotHeight);

        // Draw mean line
        if (this.showMean && this.data.length > 0) {
            const stats = this.getStats();
            const meanX = plotX + ((stats.mean - this.binMin) / (this.binMax - this.binMin)) * plotWidth;

            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.moveTo(meanX, plotY);
            ctx.lineTo(meanX, plotY + plotHeight);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.lineWidth = 1;

            // Mean label
            ctx.fillStyle = '#e74c3c';
            ctx.textAlign = 'center';
            ctx.fillText(`μ=${stats.mean.toFixed(1)}`, meanX, plotY + plotHeight + 28);
        }

        // Draw std range
        if (this.showStd && this.data.length > 1) {
            const stats = this.getStats();
            const stdLeftX = plotX + ((stats.mean - stats.std - this.binMin) / (this.binMax - this.binMin)) * plotWidth;
            const stdRightX = plotX + ((stats.mean + stats.std - this.binMin) / (this.binMax - this.binMin)) * plotWidth;

            ctx.fillStyle = 'rgba(231, 76, 60, 0.1)';
            ctx.fillRect(stdLeftX, plotY, stdRightX - stdLeftX, plotHeight);
        }

        // Highlight threshold line
        if (this.highlightThreshold !== null) {
            const threshX = plotX + ((this.highlightThreshold - this.binMin) / (this.binMax - this.binMin)) * plotWidth;
            ctx.strokeStyle = this.highlightColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(threshX, plotY);
            ctx.lineTo(threshX, plotY + plotHeight);
            ctx.stroke();
            ctx.lineWidth = 1;
        }

        // Count display
        ctx.fillStyle = '#333';
        ctx.font = '11px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText(`n=${this.data.length}`, plotX + 5, plotY + 15);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HistogramComponent;
}
