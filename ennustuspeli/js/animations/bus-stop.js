/**
 * Bus Stop Animation
 *
 * Demonstrates the inspection paradox: when arriving at random,
 * you're more likely to land in a long gap, so average wait
 * equals the mean interval, not half of it.
 */

class BusStopAnimation extends BaseAnimation {
    constructor(canvas, config = {}) {
        super(canvas, config);

        // Configuration
        this.meanInterval = config.meanInterval || 10;  // minutes
        this.simulationLength = config.simulationLength || 120;  // minutes
        this.numTrials = config.numTrials || 20;

        this.resetState();
    }

    resetState() {
        this.phase = 'generating';  // generating, showing-arrivals, showing-waits
        this.busArrivals = [];
        this.personTrials = [];
        this.currentTrial = 0;
        this.phaseTime = 0;

        // Generate bus arrivals
        let time = 0;
        while (time < this.simulationLength) {
            const interval = Distributions.sampleExponential(this.meanInterval);
            time += interval;
            if (time < this.simulationLength) {
                this.busArrivals.push({
                    time,
                    interval,
                    x: 0,
                    shown: false
                });
            }
        }

        // Store intervals for display
        this.intervals = [];
        for (let i = 0; i < this.busArrivals.length; i++) {
            this.intervals.push({
                start: i === 0 ? 0 : this.busArrivals[i - 1].time,
                end: this.busArrivals[i].time,
                length: this.busArrivals[i].interval
            });
        }

        this.collectedData = {
            intervals: this.intervals.map(i => i.length),
            meanInterval: 0,
            waitTimes: [],
            averageWait: 0
        };

        // Calculate actual mean interval
        if (this.intervals.length > 0) {
            this.collectedData.meanInterval = this.intervals.reduce((s, i) => s + i.length, 0) / this.intervals.length;
        }

        this.animationPhase = 0;
        this.phaseProgress = 0;
    }

    updateLayout() {
        // Guard against zero dimensions
        if (!this.width || !this.height) return;

        const padding = 40;

        // Timeline area (main view)
        this.timelineX = padding;
        this.timelineY = 100;
        this.timelineWidth = this.width - padding * 2;
        this.timelineHeight = 60;

        // Intervals visualization area
        this.intervalsY = 200;
        this.intervalsHeight = 80;

        // Trials area
        this.trialsY = 320;
        this.trialsHeight = this.height - 360;
    }

    update(dt) {
        this.phaseTime += dt;

        if (this.phase === 'generating') {
            // Quick phase to show buses appearing
            const busesPerSecond = 3;
            const busesToShow = Math.floor(this.phaseTime * busesPerSecond);

            for (let i = 0; i < Math.min(busesToShow, this.busArrivals.length); i++) {
                this.busArrivals[i].shown = true;
            }

            if (busesToShow >= this.busArrivals.length) {
                this.phase = 'showing-arrivals';
                this.phaseTime = 0;
            }
        } else if (this.phase === 'showing-arrivals') {
            // Pause to let player observe the intervals
            if (this.phaseTime > 2) {
                this.phase = 'showing-waits';
                this.phaseTime = 0;
                this.startTrial();  // Start the first trial
            }
        } else if (this.phase === 'showing-waits') {
            // Show person arriving and waiting
            const trialDuration = 1.5;  // seconds per trial

            if (this.currentTrial < this.numTrials) {
                const trialProgress = this.phaseTime / trialDuration;

                if (trialProgress >= 1) {
                    // Complete this trial
                    this.finishTrial();
                    this.currentTrial++;
                    this.phaseTime = 0;

                    if (this.currentTrial < this.numTrials) {
                        this.startTrial();
                    }
                } else {
                    // Animate current trial
                    this.updateTrial(trialProgress);
                }
            } else {
                this.finish();
            }
        }

        // Stats update
        if (this.onStatsUpdate) {
            this.onStatsUpdate({
                busCount: this.busArrivals.filter(b => b.shown).length,
                meanInterval: this.collectedData.meanInterval,
                trialsCompleted: this.personTrials.length,
                averageWait: this.collectedData.averageWait
            });
        }
    }

    startTrial() {
        // Person arrives at random time
        const arrivalTime = Math.random() * this.simulationLength;

        // Find next bus
        let nextBus = null;
        for (const bus of this.busArrivals) {
            if (bus.time > arrivalTime) {
                nextBus = bus;
                break;
            }
        }

        // Find which interval they landed in
        let intervalIndex = -1;
        for (let i = 0; i < this.intervals.length; i++) {
            if (arrivalTime >= this.intervals[i].start && arrivalTime < this.intervals[i].end) {
                intervalIndex = i;
                break;
            }
        }

        const waitTime = nextBus ? nextBus.time - arrivalTime : 0;

        this.currentTrialData = {
            arrivalTime,
            nextBusTime: nextBus ? nextBus.time : null,
            waitTime,
            intervalIndex,
            intervalLength: intervalIndex >= 0 ? this.intervals[intervalIndex].length : 0,
            progress: 0
        };
    }

    updateTrial(progress) {
        if (this.currentTrialData) {
            this.currentTrialData.progress = progress;
        }
    }

    finishTrial() {
        if (this.currentTrialData && this.currentTrialData.nextBusTime !== null) {
            this.personTrials.push({
                arrivalTime: this.currentTrialData.arrivalTime,
                waitTime: this.currentTrialData.waitTime,
                intervalLength: this.currentTrialData.intervalLength
            });

            this.collectedData.waitTimes.push(this.currentTrialData.waitTime);

            // Update average
            const sum = this.collectedData.waitTimes.reduce((a, b) => a + b, 0);
            this.collectedData.averageWait = sum / this.collectedData.waitTimes.length;

            if (this.onDataUpdate) {
                this.onDataUpdate(this.collectedData);
            }
        }

        this.currentTrialData = null;
    }

    draw() {
        super.draw();
        // Guard against uninitialized layout
        if (!this.timelineX || !this.timelineWidth) return;

        const ctx = this.ctx;

        this.drawHeader();
        this.drawTimeline();
        this.drawIntervals();
        this.drawTrials();
        this.drawCurrentTrial();
    }

    drawHeader() {
        const ctx = this.ctx;

        ctx.fillStyle = '#333';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.textAlign = 'left';

        if (this.phase === 'generating') {
            ctx.fillText('Bussit saapuvat pysäkille...', 20, 30);
        } else if (this.phase === 'showing-arrivals') {
            ctx.fillText(`${this.busArrivals.length} bussia 2 tunnin aikana. Huomaa välit!`, 20, 30);
        } else {
            ctx.fillText(`Saavut satunnaiseen aikaan. Kuinka kauan odotat?`, 20, 30);
        }

        // Show calculated mean
        if (this.collectedData.meanInterval > 0) {
            ctx.font = '14px system-ui, sans-serif';
            ctx.fillStyle = '#666';
            ctx.fillText(
                `Bussien keskimääräinen väli: ${this.collectedData.meanInterval.toFixed(1)} min`,
                20, 55
            );
        }
    }

    drawTimeline() {
        const ctx = this.ctx;

        // Timeline background
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(this.timelineX, this.timelineY, this.timelineWidth, this.timelineHeight);

        // Bus arrivals
        for (const bus of this.busArrivals) {
            if (!bus.shown) continue;

            const x = this.timelineX + (bus.time / this.simulationLength) * this.timelineWidth;

            // Bus icon
            ctx.fillStyle = '#2980b9';
            ctx.fillRect(x - 8, this.timelineY + 10, 16, 25);

            // Wheels
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(x - 4, this.timelineY + 38, 4, 0, Math.PI * 2);
            ctx.arc(x + 4, this.timelineY + 38, 4, 0, Math.PI * 2);
            ctx.fill();

            // Windows
            ctx.fillStyle = '#87ceeb';
            ctx.fillRect(x - 5, this.timelineY + 13, 10, 8);
        }

        // Time labels
        ctx.fillStyle = '#666';
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'center';

        for (let t = 0; t <= this.simulationLength; t += 30) {
            const x = this.timelineX + (t / this.simulationLength) * this.timelineWidth;
            ctx.fillText(`${t}min`, x, this.timelineY + this.timelineHeight + 15);
        }
    }

    drawIntervals() {
        const ctx = this.ctx;

        ctx.fillStyle = '#333';
        ctx.font = '13px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Bussien välit:', this.timelineX, this.intervalsY - 10);

        // Draw interval bars
        for (let i = 0; i < this.intervals.length && i < 12; i++) {
            const interval = this.intervals[i];
            const barWidth = (interval.length / this.meanInterval) * 60;
            const x = this.timelineX + i * 70;
            const y = this.intervalsY;

            // Bar
            ctx.fillStyle = interval.length > this.meanInterval ? '#e74c3c' : '#27ae60';
            ctx.fillRect(x, y, Math.min(barWidth, 65), 20);

            // Label
            ctx.fillStyle = '#333';
            ctx.font = '10px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(interval.length.toFixed(1), x + 30, y + 35);
        }

        // Reference line for mean
        ctx.strokeStyle = '#999';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(this.timelineX, this.intervalsY + 45);
        ctx.lineTo(this.timelineX + this.timelineWidth, this.intervalsY + 45);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#666';
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Pitkät välit = punainen, lyhyet = vihreä', this.timelineX + this.timelineWidth, this.intervalsY + 60);
    }

    drawTrials() {
        const ctx = this.ctx;

        if (this.phase !== 'showing-waits') return;

        ctx.fillStyle = '#333';
        ctx.font = '13px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Odotusajat:', this.timelineX, this.trialsY - 10);

        // Draw completed trials
        const trialsPerRow = 10;
        const trialSize = 50;

        for (let i = 0; i < this.personTrials.length; i++) {
            const trial = this.personTrials[i];
            const row = Math.floor(i / trialsPerRow);
            const col = i % trialsPerRow;

            const x = this.timelineX + col * (trialSize + 10);
            const y = this.trialsY + row * (trialSize + 25);

            // Wait time bar
            const barHeight = Math.min(40, (trial.waitTime / this.meanInterval) * 30);
            ctx.fillStyle = trial.waitTime > this.meanInterval ? '#e74c3c' : '#3498db';
            ctx.fillRect(x, y + 40 - barHeight, trialSize, barHeight);

            // Wait time label
            ctx.fillStyle = '#333';
            ctx.font = '10px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(trial.waitTime.toFixed(1), x + trialSize / 2, y + 55);
        }

        // Show running average
        if (this.collectedData.averageWait > 0) {
            ctx.fillStyle = '#333';
            ctx.font = 'bold 14px system-ui, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(
                `Keskimääräinen odotus: ${this.collectedData.averageWait.toFixed(1)} min`,
                this.timelineX + this.timelineWidth,
                this.trialsY - 10
            );
        }
    }

    drawCurrentTrial() {
        const ctx = this.ctx;

        if (!this.currentTrialData || this.phase !== 'showing-waits') return;

        const trial = this.currentTrialData;
        const arrivalX = this.timelineX + (trial.arrivalTime / this.simulationLength) * this.timelineWidth;

        // Person icon at arrival point
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(arrivalX, this.timelineY + this.timelineHeight / 2, 8, 0, Math.PI * 2);
        ctx.fill();

        // Person stick figure
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(arrivalX, this.timelineY + this.timelineHeight / 2 + 8);
        ctx.lineTo(arrivalX, this.timelineY + this.timelineHeight / 2 + 20);
        ctx.stroke();

        // Wait time visualization
        if (trial.nextBusTime !== null) {
            const nextBusX = this.timelineX + (trial.nextBusTime / this.simulationLength) * this.timelineWidth;

            // Waiting arrow
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(arrivalX, this.timelineY + this.timelineHeight / 2 - 15);
            ctx.lineTo(nextBusX, this.timelineY + this.timelineHeight / 2 - 15);
            ctx.stroke();
            ctx.setLineDash([]);

            // Wait time label
            ctx.fillStyle = '#e74c3c';
            ctx.font = 'bold 12px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(
                `${trial.waitTime.toFixed(1)} min`,
                (arrivalX + nextBusX) / 2,
                this.timelineY + this.timelineHeight / 2 - 25
            );
        }
    }
}

// Self-register with AnimationRegistry
if (typeof AnimationRegistry !== 'undefined') {
    AnimationRegistry.register('bus-stop', {
        class: BusStopAnimation,
        statsConfig: {
            buses: { label: 'Busseja', initial: '0' },
            trials: { label: 'Kokeiluja', initial: '0' }
        },
        outputs: ['intervals', 'meanInterval', 'waitTimes', 'averageWait'],
        statsMapper: (stats) => ({
            buses: stats.busCount,
            trials: stats.trialsCompleted
        })
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BusStopAnimation;
}
