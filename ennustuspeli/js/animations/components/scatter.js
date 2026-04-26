/**
 * Reusable Scatter Plot Component
 *
 * For correlation/regression visualization.
 * Supports regression lines, highlighting, and multiple series.
 */

class ScatterComponent {
    constructor(config = {}) {
        this.points = [];  // Array of {x, y, color?, highlighted?}
        this.xMin = config.xMin || null;
        this.xMax = config.xMax || null;
        this.yMin = config.yMin || null;
        this.yMax = config.yMax || null;
        this.xLabel = config.xLabel || 'X';
        this.yLabel = config.yLabel || 'Y';
        this.pointColor = config.pointColor || '#3498db';
        this.highlightColor = config.highlightColor || '#e74c3c';
        this.backgroundColor = config.backgroundColor || '#f8f8f8';
        this.borderColor = config.borderColor || '#ddd';
        this.pointSize = config.pointSize || 6;
        this.showRegressionLine = config.showRegressionLine || false;
        this.showCorrelation = config.showCorrelation || false;
        this.selectionThreshold = config.selectionThreshold || null;  // x value for selection
        this.showDiagonalLine = config.showDiagonalLine || false;
        this.title = config.title || '';
    }

    /**
     * Set all points at once
     */
    setPoints(points) {
        this.points = points.map(p => ({
            x: p.x,
            y: p.y,
            color: p.color || this.pointColor,
            highlighted: p.highlighted || false
        }));
        this.computeBounds();
    }

    /**
     * Add a single point
     */
    addPoint(x, y, color = null, highlighted = false) {
        this.points.push({ x, y, color: color || this.pointColor, highlighted });
        this.computeBounds();
    }

    /**
     * Clear all points
     */
    clear() {
        this.points = [];
    }

    /**
     * Compute bounds if not specified
     */
    computeBounds() {
        if (this.points.length === 0) return;

        const xs = this.points.map(p => p.x);
        const ys = this.points.map(p => p.y);

        if (this.xMin === null) this._xMin = Math.min(...xs);
        if (this.xMax === null) this._xMax = Math.max(...xs);
        if (this.yMin === null) this._yMin = Math.min(...ys);
        if (this.yMax === null) this._yMax = Math.max(...ys);

        // Add some padding
        const xRange = (this.xMax || this._xMax) - (this.xMin || this._xMin);
        const yRange = (this.yMax || this._yMax) - (this.yMin || this._yMin);
        this._xMin = (this.xMin !== null ? this.xMin : this._xMin - xRange * 0.05);
        this._xMax = (this.xMax !== null ? this.xMax : this._xMax + xRange * 0.05);
        this._yMin = (this.yMin !== null ? this.yMin : this._yMin - yRange * 0.05);
        this._yMax = (this.yMax !== null ? this.yMax : this._yMax + yRange * 0.05);
    }

    /**
     * Compute linear regression
     */
    computeRegression() {
        if (this.points.length < 2) return null;

        const n = this.points.length;
        const xs = this.points.map(p => p.x);
        const ys = this.points.map(p => p.y);

        const meanX = xs.reduce((a, b) => a + b, 0) / n;
        const meanY = ys.reduce((a, b) => a + b, 0) / n;

        let numerator = 0;
        let denominator = 0;
        for (let i = 0; i < n; i++) {
            numerator += (xs[i] - meanX) * (ys[i] - meanY);
            denominator += (xs[i] - meanX) ** 2;
        }

        const slope = denominator !== 0 ? numerator / denominator : 0;
        const intercept = meanY - slope * meanX;

        return { slope, intercept, meanX, meanY };
    }

    /**
     * Compute correlation coefficient
     */
    computeCorrelation() {
        if (this.points.length < 2) return 0;

        const n = this.points.length;
        const xs = this.points.map(p => p.x);
        const ys = this.points.map(p => p.y);

        const meanX = xs.reduce((a, b) => a + b, 0) / n;
        const meanY = ys.reduce((a, b) => a + b, 0) / n;

        let cov = 0, varX = 0, varY = 0;
        for (let i = 0; i < n; i++) {
            cov += (xs[i] - meanX) * (ys[i] - meanY);
            varX += (xs[i] - meanX) ** 2;
            varY += (ys[i] - meanY) ** 2;
        }

        if (varX === 0 || varY === 0) return 0;
        return cov / Math.sqrt(varX * varY);
    }

    /**
     * Get statistics
     */
    getStats() {
        const correlation = this.computeCorrelation();
        const regression = this.computeRegression();
        return {
            correlation,
            rSquared: correlation ** 2,
            slope: regression?.slope || 0,
            intercept: regression?.intercept || 0,
            count: this.points.length
        };
    }

    /**
     * Draw the scatter plot
     */
    draw(ctx, x, y, width, height) {
        const padding = { top: 35, bottom: 45, left: 55, right: 20 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        const plotX = x + padding.left;
        const plotY = y + padding.top;

        // Background
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(plotX, plotY, plotWidth, plotHeight);
        ctx.strokeStyle = this.borderColor;
        ctx.strokeRect(plotX, plotY, plotWidth, plotHeight);

        // Title
        if (this.title) {
            ctx.fillStyle = '#333';
            ctx.font = 'bold 12px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(this.title, x + width / 2, y + 16);
        }

        if (this.points.length === 0) {
            ctx.fillStyle = '#999';
            ctx.font = '12px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('Ei dataa', x + width / 2, y + height / 2);
            return;
        }

        this.computeBounds();
        const xRange = this._xMax - this._xMin || 1;
        const yRange = this._yMax - this._yMin || 1;

        // Helper to convert data coords to screen coords
        const toScreenX = (dataX) => plotX + ((dataX - this._xMin) / xRange) * plotWidth;
        const toScreenY = (dataY) => plotY + plotHeight - ((dataY - this._yMin) / yRange) * plotHeight;

        // Grid lines
        ctx.strokeStyle = '#eee';
        ctx.lineWidth = 1;
        for (let i = 1; i < 5; i++) {
            const gx = plotX + (i / 5) * plotWidth;
            const gy = plotY + (i / 5) * plotHeight;
            ctx.beginPath();
            ctx.moveTo(gx, plotY);
            ctx.lineTo(gx, plotY + plotHeight);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(plotX, gy);
            ctx.lineTo(plotX + plotWidth, gy);
            ctx.stroke();
        }

        // Diagonal line (y = x)
        if (this.showDiagonalLine) {
            ctx.strokeStyle = '#ccc';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(toScreenX(this._xMin), toScreenY(this._xMin));
            ctx.lineTo(toScreenX(this._xMax), toScreenY(this._xMax));
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Selection threshold line
        if (this.selectionThreshold !== null) {
            const threshX = toScreenX(this.selectionThreshold);
            ctx.strokeStyle = this.highlightColor;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.moveTo(threshX, plotY);
            ctx.lineTo(threshX, plotY + plotHeight);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.lineWidth = 1;
        }

        // Regression line
        if (this.showRegressionLine) {
            const reg = this.computeRegression();
            if (reg) {
                const y1 = reg.slope * this._xMin + reg.intercept;
                const y2 = reg.slope * this._xMax + reg.intercept;

                ctx.strokeStyle = '#e74c3c';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(toScreenX(this._xMin), toScreenY(y1));
                ctx.lineTo(toScreenX(this._xMax), toScreenY(y2));
                ctx.stroke();
                ctx.lineWidth = 1;
            }
        }

        // Draw points
        this.points.forEach(point => {
            const px = toScreenX(point.x);
            const py = toScreenY(point.y);

            // Check if point is in selected region
            const isSelected = this.selectionThreshold !== null && point.x >= this.selectionThreshold;

            ctx.fillStyle = point.highlighted || isSelected ? this.highlightColor : point.color;
            ctx.globalAlpha = point.highlighted || isSelected ? 1 : 0.7;
            ctx.beginPath();
            ctx.arc(px, py, this.pointSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        });

        // Axis labels
        ctx.fillStyle = '#666';
        ctx.font = '11px system-ui';

        // X-axis
        ctx.textAlign = 'center';
        ctx.fillText(this.xLabel, x + width / 2, y + height - 5);

        // X-axis tick labels
        ctx.font = '10px system-ui';
        ctx.fillText(this._xMin.toFixed(0), plotX, plotY + plotHeight + 15);
        ctx.fillText(this._xMax.toFixed(0), plotX + plotWidth, plotY + plotHeight + 15);

        // Y-axis
        ctx.save();
        ctx.translate(x + 12, y + height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.font = '11px system-ui';
        ctx.fillText(this.yLabel, 0, 0);
        ctx.restore();

        // Y-axis tick labels
        ctx.font = '10px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText(this._yMax.toFixed(0), plotX - 5, plotY + 10);
        ctx.fillText(this._yMin.toFixed(0), plotX - 5, plotY + plotHeight);

        // Correlation display
        if (this.showCorrelation && this.points.length > 1) {
            const r = this.computeCorrelation();
            ctx.fillStyle = '#333';
            ctx.font = '11px system-ui';
            ctx.textAlign = 'left';
            ctx.fillText(`r = ${r.toFixed(3)}`, plotX + 5, plotY + 15);
        }

        // Count display
        ctx.fillStyle = '#999';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText(`n=${this.points.length}`, plotX + plotWidth - 5, plotY + 15);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScatterComponent;
}
