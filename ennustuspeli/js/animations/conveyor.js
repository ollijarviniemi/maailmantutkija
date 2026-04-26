/**
 * Conveyor Animation
 *
 * Products move along a conveyor belt and are inspected.
 * Some are defective (red), most pass (green).
 * Used for the quality inspector level.
 */

class ConveyorAnimation extends BaseAnimation {
    constructor(canvas, config = {}) {
        super(canvas, config);

        // Configuration
        this.defectRate = config.defectRate || 0.06;
        this.observationCount = config.observationCount || 50;
        this.predictionCount = config.predictionCount || 100;
        this.speed = config.speed || 3;  // products per second

        this.resetState();
    }

    resetState() {
        this.phase = 'observation';  // observation, prediction
        this.products = [];
        this.inspectedProducts = [];
        this.productsGenerated = 0;
        this.timeSinceLastProduct = 0;

        // Observation stats
        this.observedDefects = 0;
        this.observedTotal = 0;

        // Prediction stats
        this.predictionDefects = 0;
        this.predictionTotal = 0;

        this.conveyorOffset = 0;

        this.collectedData = {
            observedDefects: 0,
            observedTotal: 0,
            observedRate: 0,
            actualDefectsInPrediction: 0,
            predictionTotal: 0
        };
    }

    updateLayout() {
        // Guard against zero dimensions
        if (!this.width || !this.height) return;

        const padding = 30;

        // Conveyor belt
        this.beltY = this.height * 0.45;
        this.beltHeight = 40;
        this.beltStartX = padding;
        this.beltEndX = this.width - padding;

        // Inspector position
        this.inspectorX = this.width * 0.6;

        // Product size
        this.productSize = 30;

        // Stats area
        this.statsY = this.height - 80;
    }

    generateProduct() {
        const isDefective = Math.random() < this.defectRate;

        return {
            id: this.productsGenerated,
            x: this.beltStartX - 50,
            targetX: this.beltEndX + 50,
            y: this.beltY - this.productSize / 2 - 5,
            isDefective,
            inspected: false,
            result: null,  // 'pass' or 'fail'
            opacity: 1
        };
    }

    update(dt) {
        // Animate conveyor belt pattern
        this.conveyorOffset += dt * 100;
        if (this.conveyorOffset > 20) this.conveyorOffset -= 20;

        // Generate products
        const totalNeeded = this.phase === 'observation' ? this.observationCount :
                          this.observationCount + this.predictionCount;

        if (this.productsGenerated < totalNeeded) {
            this.timeSinceLastProduct += dt;
            if (this.timeSinceLastProduct >= 1 / this.speed) {
                this.timeSinceLastProduct = 0;
                this.products.push(this.generateProduct());
                this.productsGenerated++;
            }
        }

        // Move products
        const productSpeed = 120;  // pixels per second
        for (const product of this.products) {
            product.x += dt * productSpeed;

            // Check if at inspector
            if (!product.inspected && product.x >= this.inspectorX - 20) {
                product.inspected = true;
                product.result = product.isDefective ? 'fail' : 'pass';

                // Update stats
                if (this.phase === 'observation') {
                    this.observedTotal++;
                    if (product.isDefective) this.observedDefects++;

                    this.collectedData.observedTotal = this.observedTotal;
                    this.collectedData.observedDefects = this.observedDefects;
                    this.collectedData.observedRate = this.observedDefects / this.observedTotal;

                    // Check if observation phase done
                    if (this.observedTotal >= this.observationCount) {
                        this.phase = 'prediction';
                    }
                } else {
                    this.predictionTotal++;
                    if (product.isDefective) this.predictionDefects++;

                    this.collectedData.predictionTotal = this.predictionTotal;
                    this.collectedData.actualDefectsInPrediction = this.predictionDefects;
                }

                if (this.onDataUpdate) {
                    this.onDataUpdate(this.collectedData);
                }

                this.inspectedProducts.push({
                    isDefective: product.isDefective,
                    phase: this.phase === 'observation' ? 'observation' : 'prediction'
                });
            }

            // Fade out at end
            if (product.x > this.beltEndX) {
                product.opacity -= dt * 2;
            }
        }

        // Remove faded products
        this.products = this.products.filter(p => p.opacity > 0);

        // Stats callback
        if (this.onStatsUpdate) {
            this.onStatsUpdate({
                phase: this.phase,
                observedTotal: this.observedTotal,
                observedDefects: this.observedDefects,
                predictionTotal: this.predictionTotal,
                predictionDefects: this.predictionDefects
            });
        }

        // Check if done
        if (this.phase === 'prediction' && this.predictionTotal >= this.predictionCount) {
            // Small delay before finishing
            if (this.products.length === 0) {
                this.finish();
            }
        }
    }

    draw() {
        super.draw();
        // Guard against uninitialized layout
        if (!this.beltY || !this.inspectorX) return;

        const ctx = this.ctx;

        this.drawHeader();
        this.drawConveyor();
        this.drawInspector();
        this.drawProducts();
        this.drawInspectedHistory();
        this.drawStats();
    }

    drawHeader() {
        const ctx = this.ctx;

        ctx.fillStyle = '#333';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.textAlign = 'left';

        if (this.phase === 'observation') {
            ctx.fillText(
                `Tarkkailuvaihe: ${this.observedTotal}/${this.observationCount} tuotetta`,
                20, 30
            );
        } else {
            ctx.fillText(
                `Ennustusvaihe: ${this.predictionTotal}/${this.predictionCount} tuotetta`,
                20, 30
            );
            ctx.font = '14px system-ui, sans-serif';
            ctx.fillStyle = '#666';
            ctx.fillText(
                `Havaittu vikataajuus: ${(this.collectedData.observedRate * 100).toFixed(1)}%`,
                20, 50
            );
        }
    }

    drawConveyor() {
        const ctx = this.ctx;

        // Belt shadow
        ctx.fillStyle = '#555';
        ctx.fillRect(this.beltStartX, this.beltY + 5, this.beltEndX - this.beltStartX, this.beltHeight);

        // Belt surface
        ctx.fillStyle = '#444';
        ctx.fillRect(this.beltStartX, this.beltY, this.beltEndX - this.beltStartX, this.beltHeight);

        // Belt pattern (moving lines)
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        for (let x = this.beltStartX - this.conveyorOffset; x < this.beltEndX; x += 20) {
            if (x > this.beltStartX) {
                ctx.beginPath();
                ctx.moveTo(x, this.beltY);
                ctx.lineTo(x, this.beltY + this.beltHeight);
                ctx.stroke();
            }
        }

        // Belt edges
        ctx.fillStyle = '#666';
        ctx.fillRect(this.beltStartX, this.beltY - 5, this.beltEndX - this.beltStartX, 5);
        ctx.fillRect(this.beltStartX, this.beltY + this.beltHeight, this.beltEndX - this.beltStartX, 5);

        // Support legs
        ctx.fillStyle = '#777';
        ctx.fillRect(this.beltStartX + 50, this.beltY + this.beltHeight + 5, 15, 50);
        ctx.fillRect(this.beltEndX - 65, this.beltY + this.beltHeight + 5, 15, 50);
    }

    drawInspector() {
        const ctx = this.ctx;
        const x = this.inspectorX;
        const y = this.beltY - 80;

        // Scanner arm
        ctx.fillStyle = '#888';
        ctx.fillRect(x - 5, y, 10, 70);

        // Scanner head
        ctx.fillStyle = '#333';
        this.drawRoundedRect(x - 25, y - 10, 50, 25, 5);
        ctx.fill();

        // Scanner light
        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        ctx.arc(x, y + 5, 8, 0, Math.PI * 2);
        ctx.fill();

        // Scanning beam
        ctx.strokeStyle = 'rgba(52, 152, 219, 0.5)';
        ctx.lineWidth = 30;
        ctx.beginPath();
        ctx.moveTo(x, y + 20);
        ctx.lineTo(x, this.beltY);
        ctx.stroke();

        // Label
        ctx.fillStyle = '#333';
        ctx.font = '12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Tarkastus', x, y - 20);
    }

    drawProducts() {
        const ctx = this.ctx;

        for (const product of this.products) {
            ctx.globalAlpha = product.opacity;

            // Product box
            if (product.inspected) {
                ctx.fillStyle = product.isDefective ? '#e74c3c' : '#27ae60';
            } else {
                ctx.fillStyle = '#3498db';
            }

            this.drawRoundedRect(
                product.x - this.productSize / 2,
                product.y,
                this.productSize,
                this.productSize,
                4
            );
            ctx.fill();

            // Result icon
            if (product.inspected) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 16px system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(
                    product.isDefective ? '✗' : '✓',
                    product.x,
                    product.y + this.productSize / 2
                );
            }
        }
        ctx.globalAlpha = 1;
    }

    drawInspectedHistory() {
        const ctx = this.ctx;
        const startY = this.beltY + this.beltHeight + 70;

        // Observation phase results
        ctx.fillStyle = '#333';
        ctx.font = '12px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Tarkkailuvaihe:', 20, startY);

        const obsProducts = this.inspectedProducts.filter(p => p.phase === 'observation');
        this.drawProductGrid(obsProducts, 20, startY + 10, 15, this.observationCount);

        // Prediction phase results (if started)
        if (this.phase === 'prediction') {
            ctx.fillText('Ennustusvaihe:', 20, startY + 50);

            const predProducts = this.inspectedProducts.filter(p => p.phase === 'prediction');
            this.drawProductGrid(predProducts, 20, startY + 60, 15, this.predictionCount);
        }
    }

    drawProductGrid(products, x, y, size, max) {
        const ctx = this.ctx;
        const cols = 25;

        for (let i = 0; i < products.length; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const px = x + col * (size + 2);
            const py = y + row * (size + 2);

            ctx.fillStyle = products[i].isDefective ? '#e74c3c' : '#27ae60';
            ctx.fillRect(px, py, size, size);
        }

        // Show empty slots
        ctx.fillStyle = '#ddd';
        for (let i = products.length; i < max; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const px = x + col * (size + 2);
            const py = y + row * (size + 2);
            ctx.fillRect(px, py, size, size);
        }
    }

    drawStats() {
        const ctx = this.ctx;

        ctx.fillStyle = '#333';
        ctx.font = '14px system-ui, sans-serif';
        ctx.textAlign = 'right';

        const x = this.width - 20;
        let y = 30;

        ctx.fillText(`Tarkastettu: ${this.observedTotal + this.predictionTotal}`, x, y);

        if (this.observedTotal > 0) {
            y += 20;
            ctx.fillText(
                `Tarkkailun vialliset: ${this.observedDefects}/${this.observedTotal}`,
                x, y
            );
        }

        if (this.predictionTotal > 0) {
            y += 20;
            ctx.fillStyle = '#e74c3c';
            ctx.fillText(
                `Ennustusvaiheen vialliset: ${this.predictionDefects}`,
                x, y
            );
        }
    }
}

// Self-register with AnimationRegistry
if (typeof AnimationRegistry !== 'undefined') {
    AnimationRegistry.register('conveyor', {
        class: ConveyorAnimation,
        statsConfig: {
            inspected: { label: 'Tarkastettu', initial: '0' },
            defects: { label: 'Viallisia', initial: '0' }
        },
        outputs: ['observedDefects', 'observedTotal', 'observedRate', 'actualDefectsInPrediction', 'predictionTotal'],
        statsMapper: (stats) => ({
            inspected: (stats.observedTotal || 0) + (stats.predictionTotal || 0),
            defects: (stats.observedDefects || 0) + (stats.predictionDefects || 0)
        })
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConveyorAnimation;
}
