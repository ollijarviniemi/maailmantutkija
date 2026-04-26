/**
 * Store Animation
 *
 * Visualizes customer arrivals and departures in a store.
 * Uses StoreComponent for rendering.
 */

class StoreAnimation extends BaseAnimation {
    constructor(canvas, config = {}) {
        super(canvas, config);

        // DGP parameters
        this.arrivalRate = config.dgp?.arrivalRate || 30;  // per hour
        this.serviceTime = config.dgp?.serviceTime || 10;  // minutes avg
        this.simulationHours = config.dgp?.hours || 2;
        this.timeScale = config.timeScale || 60;  // simulation minutes per real second

        // Day pattern (multipliers for each hour)
        this.dayPattern = config.dgp?.dayPattern || null;  // e.g., [0.5, 1, 1.5, 1, 0.5]

        // Threshold for questions
        this.threshold = config.threshold || null;

        this.resetState();
    }

    resetState() {
        // Create store component
        this.store = new StoreComponent({
            maxOccupancy: 150,
            highlightThreshold: this.threshold,
            showClock: true
        });

        this.simulationTime = 0;  // in minutes
        this.totalMinutes = this.simulationHours * 60;
        this.nextArrival = 0;
        this.customerExits = [];  // scheduled exit times

        this.collectedData = {
            peakOccupancy: 0,
            avgOccupancy: 0,
            totalArrivals: 0,
            timeAboveThreshold: 0,
            occupancyHistory: []
        };

        // Schedule first arrival
        this.scheduleNextArrival();
    }

    updateLayout() {
        // Layout: store on left, history chart on right
        this.storeArea = {
            x: 10,
            y: 30,
            width: this.width * 0.45,
            height: this.height - 60
        };

        this.chartArea = {
            x: this.width * 0.52,
            y: 30,
            width: this.width * 0.45,
            height: this.height - 60
        };
    }

    getCurrentArrivalRate() {
        if (!this.dayPattern) return this.arrivalRate;

        // Map simulation time to pattern index
        const hourInSim = this.simulationTime / 60;
        const patternIdx = Math.min(
            Math.floor(hourInSim / this.simulationHours * this.dayPattern.length),
            this.dayPattern.length - 1
        );
        return this.arrivalRate * this.dayPattern[patternIdx];
    }

    scheduleNextArrival() {
        const rate = this.getCurrentArrivalRate() / 60;  // per minute
        const interarrival = Distributions.sampleExponential(1 / rate);
        this.nextArrival = this.simulationTime + interarrival;
    }

    scheduleExit(customerId) {
        const stayTime = Distributions.sampleExponential(this.serviceTime);
        this.customerExits.push({
            customerId,
            exitTime: this.simulationTime + stayTime
        });
        this.customerExits.sort((a, b) => a.exitTime - b.exitTime);
    }

    update(dt) {
        const simDt = dt * this.timeScale;
        this.simulationTime += simDt;
        this.store.currentTime = this.simulationTime;

        // Process arrivals
        while (this.nextArrival <= this.simulationTime && this.simulationTime < this.totalMinutes) {
            const customerId = this.store.customerEnters(this.nextArrival);
            this.collectedData.totalArrivals++;
            this.scheduleExit(customerId);
            this.scheduleNextArrival();
        }

        // Process exits
        while (this.customerExits.length > 0 && this.customerExits[0].exitTime <= this.simulationTime) {
            const exit = this.customerExits.shift();
            this.store.customerExits(exit.customerId, exit.exitTime);
        }

        // Track statistics
        const currentOcc = this.store.currentOccupancy;
        this.collectedData.peakOccupancy = Math.max(this.collectedData.peakOccupancy, currentOcc);
        this.collectedData.occupancyHistory.push({
            time: this.simulationTime,
            occupancy: currentOcc
        });

        // Time above threshold
        if (this.threshold !== null && currentOcc >= this.threshold) {
            this.collectedData.timeAboveThreshold += simDt;
        }

        // Update average
        const history = this.collectedData.occupancyHistory;
        this.collectedData.avgOccupancy = history.reduce((s, h) => s + h.occupancy, 0) / history.length;

        // Stats callback
        if (this.onStatsUpdate) {
            this.onStatsUpdate({
                time: this.formatTime(this.simulationTime),
                current: currentOcc,
                peak: this.collectedData.peakOccupancy
            });
        }

        if (this.onDataUpdate) {
            this.onDataUpdate(this.collectedData);
        }

        // Check completion
        if (this.simulationTime >= this.totalMinutes) {
            this.finish();
        }
    }

    draw() {
        super.draw();
        if (!this.storeArea) return;

        const ctx = this.ctx;

        // Title
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Kaupan asiakasmäärä', this.width / 2, 20);

        // Draw store
        this.store.draw(ctx, this.storeArea.x, this.storeArea.y,
                        this.storeArea.width, this.storeArea.height);

        // Draw history chart
        this.store.drawHistory(ctx, this.chartArea.x, this.chartArea.y,
                               this.chartArea.width, this.chartArea.height);

        // Progress bar
        const progress = this.simulationTime / this.totalMinutes;
        this.drawProgressBar(10, this.height - 20, this.width - 20, 10, progress);
    }
}

// Self-register
if (typeof AnimationRegistry !== 'undefined') {
    AnimationRegistry.register('store', {
        class: StoreAnimation,
        statsConfig: {
            time: { label: 'Aika', initial: '00:00' },
            current: { label: 'Asiakkaita', initial: '0' },
            peak: { label: 'Huippu', initial: '0' }
        },
        outputs: ['peakOccupancy', 'avgOccupancy', 'totalArrivals', 'timeAboveThreshold', 'occupancyHistory'],
        statsMapper: (stats) => ({
            time: stats.time,
            current: stats.current,
            peak: stats.peak
        })
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StoreAnimation;
}
