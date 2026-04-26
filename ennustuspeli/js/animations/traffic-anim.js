/**
 * Traffic Animation
 *
 * Simple traffic flow simulation for the bonus narrative.
 * Shows vehicles moving through a network.
 */

class TrafficAnimation extends BaseAnimation {
    constructor(canvas, config = {}) {
        super(canvas, config);

        // DGP parameters
        this.arrivalRate = config.dgp?.arrivalRate || 20;  // vehicles per minute
        this.roadCapacity = config.dgp?.capacity || 30;  // max vehicles per road segment
        this.numSegments = config.dgp?.numSegments || 3;
        this.simulationMinutes = config.dgp?.minutes || 10;
        this.timeScale = config.timeScale || 30;  // simulation seconds per real second

        // Disruption
        this.disruption = config.dgp?.disruption || null;  // {startTime, duration, segment, capacityReduction}

        this.resetState();
    }

    resetState() {
        this.simulationTime = 0;
        this.totalMinutes = this.simulationMinutes;

        // Road segments
        this.segments = [];
        for (let i = 0; i < this.numSegments; i++) {
            this.segments.push({
                id: i,
                vehicles: [],
                capacity: this.roadCapacity,
                flow: 0,
                congested: false
            });
        }

        // Vehicles
        this.vehicles = [];
        this.nextVehicleId = 0;
        this.nextArrival = 0;
        this.scheduleNextArrival();

        // Histogram for travel times
        this.travelTimeHist = new HistogramComponent({
            label: 'Matka-aikajakauma',
            showMean: true,
            unit: ' min'
        });

        this.collectedData = {
            vehiclesCompleted: 0,
            avgTravelTime: 0,
            maxCongestion: 0,
            congestionEvents: 0
        };
    }

    scheduleNextArrival() {
        const interarrival = Distributions.sampleExponential(60 / this.arrivalRate);
        this.nextArrival = this.simulationTime + interarrival;
    }

    updateLayout() {
        // Road visualization
        this.roadArea = {
            x: 40,
            y: 50,
            width: this.width - 80,
            height: 100
        };

        // Stats area
        this.histArea = {
            x: 40,
            y: 180,
            width: this.width - 80,
            height: this.height - 220
        };
    }

    getSegmentCapacity(segmentId) {
        let capacity = this.roadCapacity;

        // Check for disruption
        if (this.disruption &&
            this.simulationTime >= this.disruption.startTime * 60 &&
            this.simulationTime < (this.disruption.startTime + this.disruption.duration) * 60 &&
            segmentId === this.disruption.segment) {
            capacity *= (1 - this.disruption.capacityReduction);
        }

        return capacity;
    }

    update(dt) {
        const simDt = dt * this.timeScale;
        this.simulationTime += simDt;

        // Vehicle arrivals
        while (this.nextArrival <= this.simulationTime && this.simulationTime < this.totalMinutes * 60) {
            // Create new vehicle
            const vehicle = {
                id: this.nextVehicleId++,
                entryTime: this.nextArrival,
                segment: 0,
                position: 0,  // 0 to 1 within segment
                exitTime: null
            };
            this.vehicles.push(vehicle);
            this.segments[0].vehicles.push(vehicle.id);
            this.scheduleNextArrival();
        }

        // Update segment congestion
        this.segments.forEach((seg, i) => {
            const capacity = this.getSegmentCapacity(i);
            seg.congested = seg.vehicles.length > capacity * 0.8;
            if (seg.vehicles.length > capacity) {
                this.collectedData.congestionEvents++;
            }
            this.collectedData.maxCongestion = Math.max(
                this.collectedData.maxCongestion,
                seg.vehicles.length / capacity
            );
        });

        // Move vehicles
        for (const vehicle of this.vehicles) {
            if (vehicle.exitTime !== null) continue;

            const seg = this.segments[vehicle.segment];
            const capacity = this.getSegmentCapacity(vehicle.segment);

            // Speed depends on congestion
            const congestionFactor = Math.min(1, capacity / Math.max(1, seg.vehicles.length));
            const baseSpeed = 1 / 60;  // Base: 1 minute per segment
            const speed = baseSpeed * congestionFactor;

            vehicle.position += speed * simDt;

            // Move to next segment
            if (vehicle.position >= 1) {
                // Remove from current segment
                seg.vehicles = seg.vehicles.filter(id => id !== vehicle.id);

                if (vehicle.segment < this.numSegments - 1) {
                    // Move to next segment
                    vehicle.segment++;
                    vehicle.position = 0;
                    this.segments[vehicle.segment].vehicles.push(vehicle.id);
                } else {
                    // Exit network
                    vehicle.exitTime = this.simulationTime;
                    const travelTime = (vehicle.exitTime - vehicle.entryTime) / 60;  // minutes
                    this.travelTimeHist.addPoint(travelTime);
                    this.collectedData.vehiclesCompleted++;
                    this.collectedData.avgTravelTime = this.travelTimeHist.getStats().mean;
                }
            }
        }

        // Stats callback
        if (this.onStatsUpdate) {
            this.onStatsUpdate({
                time: this.formatTime(this.simulationTime / 60),
                completed: this.collectedData.vehiclesCompleted,
                avgTime: this.collectedData.avgTravelTime
            });
        }

        if (this.onDataUpdate) {
            this.onDataUpdate(this.collectedData);
        }

        // Check completion
        if (this.simulationTime >= this.totalMinutes * 60) {
            this.finish();
        }
    }

    draw() {
        super.draw();
        if (!this.roadArea) return;

        const ctx = this.ctx;

        // Title
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Liikennesimulaatio', this.width / 2, 25);

        // Draw road segments
        this.drawRoad(ctx);

        // Draw histogram
        if (this.collectedData.vehiclesCompleted > 0) {
            this.travelTimeHist.draw(ctx, this.histArea.x, this.histArea.y,
                                     this.histArea.width, this.histArea.height);
        }

        // Progress bar
        const progress = this.simulationTime / (this.totalMinutes * 60);
        this.drawProgressBar(40, this.height - 20, this.width - 80, 10, progress);

        // Time display
        ctx.fillStyle = '#666';
        ctx.font = '11px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText(this.formatTime(this.simulationTime / 60), this.width - 40, 40);
    }

    drawRoad(ctx) {
        const area = this.roadArea;
        const segWidth = area.width / this.numSegments;

        // Draw segments
        this.segments.forEach((seg, i) => {
            const x = area.x + i * segWidth;
            const capacity = this.getSegmentCapacity(i);
            const congestionLevel = seg.vehicles.length / capacity;

            // Road background
            ctx.fillStyle = congestionLevel > 1 ? '#e74c3c' :
                           congestionLevel > 0.8 ? '#f39c12' :
                           '#95a5a6';
            ctx.fillRect(x + 2, area.y, segWidth - 4, area.height);

            // Road markings
            ctx.strokeStyle = '#fff';
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.moveTo(x + 2, area.y + area.height / 2);
            ctx.lineTo(x + segWidth - 2, area.y + area.height / 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Segment label
            ctx.fillStyle = '#333';
            ctx.font = '10px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(`Osuus ${i + 1}`, x + segWidth / 2, area.y + area.height + 15);

            // Vehicle count
            ctx.fillText(`${seg.vehicles.length}/${Math.round(capacity)}`,
                        x + segWidth / 2, area.y - 5);
        });

        // Draw vehicles (simplified)
        for (const vehicle of this.vehicles) {
            if (vehicle.exitTime !== null) continue;

            const segX = area.x + vehicle.segment * segWidth;
            const x = segX + vehicle.position * segWidth;
            const y = area.y + area.height / 2 + (vehicle.id % 2 === 0 ? -15 : 15);

            ctx.fillStyle = '#3498db';
            ctx.fillRect(x - 6, y - 4, 12, 8);
        }

        // Draw disruption indicator
        if (this.disruption &&
            this.simulationTime >= this.disruption.startTime * 60 &&
            this.simulationTime < (this.disruption.startTime + this.disruption.duration) * 60) {
            const disruptX = area.x + this.disruption.segment * segWidth + segWidth / 2;
            ctx.fillStyle = '#e74c3c';
            ctx.font = 'bold 16px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('⚠', disruptX, area.y + area.height / 2);
        }

        // Arrows between segments
        ctx.fillStyle = '#666';
        for (let i = 0; i < this.numSegments - 1; i++) {
            const x = area.x + (i + 1) * segWidth;
            ctx.beginPath();
            ctx.moveTo(x - 5, area.y + area.height / 2 - 8);
            ctx.lineTo(x + 5, area.y + area.height / 2);
            ctx.lineTo(x - 5, area.y + area.height / 2 + 8);
            ctx.fill();
        }
    }
}

// Self-register
if (typeof AnimationRegistry !== 'undefined') {
    AnimationRegistry.register('traffic', {
        class: TrafficAnimation,
        statsConfig: {
            time: { label: 'Aika', initial: '00:00' },
            completed: { label: 'Valmiita', initial: '0' },
            avgTime: { label: 'Keskim. aika', initial: '-' }
        },
        outputs: ['vehiclesCompleted', 'avgTravelTime', 'maxCongestion', 'congestionEvents'],
        statsMapper: (stats) => ({
            time: stats.time,
            completed: stats.completed,
            avgTime: stats.avgTime ? `${stats.avgTime.toFixed(1)} min` : '-'
        })
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrafficAnimation;
}
