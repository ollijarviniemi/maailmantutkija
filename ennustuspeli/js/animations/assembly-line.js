/**
 * Assembly Line Animation
 *
 * Products pass through multiple stations, each with its own failure rate.
 * Demonstrates how compound reliability works: the player observes individual
 * station failure rates and must predict overall success rate.
 */

class AssemblyLineAnimation extends BaseAnimation {
    constructor(canvas, config = {}) {
        super(canvas, config);

        // Configuration
        this.stations = config.stations || [
            { name: 'Leimaus', passRate: 0.94 },
            { name: 'Hitsaus', passRate: 0.91 },
            { name: 'Pinnoitus', passRate: 0.96 },
            { name: 'Kokoonpano', passRate: 0.93 }
        ];
        this.productCount = config.productCount || 100;
        this.productsPerSecond = config.productsPerSecond || 3;

        this.resetState();
    }

    resetState() {
        this.products = [];
        this.completedProducts = [];
        this.rejectedProducts = [];
        this.productsGenerated = 0;
        this.timeSinceLastProduct = 0;

        // Station statistics (observed)
        this.stationStats = this.stations.map(() => ({
            attempted: 0,
            passed: 0,
            failed: 0
        }));

        this.collectedData = {
            stationStats: this.stationStats,
            productsCompleted: 0,
            productsRejected: 0,
            totalProducts: 0
        };
    }

    updateLayout() {
        // Guard against zero dimensions or uninitialized state
        if (!this.width || !this.height) return;

        const padding = 40;
        const stations = this.stations || this.config.stations || [];
        const numStations = stations.length || 4;

        // Calculate station positions
        const totalWidth = this.width - padding * 2;
        const stationWidth = totalWidth / (numStations + 1);

        this.stationPositions = [];
        for (let i = 0; i < numStations; i++) {
            this.stationPositions.push({
                x: padding + (i + 0.5) * stationWidth,
                y: this.height * 0.4,
                width: stationWidth * 0.6,
                height: 80
            });
        }

        // Completion zone
        this.completionX = this.width - padding;
        this.completionY = this.height * 0.4;

        // Product size
        this.productSize = 25;

        // Conveyor line
        this.conveyorY = this.height * 0.4 + 50;

        // Rejection zone
        this.rejectionY = this.height * 0.7;
    }

    generateProduct() {
        return {
            id: this.productsGenerated,
            x: 0,
            y: this.conveyorY - this.productSize / 2,
            currentStation: -1,  // -1 = on approach
            state: 'moving',  // moving, processing, rejected, completed
            stationResults: [],  // track pass/fail at each station
            opacity: 1,
            processingTime: 0
        };
    }

    update(dt) {
        // Generate products
        if (this.productsGenerated < this.productCount) {
            this.timeSinceLastProduct += dt;
            if (this.timeSinceLastProduct >= 1 / this.productsPerSecond) {
                this.timeSinceLastProduct = 0;
                this.products.push(this.generateProduct());
                this.productsGenerated++;
            }
        }

        // Update products
        const speed = 100;  // pixels per second
        const processingDuration = 0.3;  // seconds at each station

        for (const product of this.products) {
            if (product.state === 'moving') {
                // Determine target position
                let targetX;
                if (product.currentStation === -1) {
                    targetX = this.stationPositions[0].x;
                } else if (product.currentStation >= this.stations.length - 1) {
                    targetX = this.completionX;
                } else {
                    targetX = this.stationPositions[product.currentStation + 1].x;
                }

                // Move toward target
                product.x += speed * dt;

                // Arrived at next station?
                if (product.x >= targetX) {
                    product.x = targetX;
                    product.currentStation++;

                    if (product.currentStation >= this.stations.length) {
                        // Completed all stations!
                        product.state = 'completed';
                        this.completedProducts.push(product);
                        this.collectedData.productsCompleted++;
                    } else {
                        // Start processing at this station
                        product.state = 'processing';
                        product.processingTime = 0;
                    }
                }
            } else if (product.state === 'processing') {
                product.processingTime += dt;

                if (product.processingTime >= processingDuration) {
                    // Process result
                    const station = this.stations[product.currentStation];
                    const passed = Math.random() < station.passRate;

                    product.stationResults.push(passed);

                    // Update station stats
                    this.stationStats[product.currentStation].attempted++;
                    if (passed) {
                        this.stationStats[product.currentStation].passed++;
                        product.state = 'moving';  // Continue to next station
                    } else {
                        this.stationStats[product.currentStation].failed++;
                        product.state = 'rejected';
                        this.rejectedProducts.push(product);
                        this.collectedData.productsRejected++;
                    }

                    // Update data
                    this.collectedData.stationStats = [...this.stationStats];
                    this.collectedData.totalProducts = this.completedProducts.length + this.rejectedProducts.length;

                    if (this.onDataUpdate) {
                        this.onDataUpdate(this.collectedData);
                    }
                }
            } else if (product.state === 'rejected') {
                // Fall down to rejection zone
                product.y += speed * dt;
                if (product.y > this.rejectionY + 50) {
                    product.opacity -= dt * 2;
                }
            } else if (product.state === 'completed') {
                // Slide off to the right
                product.x += speed * dt * 0.5;
                if (product.x > this.width + 50) {
                    product.opacity -= dt * 2;
                }
            }
        }

        // Remove faded products
        this.products = this.products.filter(p => p.opacity > 0);

        // Stats callback
        if (this.onStatsUpdate) {
            const totalProcessed = this.completedProducts.length + this.rejectedProducts.length;
            this.onStatsUpdate({
                totalProcessed,
                completed: this.completedProducts.length,
                rejected: this.rejectedProducts.length,
                stationStats: this.stationStats
            });
        }

        // Check if done
        if (this.productsGenerated >= this.productCount &&
            this.products.filter(p => p.state === 'moving' || p.state === 'processing').length === 0) {
            this.finish();
        }
    }

    draw() {
        super.draw();
        // Guard against uninitialized layout
        if (!this.stationPositions || !this.conveyorY) return;

        const ctx = this.ctx;

        this.drawHeader();
        this.drawConveyor();
        this.drawStations();
        this.drawProducts();
        this.drawStationStats();
        this.drawSummary();
    }

    drawHeader() {
        const ctx = this.ctx;

        ctx.fillStyle = '#333';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.textAlign = 'left';

        const processed = this.completedProducts.length + this.rejectedProducts.length;
        ctx.fillText(
            `Tuotteita käsitelty: ${processed}/${this.productCount}`,
            20, 25
        );
    }

    drawConveyor() {
        const ctx = this.ctx;

        // Main conveyor line
        ctx.fillStyle = '#666';
        ctx.fillRect(0, this.conveyorY - 5, this.width, 10);

        // Conveyor texture
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        for (let x = 0; x < this.width; x += 15) {
            ctx.beginPath();
            ctx.moveTo(x, this.conveyorY - 5);
            ctx.lineTo(x, this.conveyorY + 5);
            ctx.stroke();
        }

        // Rejection chute
        const firstStation = this.stationPositions[0];
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.moveTo(firstStation.x - 20, this.conveyorY + 5);
        ctx.lineTo(this.width * 0.3, this.rejectionY);
        ctx.lineTo(this.width * 0.7, this.rejectionY);
        ctx.lineTo(this.stationPositions[this.stations.length - 1].x + 20, this.conveyorY + 5);
        ctx.closePath();
        ctx.fillStyle = 'rgba(231, 76, 60, 0.1)';
        ctx.fill();

        // Rejection zone label
        ctx.fillStyle = '#e74c3c';
        ctx.font = '12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Hylätyt', this.width / 2, this.rejectionY + 20);
    }

    drawStations() {
        const ctx = this.ctx;

        for (let i = 0; i < this.stations.length; i++) {
            const station = this.stations[i];
            const pos = this.stationPositions[i];

            // Station body
            ctx.fillStyle = '#34495e';
            this.drawRoundedRect(
                pos.x - pos.width / 2,
                pos.y - pos.height,
                pos.width,
                pos.height,
                8
            );
            ctx.fill();

            // Station number
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 24px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText((i + 1).toString(), pos.x, pos.y - pos.height / 2);

            // Station name
            ctx.fillStyle = '#333';
            ctx.font = '12px system-ui, sans-serif';
            ctx.textBaseline = 'top';
            ctx.fillText(station.name, pos.x, pos.y + 10);

            // Processing indicator
            const processing = this.products.find(
                p => p.state === 'processing' && p.currentStation === i
            );
            if (processing) {
                // Flashing indicator
                const flash = Math.sin(Date.now() / 100) > 0;
                ctx.fillStyle = flash ? '#f1c40f' : '#e67e22';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y - pos.height - 10, 6, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Completion zone
        ctx.fillStyle = '#27ae60';
        this.drawRoundedRect(
            this.completionX - 30,
            this.completionY - 60,
            60,
            60,
            8
        );
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', this.completionX, this.completionY - 30);

        ctx.fillStyle = '#27ae60';
        ctx.font = '12px system-ui, sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillText('Valmis', this.completionX, this.completionY + 10);
    }

    drawProducts() {
        const ctx = this.ctx;

        for (const product of this.products) {
            ctx.globalAlpha = product.opacity;

            // Product color based on state
            if (product.state === 'rejected') {
                ctx.fillStyle = '#e74c3c';
            } else if (product.state === 'completed') {
                ctx.fillStyle = '#27ae60';
            } else if (product.state === 'processing') {
                ctx.fillStyle = '#f39c12';
            } else {
                ctx.fillStyle = '#3498db';
            }

            this.drawRoundedRect(
                product.x - this.productSize / 2,
                product.y - this.productSize / 2,
                this.productSize,
                this.productSize,
                4
            );
            ctx.fill();

            // Show station results as dots
            if (product.stationResults.length > 0) {
                const dotSize = 4;
                const startX = product.x - (product.stationResults.length - 1) * dotSize;
                for (let i = 0; i < product.stationResults.length; i++) {
                    ctx.fillStyle = product.stationResults[i] ? '#27ae60' : '#e74c3c';
                    ctx.beginPath();
                    ctx.arc(startX + i * dotSize * 2, product.y - this.productSize / 2 - 6, dotSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        ctx.globalAlpha = 1;
    }

    drawStationStats() {
        const ctx = this.ctx;
        const statsY = this.height - 90;

        ctx.fillStyle = '#333';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Havaitut läpäisyprosentit:', 20, statsY);

        for (let i = 0; i < this.stations.length; i++) {
            const stats = this.stationStats[i];
            const pos = this.stationPositions[i];

            if (stats.attempted > 0) {
                const passRate = (stats.passed / stats.attempted * 100).toFixed(0);

                // Background bar
                const barWidth = 70;
                const barHeight = 20;
                const barX = pos.x - barWidth / 2;
                const barY = statsY + 15;

                ctx.fillStyle = '#eee';
                ctx.fillRect(barX, barY, barWidth, barHeight);

                // Fill bar
                const fillWidth = (stats.passed / stats.attempted) * barWidth;
                ctx.fillStyle = stats.passed / stats.attempted > 0.9 ? '#27ae60' : '#f39c12';
                ctx.fillRect(barX, barY, fillWidth, barHeight);

                // Text
                ctx.fillStyle = '#333';
                ctx.font = '12px system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`${passRate}%`, pos.x, barY + 15);
                ctx.fillText(`(${stats.passed}/${stats.attempted})`, pos.x, barY + 35);
            }
        }
    }

    drawSummary() {
        const ctx = this.ctx;

        const completed = this.completedProducts.length;
        const rejected = this.rejectedProducts.length;
        const total = completed + rejected;

        if (total > 0) {
            ctx.fillStyle = '#333';
            ctx.font = 'bold 14px system-ui, sans-serif';
            ctx.textAlign = 'right';

            ctx.fillText(`Valmiit: ${completed}`, this.width - 20, 25);
            ctx.fillStyle = '#e74c3c';
            ctx.fillText(`Hylätyt: ${rejected}`, this.width - 20, 45);

            if (total >= 20) {
                const successRate = (completed / total * 100).toFixed(1);
                ctx.fillStyle = '#333';
                ctx.fillText(`Läpäisy: ${successRate}%`, this.width - 20, 65);
            }
        }
    }
}

// Self-register with AnimationRegistry
if (typeof AnimationRegistry !== 'undefined') {
    AnimationRegistry.register('assembly-line', {
        class: AssemblyLineAnimation,
        statsConfig: {
            processed: { label: 'Käsitelty', initial: '0' },
            completed: { label: 'Valmiit', initial: '0' }
        },
        outputs: ['stationStats', 'productsCompleted', 'productsRejected', 'totalProducts'],
        statsMapper: (stats) => ({
            processed: stats.totalProcessed,
            completed: stats.completed
        })
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssemblyLineAnimation;
}
