/**
 * Sales Animation
 *
 * Visualizes product sales with price/demand relationships.
 * For regression and elasticity concepts.
 */

class SalesAnimation extends BaseAnimation {
    constructor(canvas, config = {}) {
        super(canvas, config);

        // DGP parameters
        this.baseDemand = config.dgp?.baseDemand || 100;
        this.priceElasticity = config.dgp?.priceElasticity || -2;  // % change in demand / % change in price
        this.basePrice = config.dgp?.basePrice || 10;
        this.numObservations = config.dgp?.numObservations || 30;

        // Price variation
        this.priceMin = config.dgp?.priceMin || 5;
        this.priceMax = config.dgp?.priceMax || 20;

        // Noise
        this.demandNoise = config.dgp?.demandNoise || 15;

        // Animation
        this.observationsPerSecond = config.observationsPerSecond || 3;

        this.resetState();
    }

    resetState() {
        // Scatter for price vs sales
        this.scatter = new ScatterComponent({
            xLabel: 'Hinta (€)',
            yLabel: 'Myynti (kpl)',
            showRegressionLine: true,
            showCorrelation: true
        });

        // Histogram for sales
        this.histogram = new HistogramComponent({
            label: 'Myyntijakauma',
            showMean: true
        });

        this.observations = [];
        this.currentIndex = 0;
        this.timeSinceLast = 0;

        // Pre-generate data
        for (let i = 0; i < this.numObservations; i++) {
            this.observations.push(this.generateObservation());
        }

        this.collectedData = {
            observations: [],
            avgSales: 0,
            correlation: 0,
            slope: 0,
            totalRevenue: 0
        };
    }

    generateObservation() {
        // Random price in range
        const price = this.priceMin + Math.random() * (this.priceMax - this.priceMin);

        // Calculate expected demand using price elasticity
        // log(Q) = log(Q0) + elasticity * log(P/P0)
        const logDemand = Math.log(this.baseDemand) +
                          this.priceElasticity * Math.log(price / this.basePrice);
        const expectedDemand = Math.exp(logDemand);

        // Add noise
        const actualDemand = Math.max(0, Math.round(
            expectedDemand + Distributions.sampleNormal(0, this.demandNoise)
        ));

        return {
            price: Math.round(price * 100) / 100,
            demand: actualDemand,
            revenue: Math.round(price * actualDemand * 100) / 100
        };
    }

    updateLayout() {
        // Left: scatter (price vs demand)
        this.scatterArea = {
            x: 20,
            y: 40,
            width: this.width * 0.48,
            height: this.height - 80
        };

        // Right: histogram (sales distribution)
        this.histArea = {
            x: this.width * 0.52,
            y: 40,
            width: this.width * 0.45,
            height: this.height - 80
        };
    }

    update(dt) {
        this.timeSinceLast += dt;

        while (this.timeSinceLast >= 1 / this.observationsPerSecond &&
               this.currentIndex < this.observations.length) {
            this.timeSinceLast -= 1 / this.observationsPerSecond;

            const obs = this.observations[this.currentIndex];
            this.currentIndex++;

            // Add to scatter
            this.scatter.addPoint(obs.price, obs.demand);

            // Add to histogram
            this.histogram.addPoint(obs.demand);

            // Update collected data
            this.collectedData.observations.push(obs);
            this.collectedData.avgSales = this.histogram.getStats().mean;
            this.collectedData.correlation = this.scatter.computeCorrelation();
            this.collectedData.slope = this.scatter.computeRegression()?.slope || 0;
            this.collectedData.totalRevenue = this.collectedData.observations.reduce(
                (s, o) => s + o.revenue, 0
            );

            if (this.onDataUpdate) {
                this.onDataUpdate(this.collectedData);
            }
        }

        // Stats callback
        if (this.onStatsUpdate) {
            this.onStatsUpdate({
                observations: this.currentIndex,
                avgSales: this.collectedData.avgSales
            });
        }

        // Check completion
        if (this.currentIndex >= this.observations.length) {
            this.finish();
        }
    }

    draw() {
        super.draw();
        if (!this.scatterArea) return;

        const ctx = this.ctx;

        // Title
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Tuotteiden myynti', this.width / 2, 20);

        // Draw scatter plot
        this.scatter.draw(ctx, this.scatterArea.x, this.scatterArea.y,
                          this.scatterArea.width, this.scatterArea.height);

        // Draw histogram
        this.histogram.draw(ctx, this.histArea.x, this.histArea.y,
                            this.histArea.width, this.histArea.height);

        // Current observation
        if (this.currentIndex > 0) {
            const obs = this.observations[this.currentIndex - 1];
            ctx.fillStyle = '#666';
            ctx.font = '11px system-ui';
            ctx.textAlign = 'left';
            ctx.fillText(`Viimeisin: ${obs.price}€ → ${obs.demand} kpl`,
                        30, this.height - 10);
        }

        // Progress bar
        const progress = this.currentIndex / this.observations.length;
        this.drawProgressBar(this.width * 0.3, this.height - 15,
                             this.width * 0.4, 8, progress);
    }
}

// Self-register
if (typeof AnimationRegistry !== 'undefined') {
    AnimationRegistry.register('sales-chart', {
        class: SalesAnimation,
        statsConfig: {
            observations: { label: 'Havaintoja', initial: '0' },
            avgSales: { label: 'Keskimyynti', initial: '-' }
        },
        outputs: ['observations', 'avgSales', 'correlation', 'slope', 'totalRevenue'],
        statsMapper: (stats) => ({
            observations: stats.observations,
            avgSales: stats.avgSales ? stats.avgSales.toFixed(1) : '-'
        })
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SalesAnimation;
}
