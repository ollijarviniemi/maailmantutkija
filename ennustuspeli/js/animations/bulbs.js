/**
 * Bulbs Animation
 *
 * Shows a grid of light bulbs that burn out over time.
 * Demonstrates exponential distribution of lifetimes.
 */

class BulbsAnimation extends BaseAnimation {
    constructor(canvas, config = {}) {
        super(canvas, config);

        // Configuration
        this.gridSize = config.gridSize || 6;
        this.meanLifetime = config.meanLifetime || 1000;  // hours
        this.timeScale = config.timeScale || 50;  // simulated hours per real second
        this.threshold = config.threshold || 500;

        this.resetState();
    }

    resetState() {
        this.bulbs = [];
        this.simTime = 0;  // simulated hours
        this.burnedCount = 0;
        this.burnedBeforeThreshold = 0;

        // Generate bulbs with exponential lifetimes
        const totalBulbs = this.gridSize * this.gridSize;
        for (let i = 0; i < totalBulbs; i++) {
            const lifetime = Distributions.sampleExponential(this.meanLifetime);
            this.bulbs.push({
                index: i,
                row: Math.floor(i / this.gridSize),
                col: i % this.gridSize,
                lifetime: lifetime,
                burnedOut: false,
                burnedTime: null,
                brightness: 1,
                flickering: false
            });
        }

        // Sort by lifetime for timeline display
        this.sortedBulbs = [...this.bulbs].sort((a, b) => a.lifetime - b.lifetime);

        this.collectedData = {
            lifetimes: [],
            burnedBeforeThreshold: 0,
            totalBulbs: totalBulbs,
            threshold: this.threshold
        };
    }

    updateLayout() {
        // Guard against being called before constructor completes
        const gridSize = this.gridSize || this.config.gridSize || 6;

        // Grid area (left side)
        const padding = 40;
        const gridAreaSize = Math.min(this.width * 0.5, this.height - 100);
        this.gridX = padding;
        this.gridY = 60;
        this.bulbSize = Math.max(10, (gridAreaSize - 20) / gridSize);  // Ensure positive
        this.bulbSpacing = this.bulbSize;

        // Timeline area (right side)
        this.timelineX = this.width * 0.55;
        this.timelineY = 80;
        this.timelineWidth = this.width * 0.4;
        this.timelineHeight = this.height - 140;
    }

    update(dt) {
        // Advance simulation time
        this.simTime += dt * this.timeScale;

        // Check for bulbs burning out
        for (const bulb of this.bulbs) {
            if (!bulb.burnedOut && bulb.lifetime <= this.simTime) {
                // Start flickering before burning out
                if (!bulb.flickering && bulb.lifetime <= this.simTime + 20) {
                    bulb.flickering = true;
                }

                if (bulb.lifetime <= this.simTime) {
                    bulb.burnedOut = true;
                    bulb.burnedTime = bulb.lifetime;
                    bulb.brightness = 0;
                    this.burnedCount++;

                    // Track if burned before threshold
                    if (bulb.lifetime < this.threshold) {
                        this.burnedBeforeThreshold++;
                        this.collectedData.burnedBeforeThreshold = this.burnedBeforeThreshold;
                    }

                    this.collectedData.lifetimes.push(bulb.lifetime);

                    if (this.onDataUpdate) {
                        this.onDataUpdate(this.collectedData);
                    }
                }
            }

            // Flickering effect for bulbs about to burn out
            if (bulb.flickering && !bulb.burnedOut) {
                bulb.brightness = 0.5 + Math.random() * 0.5;
            }
        }

        // Stats callback
        if (this.onStatsUpdate) {
            this.onStatsUpdate({
                simTime: this.simTime,
                burnedCount: this.burnedCount,
                burnedBeforeThreshold: this.burnedBeforeThreshold,
                totalBulbs: this.bulbs.length
            });
        }

        // Check if simulation is done (all bulbs burned or enough time passed)
        const maxTime = this.meanLifetime * 3;
        if (this.burnedCount >= this.bulbs.length || this.simTime >= maxTime) {
            this.finish();
        }
    }

    draw() {
        super.draw();
        // Guard against uninitialized layout
        if (!this.gridX || !this.timelineX) return;

        const ctx = this.ctx;

        this.drawTimeDisplay();
        this.drawGrid();
        this.drawTimeline();
        this.drawLegend();
    }

    drawTimeDisplay() {
        const ctx = this.ctx;

        ctx.fillStyle = '#333';
        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Aika: ${Math.floor(this.simTime)} tuntia`, 20, 35);

        // Progress bar to threshold
        const progressWidth = 200;
        const progressHeight = 8;
        const progressX = 200;
        const progressY = 28;

        ctx.fillStyle = '#ddd';
        ctx.fillRect(progressX, progressY, progressWidth, progressHeight);

        const progress = Math.min(1, this.simTime / this.threshold);
        ctx.fillStyle = this.simTime >= this.threshold ? '#27ae60' : '#3498db';
        ctx.fillRect(progressX, progressY, progressWidth * progress, progressHeight);

        ctx.fillStyle = '#666';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText(`${this.threshold}h raja`, progressX + progressWidth + 10, progressY + 8);
    }

    drawGrid() {
        const ctx = this.ctx;

        for (const bulb of this.bulbs) {
            const x = this.gridX + bulb.col * this.bulbSpacing + this.bulbSpacing / 2;
            const y = this.gridY + bulb.row * this.bulbSpacing + this.bulbSpacing / 2;
            const radius = this.bulbSize * 0.35;

            // Socket
            ctx.fillStyle = '#666';
            ctx.fillRect(x - 6, y + radius - 5, 12, 15);

            // Bulb glass
            if (bulb.burnedOut) {
                // Burned out - dark
                ctx.fillStyle = '#444';
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();

                // X mark
                ctx.strokeStyle = '#888';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x - radius * 0.5, y - radius * 0.5);
                ctx.lineTo(x + radius * 0.5, y + radius * 0.5);
                ctx.moveTo(x + radius * 0.5, y - radius * 0.5);
                ctx.lineTo(x - radius * 0.5, y + radius * 0.5);
                ctx.stroke();
            } else {
                // Lit bulb with glow
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.5);
                const alpha = bulb.brightness;
                gradient.addColorStop(0, `rgba(255, 244, 180, ${alpha})`);
                gradient.addColorStop(0.5, `rgba(255, 220, 100, ${alpha * 0.5})`);
                gradient.addColorStop(1, `rgba(255, 200, 50, 0)`);

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
                ctx.fill();

                // Bulb shape
                ctx.fillStyle = `rgba(255, 244, 200, ${alpha})`;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#ccc';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    }

    drawTimeline() {
        const ctx = this.ctx;

        // Background
        ctx.fillStyle = '#f9f9f9';
        ctx.fillRect(this.timelineX, this.timelineY, this.timelineWidth, this.timelineHeight);
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.timelineX, this.timelineY, this.timelineWidth, this.timelineHeight);

        // Title
        ctx.fillStyle = '#333';
        ctx.font = '14px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sammumisajat', this.timelineX + this.timelineWidth / 2, this.timelineY - 10);

        // Draw threshold line
        const maxDisplayTime = Math.max(this.meanLifetime * 2, this.simTime);
        const thresholdX = this.timelineX + (this.threshold / maxDisplayTime) * this.timelineWidth;

        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(thresholdX, this.timelineY);
        ctx.lineTo(thresholdX, this.timelineY + this.timelineHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#e74c3c';
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.threshold}h`, thresholdX, this.timelineY + this.timelineHeight + 15);

        // Current time line
        const currentX = this.timelineX + (this.simTime / maxDisplayTime) * this.timelineWidth;
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(currentX, this.timelineY);
        ctx.lineTo(currentX, this.timelineY + this.timelineHeight);
        ctx.stroke();

        // Draw bulb failure markers
        const markerHeight = this.timelineHeight / this.bulbs.length;

        for (let i = 0; i < this.sortedBulbs.length; i++) {
            const bulb = this.sortedBulbs[i];
            const y = this.timelineY + i * markerHeight + markerHeight / 2;

            if (bulb.burnedOut) {
                const x = this.timelineX + (bulb.lifetime / maxDisplayTime) * this.timelineWidth;
                const isEarly = bulb.lifetime < this.threshold;

                ctx.fillStyle = isEarly ? '#e74c3c' : '#95a5a6';
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // X axis labels
        ctx.fillStyle = '#666';
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'center';

        for (let t = 0; t <= maxDisplayTime; t += 500) {
            const x = this.timelineX + (t / maxDisplayTime) * this.timelineWidth;
            ctx.fillText(t.toString(), x, this.timelineY + this.timelineHeight + 15);
        }
    }

    drawLegend() {
        const ctx = this.ctx;
        const legendY = this.height - 30;

        ctx.font = '13px system-ui, sans-serif';
        ctx.textAlign = 'left';

        // Burned before threshold
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(this.timelineX, legendY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.fillText(`Ennen ${this.threshold}h: ${this.burnedBeforeThreshold}`, this.timelineX + 15, legendY + 4);

        // Burned after threshold
        ctx.fillStyle = '#95a5a6';
        ctx.beginPath();
        ctx.arc(this.timelineX + 150, legendY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.fillText(`Jälkeen: ${this.burnedCount - this.burnedBeforeThreshold}`, this.timelineX + 165, legendY + 4);

        // Still lit
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(this.timelineX + 280, legendY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.fillText(`Palavat: ${this.bulbs.length - this.burnedCount}`, this.timelineX + 295, legendY + 4);
    }
}

// Self-register with AnimationRegistry
if (typeof AnimationRegistry !== 'undefined') {
    AnimationRegistry.register('bulbs', {
        class: BulbsAnimation,
        statsConfig: {
            time: { label: 'Aika (h)', initial: '0' },
            burned: { label: 'Sammunut', initial: '0' }
        },
        outputs: ['lifetimes', 'burnedBeforeThreshold', 'totalBulbs', 'threshold'],
        statsMapper: (stats) => ({
            time: Math.floor(stats.simTime),
            burned: stats.burnedCount
        })
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BulbsAnimation;
}
