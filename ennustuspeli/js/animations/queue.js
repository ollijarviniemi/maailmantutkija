/**
 * Queue Animation
 *
 * Visualizes a single-server queue (e.g., café, post office).
 * Shows customers arriving, waiting in queue, being served, and leaving.
 */

class QueueAnimation extends BaseAnimation {
    constructor(canvas, config = {}) {
        super(canvas, config);

        // Time configuration
        this.openTime = config.openTime || 540;      // 09:00
        this.closeTime = config.closeTime || 1020;   // 17:00
        this.lastArrival = config.lastArrival || 990; // 16:30

        // Visual configuration
        this.customerSize = config.customerSize || 20;
        this.queueSpacing = config.queueSpacing || 25;
        this.maxVisibleQueue = config.maxVisibleQueue || 15;

        // State
        this.resetState();
    }

    resetState() {
        this.simTime = this.openTime;
        this.customers = [];
        this.queue = [];
        this.beingServed = null;
        this.served = [];
        this.nextCustomerId = 0;
        this.nextArrivalTime = this.openTime;

        // DGP parameters (set by level)
        this.interarrivalMean = 5;
        this.serviceMean = 4;
        this.serviceStd = 1.6;

        this.collectedData = {
            waitTimes: [],
            serviceTimes: [],
            maxWait: 0,
            totalCustomers: 0,
            customersServed: 0
        };

        this.scheduleNextArrival();
    }

    updateLayout() {
        const padding = 20;

        // Service counter position (right side)
        this.counterX = this.width - 80;
        this.counterY = this.height / 2;
        this.counterWidth = 60;
        this.counterHeight = 80;

        // Queue line (stretches left from counter)
        this.queueStartX = this.counterX - 40;
        this.queueY = this.counterY;

        // Entry point (left side)
        this.entryX = padding + 30;
        this.entryY = this.height / 2;

        // Exit point (bottom right)
        this.exitX = this.width - padding - 30;
        this.exitY = this.height - padding - 30;
    }

    /**
     * Set the DGP parameters for this simulation
     */
    setDGP(params) {
        this.interarrivalMean = params.interarrivalMean || 5;
        this.serviceMean = params.serviceMean || 4;
        this.serviceStd = params.serviceStd || this.serviceMean * 0.4;
        this.openTime = params.openTime || 540;
        this.closeTime = params.closeTime || 1020;
        this.lastArrival = params.lastArrival || 990;
    }

    scheduleNextArrival() {
        if (this.nextArrivalTime < this.lastArrival) {
            const interarrival = Distributions.sampleExponential(this.interarrivalMean);
            this.nextArrivalTime += interarrival;
        }
    }

    createCustomer(arrivalTime) {
        const colors = ['#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'];
        return {
            id: this.nextCustomerId++,
            arrivalTime,
            serviceTime: Distributions.sampleLognormal(this.serviceMean, this.serviceStd),
            serviceStartTime: null,
            serviceEndTime: null,
            waitTime: 0,
            color: colors[Math.floor(Math.random() * colors.length)],
            x: this.entryX,
            y: this.entryY,
            targetX: this.entryX,
            targetY: this.entryY,
            state: 'arriving', // arriving, queuing, serving, leaving, gone
            opacity: 1
        };
    }

    update(dt) {
        // Advance simulation time (dt is already scaled by speed)
        this.simTime += dt;

        // Check for new arrivals
        while (this.nextArrivalTime <= this.simTime && this.nextArrivalTime < this.lastArrival) {
            const customer = this.createCustomer(this.nextArrivalTime);
            this.customers.push(customer);
            this.queue.push(customer);
            this.collectedData.totalCustomers++;
            this.scheduleNextArrival();
        }

        // Process service
        this.updateService();

        // Update queue positions
        this.updateQueuePositions();

        // Animate customer movements
        this.animateCustomers(dt);

        // Check if day is done
        if (this.simTime >= this.closeTime && this.queue.length === 0 && !this.beingServed) {
            this.finish();
        }

        // Stats callback
        if (this.onStatsUpdate) {
            this.onStatsUpdate({
                time: this.simTime,
                timeStr: this.formatTime(this.simTime),
                queueLength: this.queue.length,
                totalCustomers: this.collectedData.totalCustomers,
                customersServed: this.collectedData.customersServed,
                maxWait: this.collectedData.maxWait,
                avgWait: this.collectedData.waitTimes.length > 0
                    ? this.collectedData.waitTimes.reduce((a, b) => a + b, 0) / this.collectedData.waitTimes.length
                    : 0
            });
        }
    }

    updateService() {
        // If no one being served and queue not empty, start service
        if (!this.beingServed && this.queue.length > 0) {
            const customer = this.queue.shift();
            customer.serviceStartTime = this.simTime;
            customer.waitTime = customer.serviceStartTime - customer.arrivalTime;
            customer.serviceEndTime = customer.serviceStartTime + customer.serviceTime;
            customer.state = 'serving';
            this.beingServed = customer;

            // Track stats
            this.collectedData.waitTimes.push(customer.waitTime);
            this.collectedData.maxWait = Math.max(this.collectedData.maxWait, customer.waitTime);

            if (this.onDataUpdate) {
                this.onDataUpdate({
                    type: 'service_start',
                    customer,
                    waitTime: customer.waitTime
                });
            }
        }

        // Check if service is complete
        if (this.beingServed && this.simTime >= this.beingServed.serviceEndTime) {
            const customer = this.beingServed;
            customer.state = 'leaving';
            this.served.push(customer);
            this.beingServed = null;

            this.collectedData.customersServed++;
            this.collectedData.serviceTimes.push(customer.serviceTime);

            if (this.onDataUpdate) {
                this.onDataUpdate({
                    type: 'service_complete',
                    customer
                });
            }
        }
    }

    updateQueuePositions() {
        // Set target positions for queued customers
        for (let i = 0; i < this.queue.length; i++) {
            const customer = this.queue[i];
            customer.state = 'queuing';
            customer.targetX = this.queueStartX - i * this.queueSpacing;
            customer.targetY = this.queueY;
        }

        // Being served customer goes to counter
        if (this.beingServed) {
            this.beingServed.targetX = this.counterX - 20;
            this.beingServed.targetY = this.counterY;
        }

        // Leaving customers go to exit
        for (const customer of this.served) {
            if (customer.state === 'leaving') {
                customer.targetX = this.exitX;
                customer.targetY = this.exitY;
            }
        }
    }

    animateCustomers(dt) {
        const moveSpeed = 200; // pixels per second

        for (const customer of this.customers) {
            // Move toward target
            const dx = customer.targetX - customer.x;
            const dy = customer.targetY - customer.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 1) {
                const move = Math.min(moveSpeed * dt, dist);
                customer.x += (dx / dist) * move;
                customer.y += (dy / dist) * move;
            }

            // Fade out leaving customers at exit
            if (customer.state === 'leaving') {
                const exitDist = Math.sqrt(
                    Math.pow(customer.x - this.exitX, 2) +
                    Math.pow(customer.y - this.exitY, 2)
                );
                if (exitDist < 20) {
                    customer.opacity -= dt * 2;
                    if (customer.opacity <= 0) {
                        customer.state = 'gone';
                    }
                }
            }
        }

        // Remove gone customers
        this.customers = this.customers.filter(c => c.state !== 'gone');
        this.served = this.served.filter(c => c.state !== 'gone');
    }

    draw() {
        super.draw();
        const ctx = this.ctx;

        // Draw background elements
        this.drawCounter();
        this.drawClock();
        this.drawQueueGuide();

        // Draw customers
        for (const customer of this.customers) {
            if (customer.opacity <= 0) continue;
            ctx.globalAlpha = customer.opacity;
            this.drawCustomer(customer);
        }
        ctx.globalAlpha = 1;

        // Draw queue length indicator
        this.drawQueueInfo();
    }

    drawCounter() {
        const ctx = this.ctx;

        // Counter
        ctx.fillStyle = '#8b4513';
        this.drawRoundedRect(
            this.counterX - this.counterWidth / 2,
            this.counterY - this.counterHeight / 2,
            this.counterWidth,
            this.counterHeight,
            5
        );
        ctx.fill();

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('KASSA', this.counterX, this.counterY + 5);
    }

    drawClock() {
        const ctx = this.ctx;
        const timeStr = this.formatTime(this.simTime);

        ctx.fillStyle = '#333';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(timeStr, this.width / 2, 30);

        // Progress bar for day
        const progress = (this.simTime - this.openTime) / (this.closeTime - this.openTime);
        this.drawProgressBar(
            this.width / 2 - 100,
            40,
            200,
            8,
            progress,
            '#ddd',
            '#27ae60'
        );
    }

    drawQueueGuide() {
        const ctx = this.ctx;

        // Dotted line showing queue area
        ctx.strokeStyle = '#ccc';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(this.entryX, this.queueY);
        ctx.lineTo(this.queueStartX, this.queueY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Entry arrow
        ctx.fillStyle = '#aaa';
        ctx.beginPath();
        ctx.moveTo(this.entryX - 20, this.entryY);
        ctx.lineTo(this.entryX - 10, this.entryY - 8);
        ctx.lineTo(this.entryX - 10, this.entryY + 8);
        ctx.closePath();
        ctx.fill();
    }

    drawCustomer(customer) {
        const ctx = this.ctx;

        // Body
        this.drawEntity(customer.x, customer.y, this.customerSize, customer.color, 'circle');

        // Wait time indicator for queuing customers
        if (customer.state === 'queuing' || customer.state === 'serving') {
            const waitTime = this.simTime - customer.arrivalTime;
            if (waitTime > 5) {
                // Show wait time as small text above
                ctx.fillStyle = '#666';
                ctx.font = '10px system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`${waitTime.toFixed(0)}m`, customer.x, customer.y - 15);
            }
        }
    }

    drawQueueInfo() {
        const ctx = this.ctx;

        // Queue length
        ctx.fillStyle = '#333';
        ctx.font = '14px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Jonossa: ${this.queue.length}`, 10, this.height - 40);
        ctx.fillText(`Palveltu: ${this.collectedData.customersServed}`, 10, this.height - 20);

        // Max wait
        ctx.textAlign = 'right';
        ctx.fillText(
            `Pisin odotus: ${this.collectedData.maxWait.toFixed(1)} min`,
            this.width - 10,
            this.height - 20
        );
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QueueAnimation;
}
