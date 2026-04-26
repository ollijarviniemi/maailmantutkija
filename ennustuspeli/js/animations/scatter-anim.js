/**
 * Scatter Animation
 *
 * Visualizes regression/correlation data with scatter plots.
 * Uses ScatterComponent for rendering.
 */

class ScatterAnimation extends BaseAnimation {
    constructor(canvas, config = {}) {
        super(canvas, config);

        // DGP parameters
        this.numPoints = config.dgp?.numPoints || 30;
        this.xMean = config.dgp?.xMean || 50;
        this.xStd = config.dgp?.xStd || 15;
        this.slope = config.dgp?.slope || 1;
        this.intercept = config.dgp?.intercept || 0;
        this.noiseStd = config.dgp?.noiseStd || 10;
        this.xLabel = config.xLabel || 'X';
        this.yLabel = config.yLabel || 'Y';

        // Selection threshold for highlighting
        this.selectionThreshold = config.selectionThreshold || null;

        // Animation speed
        this.pointsPerSecond = config.pointsPerSecond || 5;

        this.resetState();
    }

    resetState() {
        this.scatter = new ScatterComponent({
            xLabel: this.xLabel,
            yLabel: this.yLabel,
            showRegressionLine: true,
            showCorrelation: true,
            selectionThreshold: this.selectionThreshold,
            title: ''
        });

        this.allPoints = [];
        this.currentPointIndex = 0;
        this.timeSinceLastPoint = 0;

        // Pre-generate all points
        for (let i = 0; i < this.numPoints; i++) {
            const x = Distributions.sampleNormal(this.xMean, this.xStd);
            const noise = Distributions.sampleNormal(0, this.noiseStd);
            const y = this.slope * x + this.intercept + noise;
            this.allPoints.push({ x, y });
        }

        this.collectedData = {
            points: [],
            correlation: 0,
            slope: 0,
            intercept: 0,
            observedMean: { x: 0, y: 0 },
            selectedCount: 0
        };
    }

    updateLayout() {
        this.plotArea = {
            x: 20,
            y: 30,
            width: this.width - 40,
            height: this.height - 60
        };
    }

    update(dt) {
        this.timeSinceLastPoint += dt;

        while (this.timeSinceLastPoint >= 1 / this.pointsPerSecond &&
               this.currentPointIndex < this.allPoints.length) {
            this.timeSinceLastPoint -= 1 / this.pointsPerSecond;

            const point = this.allPoints[this.currentPointIndex];
            this.scatter.addPoint(point.x, point.y);
            this.currentPointIndex++;

            // Update collected data
            this.collectedData.points = [...this.scatter.points];
            const stats = this.scatter.getStats();
            this.collectedData.correlation = stats.correlation;
            this.collectedData.slope = stats.slope;
            this.collectedData.intercept = stats.intercept;

            // Calculate means
            const xs = this.scatter.points.map(p => p.x);
            const ys = this.scatter.points.map(p => p.y);
            this.collectedData.observedMean = {
                x: xs.reduce((a, b) => a + b, 0) / xs.length,
                y: ys.reduce((a, b) => a + b, 0) / ys.length
            };

            // Count selected (above threshold)
            if (this.selectionThreshold !== null) {
                this.collectedData.selectedCount = this.scatter.points.filter(
                    p => p.x >= this.selectionThreshold
                ).length;
            }

            if (this.onDataUpdate) {
                this.onDataUpdate(this.collectedData);
            }
        }

        // Stats callback
        if (this.onStatsUpdate) {
            this.onStatsUpdate({
                count: this.scatter.points.length,
                correlation: this.collectedData.correlation
            });
        }

        // Check completion
        if (this.currentPointIndex >= this.allPoints.length) {
            this.finish();
        }
    }

    draw() {
        super.draw();
        if (!this.plotArea) return;

        this.scatter.draw(this.ctx, this.plotArea.x, this.plotArea.y,
                          this.plotArea.width, this.plotArea.height);

        // Progress
        const progress = this.currentPointIndex / this.allPoints.length;
        this.drawProgressBar(20, this.height - 15, this.width - 40, 8, progress);
    }
}

// Self-register
if (typeof AnimationRegistry !== 'undefined') {
    AnimationRegistry.register('scatter', {
        class: ScatterAnimation,
        statsConfig: {
            count: { label: 'Havaintoja', initial: '0' },
            correlation: { label: 'Korrelaatio', initial: '-' }
        },
        outputs: ['points', 'correlation', 'slope', 'intercept', 'observedMean', 'selectedCount'],
        statsMapper: (stats) => ({
            count: stats.count,
            correlation: stats.correlation?.toFixed(3) || '-'
        })
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScatterAnimation;
}
