/**
 * Auction Animation
 *
 * Visualizes auction bidding with item characteristics.
 * Shows how features affect final price.
 */

class AuctionAnimation extends BaseAnimation {
    constructor(canvas, config = {}) {
        super(canvas, config);

        // DGP parameters
        this.numItems = config.dgp?.numItems || 20;
        this.basePrice = config.dgp?.basePrice || 100;
        this.basePriceStd = config.dgp?.basePriceStd || 20;

        // Features that affect price
        this.features = config.dgp?.features || [
            { name: 'Ikä', coefficient: -2, mean: 10, std: 5 }
        ];

        this.numBidders = config.dgp?.numBidders || 5;
        this.reservePrice = config.dgp?.reservePrice || null;

        // Animation
        this.itemsPerSecond = config.itemsPerSecond || 2;

        this.resetState();
    }

    resetState() {
        // Scatter plot for price vs main feature
        this.scatter = new ScatterComponent({
            xLabel: this.features[0]?.name || 'Ominaisuus',
            yLabel: 'Hinta (€)',
            showRegressionLine: true,
            showCorrelation: true
        });

        // Histogram for prices
        this.histogram = new HistogramComponent({
            label: 'Hintajakauma',
            showMean: true,
            highlightThreshold: this.reservePrice
        });

        this.items = [];
        this.currentItemIndex = 0;
        this.timeSinceLast = 0;

        // Pre-generate all items
        for (let i = 0; i < this.numItems; i++) {
            this.items.push(this.generateItem());
        }

        this.collectedData = {
            items: [],
            prices: [],
            observedMean: 0,
            correlation: 0,
            soldCount: 0
        };
    }

    generateItem() {
        // Generate feature values
        const featureValues = {};
        let price = Distributions.sampleLognormal(
            Math.log(this.basePrice),
            this.basePriceStd / this.basePrice
        );

        for (const feature of this.features) {
            const value = Distributions.sampleNormal(feature.mean, feature.std);
            featureValues[feature.name] = value;
            price += feature.coefficient * value;
        }

        // Add noise and ensure positive
        price = Math.max(10, price + Distributions.sampleNormal(0, 10));

        // Simulate bidding (order statistic effect)
        const bids = [];
        for (let b = 0; b < this.numBidders; b++) {
            const bidderValue = price * (0.8 + Math.random() * 0.4);
            bids.push(bidderValue);
        }
        bids.sort((a, b) => b - a);

        // Second-price auction: winner pays second-highest bid
        const finalPrice = bids.length > 1 ? bids[1] : bids[0];
        const sold = this.reservePrice === null || finalPrice >= this.reservePrice;

        return {
            features: featureValues,
            baseValue: price,
            bids,
            finalPrice: sold ? Math.round(finalPrice) : null,
            sold
        };
    }

    updateLayout() {
        // Left: scatter plot
        this.scatterArea = {
            x: 20,
            y: 40,
            width: this.width * 0.48,
            height: this.height - 80
        };

        // Right: histogram
        this.histArea = {
            x: this.width * 0.52,
            y: 40,
            width: this.width * 0.45,
            height: this.height - 80
        };
    }

    update(dt) {
        this.timeSinceLast += dt;

        while (this.timeSinceLast >= 1 / this.itemsPerSecond &&
               this.currentItemIndex < this.items.length) {
            this.timeSinceLast -= 1 / this.itemsPerSecond;

            const item = this.items[this.currentItemIndex];
            this.currentItemIndex++;

            if (item.sold) {
                // Add to scatter (main feature vs price)
                const mainFeature = this.features[0];
                if (mainFeature) {
                    const x = item.features[mainFeature.name];
                    this.scatter.addPoint(x, item.finalPrice);
                }

                // Add to histogram
                this.histogram.addPoint(item.finalPrice);

                this.collectedData.soldCount++;
            }

            // Update collected data
            this.collectedData.items.push(item);
            this.collectedData.prices = this.histogram.data;
            this.collectedData.observedMean = this.histogram.getStats().mean;
            this.collectedData.correlation = this.scatter.computeCorrelation();

            if (this.onDataUpdate) {
                this.onDataUpdate(this.collectedData);
            }
        }

        // Stats callback
        if (this.onStatsUpdate) {
            this.onStatsUpdate({
                items: this.currentItemIndex,
                avgPrice: this.collectedData.observedMean
            });
        }

        // Check completion
        if (this.currentItemIndex >= this.items.length) {
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
        ctx.fillText('Huutokauppa', this.width / 2, 20);

        // Draw scatter plot
        this.scatter.draw(ctx, this.scatterArea.x, this.scatterArea.y,
                          this.scatterArea.width, this.scatterArea.height);

        // Draw histogram
        this.histogram.draw(ctx, this.histArea.x, this.histArea.y,
                            this.histArea.width, this.histArea.height);

        // Current item indicator
        if (this.currentItemIndex > 0 && this.currentItemIndex <= this.items.length) {
            const item = this.items[this.currentItemIndex - 1];
            ctx.fillStyle = '#666';
            ctx.font = '11px system-ui';
            ctx.textAlign = 'left';
            const statusText = item.sold ?
                `Viimeisin: ${item.finalPrice}€` :
                'Viimeisin: ei myyty';
            ctx.fillText(statusText, 30, this.height - 10);
        }

        // Progress bar
        const progress = this.currentItemIndex / this.items.length;
        this.drawProgressBar(this.width * 0.3, this.height - 15,
                             this.width * 0.4, 8, progress);
    }
}

// Self-register
if (typeof AnimationRegistry !== 'undefined') {
    AnimationRegistry.register('auction', {
        class: AuctionAnimation,
        statsConfig: {
            items: { label: 'Kohteita', initial: '0' },
            avgPrice: { label: 'Keskihinta', initial: '-' }
        },
        outputs: ['items', 'prices', 'observedMean', 'correlation', 'soldCount'],
        statsMapper: (stats) => ({
            items: stats.items,
            avgPrice: stats.avgPrice ? `${stats.avgPrice.toFixed(0)}€` : '-'
        })
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuctionAnimation;
}
