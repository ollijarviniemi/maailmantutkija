/**
 * Reusable Queue Visualization Component
 *
 * For queueing theory visualizations (M/M/1, M/M/k, etc.)
 * Shows arrivals, queue, servers, and departures.
 */

class QueueVizComponent {
    constructor(config = {}) {
        this.queue = [];  // Array of {id, arrivalTime, serviceStartTime?, departureTime?}
        this.servers = [];  // Array of {id, busy, currentCustomer}
        this.numServers = config.numServers || 1;
        this.completed = [];  // Completed customers
        this.currentTime = 0;
        this.nextId = 0;

        // Visual config
        this.customerSize = config.customerSize || 12;
        this.customerColor = config.customerColor || '#3498db';
        this.serverColor = config.serverColor || '#27ae60';
        this.busyColor = config.busyColor || '#e74c3c';
        this.backgroundColor = config.backgroundColor || '#f8f8f8';

        // Stats
        this.totalArrivals = 0;
        this.totalDepartures = 0;
        this.waitTimes = [];
        this.serviceTimes = [];

        // Initialize servers
        for (let i = 0; i < this.numServers; i++) {
            this.servers.push({ id: i, busy: false, currentCustomer: null });
        }
    }

    /**
     * Reset queue
     */
    reset() {
        this.queue = [];
        this.completed = [];
        this.currentTime = 0;
        this.nextId = 0;
        this.totalArrivals = 0;
        this.totalDepartures = 0;
        this.waitTimes = [];
        this.serviceTimes = [];
        this.servers.forEach(s => {
            s.busy = false;
            s.currentCustomer = null;
        });
    }

    /**
     * Customer arrives
     */
    arrive(time = null) {
        const t = time !== null ? time : this.currentTime;
        const customer = {
            id: this.nextId++,
            arrivalTime: t,
            serviceStartTime: null,
            departureTime: null
        };
        this.queue.push(customer);
        this.totalArrivals++;
        this.tryStartService(t);
        return customer.id;
    }

    /**
     * Try to start service for waiting customers
     */
    tryStartService(time = null) {
        const t = time !== null ? time : this.currentTime;
        for (const server of this.servers) {
            if (!server.busy && this.queue.length > 0) {
                // Find first customer not yet in service
                const waiting = this.queue.filter(c => c.serviceStartTime === null);
                if (waiting.length > 0) {
                    const customer = waiting[0];
                    customer.serviceStartTime = t;
                    server.busy = true;
                    server.currentCustomer = customer.id;
                    this.waitTimes.push(t - customer.arrivalTime);
                }
            }
        }
    }

    /**
     * Complete service at a server
     */
    completeService(serverId, time = null) {
        const t = time !== null ? time : this.currentTime;
        const server = this.servers[serverId];
        if (!server || !server.busy) return null;

        const customer = this.queue.find(c => c.id === server.currentCustomer);
        if (customer) {
            customer.departureTime = t;
            this.serviceTimes.push(t - customer.serviceStartTime);
            this.completed.push(customer);
            this.queue = this.queue.filter(c => c.id !== customer.id);
            this.totalDepartures++;
        }

        server.busy = false;
        server.currentCustomer = null;
        this.tryStartService(t);

        return customer?.id || null;
    }

    /**
     * Customer leaves without service (balking/reneging)
     */
    customerLeaves(customerId, time = null) {
        const idx = this.queue.findIndex(c => c.id === customerId && c.serviceStartTime === null);
        if (idx >= 0) {
            this.queue.splice(idx, 1);
            return true;
        }
        return false;
    }

    /**
     * Get queue length (waiting only)
     */
    getQueueLength() {
        return this.queue.filter(c => c.serviceStartTime === null).length;
    }

    /**
     * Get total in system (queue + being served)
     */
    getSystemSize() {
        return this.queue.length;
    }

    /**
     * Advance time
     */
    advanceTime(dt) {
        this.currentTime += dt;
    }

    /**
     * Get statistics
     */
    getStats() {
        const avgWait = this.waitTimes.length > 0
            ? this.waitTimes.reduce((a, b) => a + b, 0) / this.waitTimes.length
            : 0;
        const avgService = this.serviceTimes.length > 0
            ? this.serviceTimes.reduce((a, b) => a + b, 0) / this.serviceTimes.length
            : 0;

        return {
            totalArrivals: this.totalArrivals,
            totalDepartures: this.totalDepartures,
            currentQueueLength: this.getQueueLength(),
            currentSystemSize: this.getSystemSize(),
            avgWaitTime: avgWait,
            avgServiceTime: avgService,
            avgTotalTime: avgWait + avgService,
            serverUtilization: this.servers.filter(s => s.busy).length / this.servers.length
        };
    }

    /**
     * Draw the queue visualization
     */
    draw(ctx, x, y, width, height) {
        const padding = 20;

        // Background
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = '#ddd';
        ctx.strokeRect(x, y, width, height);

        // Layout: [Arrivals] → [Queue] → [Servers] → [Departures]
        const sectionWidth = (width - padding * 2) / 4;
        const centerY = y + height / 2;

        // Draw arrows
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const arrowX = x + padding + sectionWidth * (i + 1) - 10;
            ctx.beginPath();
            ctx.moveTo(arrowX - 15, centerY);
            ctx.lineTo(arrowX, centerY);
            ctx.lineTo(arrowX - 8, centerY - 6);
            ctx.moveTo(arrowX, centerY);
            ctx.lineTo(arrowX - 8, centerY + 6);
            ctx.stroke();
        }
        ctx.lineWidth = 1;

        // Section labels
        ctx.fillStyle = '#666';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('saapuvat', x + padding + sectionWidth * 0.5, y + height - 8);
        ctx.fillText('jono', x + padding + sectionWidth * 1.5, y + height - 8);
        ctx.fillText('palvelu', x + padding + sectionWidth * 2.5, y + height - 8);
        ctx.fillText('poistuvat', x + padding + sectionWidth * 3.5, y + height - 8);

        // Queue section
        const queueX = x + padding + sectionWidth;
        const queueW = sectionWidth;
        ctx.fillStyle = '#fff';
        ctx.fillRect(queueX, y + 30, queueW, height - 60);
        ctx.strokeStyle = '#aaa';
        ctx.strokeRect(queueX, y + 30, queueW, height - 60);

        // Draw waiting customers
        const waiting = this.queue.filter(c => c.serviceStartTime === null);
        const maxPerRow = Math.floor(queueW / (this.customerSize * 2.5));
        waiting.forEach((customer, i) => {
            const row = Math.floor(i / maxPerRow);
            const col = i % maxPerRow;
            const cx = queueX + 15 + col * (this.customerSize * 2.5);
            const cy = y + 50 + row * (this.customerSize * 2.5);

            ctx.fillStyle = this.customerColor;
            ctx.beginPath();
            ctx.arc(cx, cy, this.customerSize / 2, 0, Math.PI * 2);
            ctx.fill();
        });

        // Queue length
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`${waiting.length}`, queueX + queueW / 2, y + 20);

        // Servers section
        const serverX = x + padding + sectionWidth * 2;
        const serverHeight = Math.min(50, (height - 60) / this.numServers - 10);
        this.servers.forEach((server, i) => {
            const sy = y + 35 + i * (serverHeight + 10);
            const sw = sectionWidth - 20;

            ctx.fillStyle = server.busy ? this.busyColor : this.serverColor;
            ctx.globalAlpha = server.busy ? 1 : 0.5;
            ctx.fillRect(serverX + 10, sy, sw, serverHeight);
            ctx.globalAlpha = 1;

            ctx.strokeStyle = '#333';
            ctx.strokeRect(serverX + 10, sy, sw, serverHeight);

            // Server label
            ctx.fillStyle = '#fff';
            ctx.font = '10px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(server.busy ? 'palvellaan' : 'vapaa', serverX + 10 + sw / 2, sy + serverHeight / 2 + 4);
        });

        // Stats display
        const stats = this.getStats();
        ctx.fillStyle = '#333';
        ctx.font = '11px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText(`Saapuneita: ${stats.totalArrivals}`, x + 10, y + 18);
        ctx.textAlign = 'right';
        ctx.fillText(`Palveltuja: ${stats.totalDepartures}`, x + width - 10, y + 18);
    }

    /**
     * Draw wait time histogram
     */
    drawWaitTimeHistogram(ctx, x, y, width, height) {
        if (this.waitTimes.length < 2) {
            ctx.fillStyle = '#999';
            ctx.font = '12px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('Kerätään dataa...', x + width / 2, y + height / 2);
            return;
        }

        // Create simple histogram
        const numBins = 8;
        const maxWait = Math.max(...this.waitTimes);
        const minWait = Math.min(...this.waitTimes);
        const binWidth = (maxWait - minWait) / numBins || 1;

        const bins = new Array(numBins).fill(0);
        this.waitTimes.forEach(w => {
            const binIdx = Math.min(Math.floor((w - minWait) / binWidth), numBins - 1);
            bins[binIdx]++;
        });

        const maxCount = Math.max(...bins, 1);
        const padding = { top: 25, bottom: 30, left: 40, right: 15 };
        const plotX = x + padding.left;
        const plotY = y + padding.top;
        const plotW = width - padding.left - padding.right;
        const plotH = height - padding.top - padding.bottom;

        // Background
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(plotX, plotY, plotW, plotH);
        ctx.strokeStyle = '#ddd';
        ctx.strokeRect(plotX, plotY, plotW, plotH);

        // Title
        ctx.fillStyle = '#333';
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Jonotusaikajakauma', x + width / 2, y + 14);

        // Bars
        const barW = plotW / numBins;
        bins.forEach((count, i) => {
            const barH = (count / maxCount) * plotH;
            ctx.fillStyle = '#3498db';
            ctx.fillRect(plotX + i * barW + 2, plotY + plotH - barH, barW - 4, barH);
        });

        // Axis labels
        ctx.fillStyle = '#666';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('jonotusaika', x + width / 2, y + height - 5);
        ctx.fillText(minWait.toFixed(1), plotX, plotY + plotH + 15);
        ctx.fillText(maxWait.toFixed(1), plotX + plotW, plotY + plotH + 15);

        // Mean line
        const avgWait = this.waitTimes.reduce((a, b) => a + b, 0) / this.waitTimes.length;
        const meanX = plotX + ((avgWait - minWait) / (maxWait - minWait || 1)) * plotW;
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(meanX, plotY);
        ctx.lineTo(meanX, plotY + plotH);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 1;

        ctx.fillStyle = '#e74c3c';
        ctx.fillText(`μ=${avgWait.toFixed(2)}`, meanX, plotY + plotH + 25);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QueueVizComponent;
}
