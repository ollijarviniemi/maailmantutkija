/**
 * Scale Animation
 *
 * Shows bags being weighed on a scale, with weights displayed.
 * Used for the flour mill level.
 */

class ScaleAnimation extends BaseAnimation {
    constructor(canvas, config = {}) {
        super(canvas, config);

        // Configuration
        this.targetWeight = config.targetWeight || 1000;
        this.weightStd = config.weightStd || 20;
        this.bagCount = config.bagCount || 40;
        this.bagsPerSecond = config.bagsPerSecond || 2;

        this.resetState();
    }

    resetState() {
        this.bags = [];
        this.currentBag = null;
        this.weighedBags = [];
        this.timeSinceLastBag = 0;
        this.bagsGenerated = 0;

        // Histogram bins
        this.histogramBins = {};
        this.maxBinCount = 0;

        this.collectedData = {
            weights: [],
            observedMean: 0,
            observedStd: 0,
            count: 0
        };
    }

    updateLayout() {
        // Guard against zero dimensions
        if (!this.width || !this.height) return;

        // Scale position (center-left)
        this.scaleX = this.width * 0.25;
        this.scaleY = this.height * 0.6;
        this.scaleWidth = 120;
        this.scaleHeight = 30;
        this.platformY = this.scaleY - 60;

        // Bag drop position
        this.dropX = this.scaleX;
        this.dropStartY = 50;

        // Histogram area (right side)
        this.histX = this.width * 0.5;
        this.histY = 80;
        this.histWidth = this.width * 0.45;
        this.histHeight = this.height - 140;

        // Display position
        this.displayX = this.scaleX;
        this.displayY = this.scaleY + 50;
    }

    generateBag() {
        const weight = Distributions.sampleNormal(this.targetWeight, this.weightStd);
        return {
            weight: Math.round(weight),
            x: this.dropX,
            y: this.dropStartY,
            targetY: this.platformY - 25,
            state: 'dropping', // dropping, weighing, done
            opacity: 1,
            weighTime: 0
        };
    }

    addToHistogram(weight) {
        // Bin by 5g increments
        const bin = Math.round(weight / 5) * 5;
        this.histogramBins[bin] = (this.histogramBins[bin] || 0) + 1;
        this.maxBinCount = Math.max(this.maxBinCount, this.histogramBins[bin]);
    }

    updateStats(weight) {
        this.collectedData.weights.push(weight);
        const n = this.collectedData.weights.length;

        // Running mean (Welford's algorithm)
        const oldMean = this.collectedData.observedMean;
        this.collectedData.observedMean = oldMean + (weight - oldMean) / n;

        if (n === 1) {
            this.collectedData._m2 = 0;
        } else {
            this.collectedData._m2 += (weight - oldMean) * (weight - this.collectedData.observedMean);
        }
        this.collectedData.observedStd = n > 1 ? Math.sqrt(this.collectedData._m2 / (n - 1)) : 0;
        this.collectedData.count = n;

        if (this.onDataUpdate) {
            this.onDataUpdate(this.collectedData);
        }
    }

    update(dt) {
        // Generate new bags
        if (this.bagsGenerated < this.bagCount && !this.currentBag) {
            this.timeSinceLastBag += dt;
            if (this.timeSinceLastBag >= 1 / this.bagsPerSecond) {
                this.timeSinceLastBag = 0;
                this.currentBag = this.generateBag();
                this.bagsGenerated++;
            }
        }

        // Animate current bag
        if (this.currentBag) {
            if (this.currentBag.state === 'dropping') {
                // Drop animation
                this.currentBag.y += dt * 300;
                if (this.currentBag.y >= this.currentBag.targetY) {
                    this.currentBag.y = this.currentBag.targetY;
                    this.currentBag.state = 'weighing';
                }
            } else if (this.currentBag.state === 'weighing') {
                this.currentBag.weighTime += dt;
                if (this.currentBag.weighTime > 0.8) {
                    // Record weight and move bag off
                    this.addToHistogram(this.currentBag.weight);
                    this.updateStats(this.currentBag.weight);
                    this.currentBag.state = 'done';
                    this.weighedBags.push(this.currentBag);
                    this.currentBag = null;
                }
            }
        }

        // Animate weighed bags sliding off
        for (const bag of this.weighedBags) {
            bag.x += dt * 150;
            if (bag.x > this.width * 0.4) {
                bag.opacity -= dt * 2;
            }
        }
        this.weighedBags = this.weighedBags.filter(b => b.opacity > 0);

        // Update stats display
        if (this.onStatsUpdate) {
            this.onStatsUpdate({
                count: this.collectedData.count,
                mean: this.collectedData.observedMean,
                std: this.collectedData.observedStd
            });
        }

        // Check if done
        if (this.bagsGenerated >= this.bagCount && !this.currentBag && this.weighedBags.length === 0) {
            this.finish();
        }
    }

    draw() {
        super.draw();
        // Guard against uninitialized layout
        if (!this.scaleX || !this.histX) return;

        const ctx = this.ctx;

        this.drawScale();
        this.drawCurrentBag();
        this.drawWeighedBags();
        this.drawHistogram();
        this.drawStats();
    }

    drawScale() {
        const ctx = this.ctx;

        // Platform
        ctx.fillStyle = '#888';
        ctx.fillRect(
            this.scaleX - 50,
            this.platformY,
            100,
            10
        );

        // Scale body
        ctx.fillStyle = '#555';
        this.drawRoundedRect(
            this.scaleX - this.scaleWidth / 2,
            this.scaleY - this.scaleHeight / 2,
            this.scaleWidth,
            this.scaleHeight,
            5
        );
        ctx.fill();

        // Pillar connecting platform to scale
        ctx.fillStyle = '#777';
        ctx.fillRect(this.scaleX - 5, this.platformY + 10, 10, this.scaleY - this.platformY - 25);

        // Digital display
        ctx.fillStyle = '#1a1a2e';
        this.drawRoundedRect(
            this.displayX - 50,
            this.displayY - 20,
            100,
            40,
            5
        );
        ctx.fill();

        // Display weight
        ctx.fillStyle = '#0f0';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let displayText = '----';
        if (this.currentBag && this.currentBag.state === 'weighing') {
            // Animate the display settling
            const progress = Math.min(1, this.currentBag.weighTime / 0.5);
            if (progress < 1) {
                // Flickering numbers while settling
                const noise = Math.round((Math.random() - 0.5) * 50 * (1 - progress));
                displayText = (this.currentBag.weight + noise).toString();
            } else {
                displayText = this.currentBag.weight.toString();
            }
        }
        ctx.fillText(displayText + 'g', this.displayX, this.displayY);
    }

    drawCurrentBag() {
        if (!this.currentBag) return;
        const ctx = this.ctx;
        const bag = this.currentBag;

        ctx.globalAlpha = bag.opacity;

        // Bag shape
        ctx.fillStyle = '#d4a574';
        this.drawRoundedRect(bag.x - 25, bag.y - 25, 50, 50, 8);
        ctx.fill();

        // Bag texture lines
        ctx.strokeStyle = '#b8956a';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(bag.x - 20 + i * 15, bag.y - 20);
            ctx.lineTo(bag.x - 20 + i * 15, bag.y + 20);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    }

    drawWeighedBags() {
        const ctx = this.ctx;

        for (const bag of this.weighedBags) {
            ctx.globalAlpha = bag.opacity;
            ctx.fillStyle = '#d4a574';
            this.drawRoundedRect(bag.x - 25, bag.y - 25, 50, 50, 8);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    drawHistogram() {
        const ctx = this.ctx;

        // Background
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(this.histX, this.histY, this.histWidth, this.histHeight);

        // Border
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.histX, this.histY, this.histWidth, this.histHeight);

        // Title
        ctx.fillStyle = '#333';
        ctx.font = '14px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Painojakauma', this.histX + this.histWidth / 2, this.histY - 10);

        if (this.maxBinCount === 0) return;

        // Determine range
        const bins = Object.keys(this.histogramBins).map(Number).sort((a, b) => a - b);
        if (bins.length === 0) return;

        const minBin = Math.min(...bins) - 20;
        const maxBin = Math.max(...bins) + 20;
        const binRange = maxBin - minBin;

        // Draw bars
        const barMaxHeight = this.histHeight - 40;
        const barWidth = Math.max(8, this.histWidth / (binRange / 5) - 2);

        ctx.fillStyle = '#3498db';
        for (const [bin, count] of Object.entries(this.histogramBins)) {
            const x = this.histX + ((Number(bin) - minBin) / binRange) * this.histWidth;
            const height = (count / this.maxBinCount) * barMaxHeight;
            ctx.fillRect(x - barWidth / 2, this.histY + this.histHeight - 30 - height, barWidth, height);
        }

        // X axis labels
        ctx.fillStyle = '#666';
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'center';

        for (let w = Math.ceil(minBin / 20) * 20; w <= maxBin; w += 20) {
            const x = this.histX + ((w - minBin) / binRange) * this.histWidth;
            ctx.fillText(w.toString(), x, this.histY + this.histHeight - 10);
        }
    }

    drawStats() {
        const ctx = this.ctx;
        const data = this.collectedData;

        ctx.fillStyle = '#333';
        ctx.font = '14px system-ui, sans-serif';
        ctx.textAlign = 'left';

        const statsY = 30;
        ctx.fillText(`Pusseja punnittu: ${data.count}`, 20, statsY);

        if (data.count > 0) {
            ctx.fillText(`Keskiarvo: ${data.observedMean.toFixed(1)}g`, 20, statsY + 20);
        }
    }
}

// Self-register with AnimationRegistry
if (typeof AnimationRegistry !== 'undefined') {
    AnimationRegistry.register('scale', {
        class: ScaleAnimation,
        statsConfig: {
            count: { label: 'Punnittu', initial: '0' },
            mean: { label: 'Keskiarvo', initial: '-' }
        },
        outputs: ['weights', 'observedMean', 'observedStd', 'count'],
        statsMapper: (stats) => ({
            count: stats.count,
            mean: stats.mean?.toFixed(1) || '-'
        })
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScaleAnimation;
}
