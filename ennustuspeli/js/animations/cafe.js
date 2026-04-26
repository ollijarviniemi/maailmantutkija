/**
 * Café Animation
 *
 * A phased queue simulation:
 * 1. First observe customer arrivals
 * 2. Then observe service times
 * 3. Finally see the full queue dynamics
 *
 * This "show not tell" approach lets players understand
 * both processes before seeing how they interact.
 */

class CafeAnimation extends BaseAnimation {
    constructor(canvas, config = {}) {
        super(canvas, config);

        // Configuration
        this.interarrivalMean = config.interarrivalMean || 3;  // minutes
        this.serviceMean = config.serviceMean || 2.5;
        this.serviceStd = config.serviceStd || 1;
        this.simulationMinutes = config.simulationMinutes || 60;
        this.waitThreshold = config.waitThreshold || 10;

        this.resetState();
    }

    resetState() {
        this.phase = 'arrivals';  // arrivals, service, simulation
        this.phaseTime = 0;
        this.simTime = 0;

        // Phase 1: Arrival observations
        this.arrivalTimes = [];
        this.arrivalIntervals = [];

        // Phase 2: Service observations
        this.serviceTimes = [];

        // Phase 3: Full simulation
        this.customers = [];
        this.queue = [];
        this.beingServed = null;
        this.servedCustomers = [];
        this.nextCustomerId = 0;
        this.nextArrivalTime = 0;

        this.collectedData = {
            arrivalIntervals: [],
            meanArrivalInterval: 0,
            serviceTimes: [],
            meanServiceTime: 0,
            waitTimes: [],
            maxWait: 0,
            probabilityLongWait: 0,
            customersWithLongWait: 0,
            totalCustomers: 0
        };
    }

    updateLayout() {
        // Guard against zero dimensions
        if (!this.width || !this.height) return;

        const padding = 30;

        // Counter position
        this.counterX = this.width - 100;
        this.counterY = this.height * 0.45;

        // Queue area
        this.queueY = this.counterY;
        this.queueStartX = this.counterX - 50;

        // Customer size
        this.customerSize = 25;
        this.customerSpacing = 35;

        // Timeline area (for phases 1 & 2)
        this.timelineX = padding;
        this.timelineY = 100;
        this.timelineWidth = this.width - padding * 2;
        this.timelineHeight = 150;
    }

    update(dt) {
        this.phaseTime += dt;

        if (this.phase === 'arrivals') {
            this.updateArrivalsPhase(dt);
        } else if (this.phase === 'service') {
            this.updateServicePhase(dt);
        } else if (this.phase === 'simulation') {
            this.updateSimulationPhase(dt);
        }

        // Stats callback
        if (this.onStatsUpdate) {
            this.onStatsUpdate({
                phase: this.phase,
                simTime: this.simTime,
                queueLength: this.queue.length,
                customersServed: this.servedCustomers.length,
                maxWait: this.collectedData.maxWait
            });
        }
    }

    updateArrivalsPhase(dt) {
        // Show ~20 arrivals over 10 seconds real time
        const arrivalsToShow = 20;
        const phaseDuration = 10;  // seconds

        if (this.arrivalTimes.length < arrivalsToShow) {
            const targetCount = Math.floor((this.phaseTime / phaseDuration) * arrivalsToShow);

            while (this.arrivalTimes.length < targetCount && this.arrivalTimes.length < arrivalsToShow) {
                const interval = Distributions.sampleExponential(this.interarrivalMean);
                const lastTime = this.arrivalTimes.length > 0 ?
                    this.arrivalTimes[this.arrivalTimes.length - 1] : 0;
                const newTime = lastTime + interval;

                this.arrivalTimes.push(newTime);
                this.arrivalIntervals.push(interval);
                this.collectedData.arrivalIntervals.push(interval);

                // Update mean
                const sum = this.collectedData.arrivalIntervals.reduce((a, b) => a + b, 0);
                this.collectedData.meanArrivalInterval = sum / this.collectedData.arrivalIntervals.length;

                if (this.onDataUpdate) {
                    this.onDataUpdate(this.collectedData);
                }
            }
        }

        // Transition after showing all arrivals + pause
        if (this.phaseTime > phaseDuration + 2) {
            this.phase = 'service';
            this.phaseTime = 0;
        }
    }

    updateServicePhase(dt) {
        // Show ~15 service times over 8 seconds
        const servicesToShow = 15;
        const phaseDuration = 8;

        if (this.serviceTimes.length < servicesToShow) {
            const targetCount = Math.floor((this.phaseTime / phaseDuration) * servicesToShow);

            while (this.serviceTimes.length < targetCount && this.serviceTimes.length < servicesToShow) {
                const serviceTime = Distributions.sampleLognormal(this.serviceMean, this.serviceStd);
                this.serviceTimes.push(serviceTime);
                this.collectedData.serviceTimes.push(serviceTime);

                // Update mean
                const sum = this.collectedData.serviceTimes.reduce((a, b) => a + b, 0);
                this.collectedData.meanServiceTime = sum / this.collectedData.serviceTimes.length;

                if (this.onDataUpdate) {
                    this.onDataUpdate(this.collectedData);
                }
            }
        }

        // Transition after showing all + pause
        if (this.phaseTime > phaseDuration + 2) {
            this.phase = 'simulation';
            this.phaseTime = 0;
            this.simTime = 0;
            this.scheduleNextArrival();
        }
    }

    scheduleNextArrival() {
        const interval = Distributions.sampleExponential(this.interarrivalMean);
        this.nextArrivalTime = this.simTime + interval;
    }

    createCustomer(arrivalTime) {
        const serviceTime = Distributions.sampleLognormal(this.serviceMean, this.serviceStd);
        const colors = ['#3498db', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

        return {
            id: this.nextCustomerId++,
            arrivalTime,
            serviceTime,
            serviceStartTime: null,
            waitTime: 0,
            x: 30,
            y: this.queueY,
            targetX: 30,
            color: colors[Math.floor(Math.random() * colors.length)],
            state: 'arriving',
            opacity: 1
        };
    }

    updateSimulationPhase(dt) {
        // Advance sim time (1 real second = 2 simulated minutes)
        const timeScale = 2;
        this.simTime += dt * timeScale;

        // Check for arrivals
        while (this.nextArrivalTime <= this.simTime && this.simTime < this.simulationMinutes) {
            const customer = this.createCustomer(this.nextArrivalTime);
            this.customers.push(customer);
            this.queue.push(customer);
            this.scheduleNextArrival();
        }

        // Process service
        if (!this.beingServed && this.queue.length > 0) {
            const customer = this.queue.shift();
            customer.serviceStartTime = this.simTime;
            customer.waitTime = customer.serviceStartTime - customer.arrivalTime;
            customer.state = 'serving';
            this.beingServed = customer;

            // Track stats
            this.collectedData.waitTimes.push(customer.waitTime);
            this.collectedData.maxWait = Math.max(this.collectedData.maxWait, customer.waitTime);
            this.collectedData.totalCustomers++;

            if (customer.waitTime > this.waitThreshold) {
                this.collectedData.customersWithLongWait++;
            }

            this.collectedData.probabilityLongWait =
                this.collectedData.totalCustomers > 0 ?
                (this.collectedData.customersWithLongWait / this.collectedData.totalCustomers) * 100 : 0;

            if (this.onDataUpdate) {
                this.onDataUpdate(this.collectedData);
            }
        }

        // Check if service complete
        if (this.beingServed) {
            const endTime = this.beingServed.serviceStartTime + this.beingServed.serviceTime;
            if (this.simTime >= endTime) {
                this.beingServed.state = 'leaving';
                this.servedCustomers.push(this.beingServed);
                this.beingServed = null;
            }
        }

        // Update queue positions
        for (let i = 0; i < this.queue.length; i++) {
            const customer = this.queue[i];
            customer.state = 'queuing';
            customer.targetX = this.queueStartX - i * this.customerSpacing;
        }

        if (this.beingServed) {
            this.beingServed.targetX = this.counterX - 30;
        }

        // Animate customer positions
        const moveSpeed = 200;
        for (const customer of this.customers) {
            const dx = customer.targetX - customer.x;
            if (Math.abs(dx) > 1) {
                customer.x += Math.sign(dx) * Math.min(moveSpeed * dt, Math.abs(dx));
            }

            // Leaving customers
            if (customer.state === 'leaving') {
                customer.targetX = this.width + 50;
                if (customer.x > this.width) {
                    customer.opacity -= dt * 2;
                }
            }
        }

        // Remove faded customers
        this.customers = this.customers.filter(c => c.opacity > 0);
        this.servedCustomers = this.servedCustomers.filter(c => c.opacity > 0);

        // Check if simulation done
        if (this.simTime >= this.simulationMinutes && this.queue.length === 0 && !this.beingServed) {
            this.finish();
        }
    }

    draw() {
        super.draw();
        // Guard against uninitialized layout
        if (!this.counterX || !this.timelineX) return;

        const ctx = this.ctx;

        if (this.phase === 'arrivals') {
            this.drawArrivalsPhase();
        } else if (this.phase === 'service') {
            this.drawServicePhase();
        } else {
            this.drawSimulationPhase();
        }
    }

    drawArrivalsPhase() {
        const ctx = this.ctx;

        // Header
        ctx.fillStyle = '#333';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Vaihe 1: Tarkkaile asiakkaiden saapumista', 20, 30);

        ctx.font = '14px system-ui, sans-serif';
        ctx.fillStyle = '#666';
        ctx.fillText('Kuinka usein asiakkaita saapuu?', 20, 55);

        // Timeline
        this.drawArrivalTimeline();

        // Interval statistics
        this.drawIntervalStats();
    }

    drawArrivalTimeline() {
        const ctx = this.ctx;
        const maxTime = this.arrivalTimes.length > 0 ?
            Math.max(60, this.arrivalTimes[this.arrivalTimes.length - 1] + 5) : 60;

        // Timeline background
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(this.timelineX, this.timelineY, this.timelineWidth, 60);

        // Arrivals
        for (let i = 0; i < this.arrivalTimes.length; i++) {
            const time = this.arrivalTimes[i];
            const x = this.timelineX + (time / maxTime) * this.timelineWidth;

            // Customer icon
            ctx.fillStyle = '#3498db';
            ctx.beginPath();
            ctx.arc(x, this.timelineY + 30, 8, 0, Math.PI * 2);
            ctx.fill();

            // Interval line to previous
            if (i > 0) {
                const prevX = this.timelineX + (this.arrivalTimes[i - 1] / maxTime) * this.timelineWidth;
                ctx.strokeStyle = '#aaa';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(prevX + 8, this.timelineY + 30);
                ctx.lineTo(x - 8, this.timelineY + 30);
                ctx.stroke();

                // Interval label
                ctx.fillStyle = '#666';
                ctx.font = '10px system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(
                    this.arrivalIntervals[i].toFixed(1),
                    (prevX + x) / 2,
                    this.timelineY + 50
                );
            }
        }

        // Time axis
        ctx.fillStyle = '#666';
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        for (let t = 0; t <= maxTime; t += 10) {
            const x = this.timelineX + (t / maxTime) * this.timelineWidth;
            ctx.fillText(`${t}min`, x, this.timelineY + 75);
        }
    }

    drawIntervalStats() {
        const ctx = this.ctx;
        const y = this.timelineY + 100;

        if (this.arrivalIntervals.length > 0) {
            ctx.fillStyle = '#333';
            ctx.font = '14px system-ui, sans-serif';
            ctx.textAlign = 'left';

            ctx.fillText(
                `Havaitut saapumisvälit: ${this.arrivalIntervals.length} kpl`,
                this.timelineX, y
            );
            ctx.fillText(
                `Keskimääräinen väli: ${this.collectedData.meanArrivalInterval.toFixed(1)} min`,
                this.timelineX, y + 25
            );
        }
    }

    drawServicePhase() {
        const ctx = this.ctx;

        // Header
        ctx.fillStyle = '#333';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Vaihe 2: Tarkkaile palveluaikoja', 20, 30);

        ctx.font = '14px system-ui, sans-serif';
        ctx.fillStyle = '#666';
        ctx.fillText('Kuinka kauan tilauksen tekeminen kestää?', 20, 55);

        // Service time bars
        const barWidth = 40;
        const barSpacing = 50;
        const maxHeight = 100;
        const maxService = Math.max(5, ...this.serviceTimes);

        const startX = this.timelineX;
        const startY = this.timelineY + 120;

        for (let i = 0; i < this.serviceTimes.length; i++) {
            const service = this.serviceTimes[i];
            const x = startX + i * barSpacing;
            const height = (service / maxService) * maxHeight;

            // Bar
            ctx.fillStyle = '#27ae60';
            ctx.fillRect(x, startY - height, barWidth, height);

            // Label
            ctx.fillStyle = '#333';
            ctx.font = '11px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(service.toFixed(1), x + barWidth / 2, startY + 15);
        }

        // Mean line
        if (this.collectedData.meanServiceTime > 0) {
            const meanY = startY - (this.collectedData.meanServiceTime / maxService) * maxHeight;

            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(startX - 20, meanY);
            ctx.lineTo(startX + this.serviceTimes.length * barSpacing, meanY);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#e74c3c';
            ctx.font = '12px system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(
                `Keskiarvo: ${this.collectedData.meanServiceTime.toFixed(1)} min`,
                startX, startY + 40
            );
        }
    }

    drawSimulationPhase() {
        const ctx = this.ctx;

        // Header
        ctx.fillStyle = '#333';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Vaihe 3: Koko simulaatio', 20, 30);

        // Clock
        const minutes = Math.floor(this.simTime);
        ctx.font = 'bold 24px monospace';
        ctx.fillText(`${minutes.toString().padStart(2, '0')}:00`, 20, 65);

        // Progress bar
        const progress = this.simTime / this.simulationMinutes;
        ctx.fillStyle = '#ddd';
        ctx.fillRect(100, 50, 200, 10);
        ctx.fillStyle = '#3498db';
        ctx.fillRect(100, 50, 200 * progress, 10);

        // Counter
        this.drawCounter();

        // Queue
        this.drawQueue();

        // Stats
        this.drawSimStats();
    }

    drawCounter() {
        const ctx = this.ctx;

        // Counter
        ctx.fillStyle = '#8b4513';
        this.drawRoundedRect(
            this.counterX - 40,
            this.counterY - 50,
            80,
            100,
            5
        );
        ctx.fill();

        // Barista (simple)
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('☕', this.counterX, this.counterY);

        // Being served
        if (this.beingServed) {
            const c = this.beingServed;
            ctx.fillStyle = c.color;
            ctx.beginPath();
            ctx.arc(c.x, c.y, this.customerSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawQueue() {
        const ctx = this.ctx;

        // Queue line
        ctx.strokeStyle = '#ccc';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(30, this.queueY);
        ctx.lineTo(this.queueStartX, this.queueY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Customers in queue
        for (const customer of this.queue) {
            ctx.globalAlpha = customer.opacity;
            ctx.fillStyle = customer.color;
            ctx.beginPath();
            ctx.arc(customer.x, customer.y, this.customerSize / 2, 0, Math.PI * 2);
            ctx.fill();

            // Wait time indicator
            const waitTime = this.simTime - customer.arrivalTime;
            if (waitTime > 2) {
                ctx.fillStyle = waitTime > this.waitThreshold ? '#e74c3c' : '#666';
                ctx.font = '10px system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`${waitTime.toFixed(0)}m`, customer.x, customer.y - 20);
            }
        }
        ctx.globalAlpha = 1;

        // Leaving customers
        for (const customer of this.servedCustomers) {
            if (customer.state === 'leaving') {
                ctx.globalAlpha = customer.opacity;
                ctx.fillStyle = customer.color;
                ctx.beginPath();
                ctx.arc(customer.x, customer.y, this.customerSize / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }

    drawSimStats() {
        const ctx = this.ctx;
        const data = this.collectedData;

        ctx.fillStyle = '#333';
        ctx.font = '14px system-ui, sans-serif';
        ctx.textAlign = 'left';

        const statsX = 20;
        const statsY = this.height - 80;

        ctx.fillText(`Jonossa: ${this.queue.length}`, statsX, statsY);
        ctx.fillText(`Palveltu: ${this.servedCustomers.length}`, statsX + 100, statsY);

        if (data.totalCustomers > 0) {
            ctx.fillText(`Pisin odotus: ${data.maxWait.toFixed(1)} min`, statsX, statsY + 25);

            const longWaitPct = data.probabilityLongWait.toFixed(0);
            ctx.fillStyle = data.customersWithLongWait > 0 ? '#e74c3c' : '#27ae60';
            ctx.fillText(
                `Yli ${this.waitThreshold} min odottaneet: ${data.customersWithLongWait} (${longWaitPct}%)`,
                statsX, statsY + 50
            );
        }
    }
}

// Self-register with AnimationRegistry
if (typeof AnimationRegistry !== 'undefined') {
    AnimationRegistry.register('cafe', {
        class: CafeAnimation,
        statsConfig: {
            phase: { label: 'Vaihe', initial: '1/3' },
            queue: { label: 'Jonossa', initial: '0' }
        },
        outputs: ['arrivalIntervals', 'meanArrivalInterval', 'serviceTimes', 'meanServiceTime', 'waitTimes', 'maxWait', 'probabilityLongWait', 'customersWithLongWait', 'totalCustomers'],
        statsMapper: (stats) => {
            const phaseNum = stats.phase === 'arrivals' ? 1 : stats.phase === 'service' ? 2 : 3;
            return {
                phase: `${phaseNum}/3`,
                queue: stats.queueLength
            };
        }
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CafeAnimation;
}
