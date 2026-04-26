/**
 * Reusable Store Occupancy Component
 *
 * Visualizes people entering/leaving a store with occupancy tracking.
 * For Poisson arrival/departure processes.
 */

class StoreComponent {
    constructor(config = {}) {
        this.customers = [];  // Array of {id, x, y, entryTime, exitTime?}
        this.currentOccupancy = 0;
        this.maxOccupancy = config.maxOccupancy || 100;
        this.storeWidth = config.storeWidth || 300;
        this.storeHeight = config.storeHeight || 200;
        this.customerSize = config.customerSize || 8;
        this.customerColor = config.customerColor || '#3498db';
        this.storeColor = config.storeColor || '#f8f8f8';
        this.borderColor = config.borderColor || '#333';
        this.highlightThreshold = config.highlightThreshold || null;
        this.showCounter = config.showCounter !== false;
        this.showClock = config.showClock || false;
        this.currentTime = 0;
        this.history = [];  // Array of {time, occupancy}
        this.nextId = 0;
    }

    /**
     * Reset to empty state
     */
    reset() {
        this.customers = [];
        this.currentOccupancy = 0;
        this.history = [];
        this.currentTime = 0;
        this.nextId = 0;
    }

    /**
     * Add a customer entering the store
     */
    customerEnters(time = null) {
        const id = this.nextId++;
        const customer = {
            id,
            x: 0.1 + Math.random() * 0.8,
            y: 0.1 + Math.random() * 0.8,
            entryTime: time !== null ? time : this.currentTime,
            exitTime: null
        };
        this.customers.push(customer);
        this.currentOccupancy++;
        this.recordHistory(time);
        return id;
    }

    /**
     * Remove a customer (exits the store)
     */
    customerExits(customerId = null, time = null) {
        if (this.customers.length === 0) return null;

        let idx;
        if (customerId !== null) {
            idx = this.customers.findIndex(c => c.id === customerId && c.exitTime === null);
        } else {
            // Remove random active customer
            const active = this.customers.filter(c => c.exitTime === null);
            if (active.length === 0) return null;
            const randomActive = active[Math.floor(Math.random() * active.length)];
            idx = this.customers.findIndex(c => c.id === randomActive.id);
        }

        if (idx >= 0) {
            this.customers[idx].exitTime = time !== null ? time : this.currentTime;
            this.currentOccupancy--;
            this.recordHistory(time);
            return this.customers[idx].id;
        }
        return null;
    }

    /**
     * Set occupancy directly (for non-animated use)
     */
    setOccupancy(count, time = null) {
        this.reset();
        for (let i = 0; i < count; i++) {
            this.customerEnters(time);
        }
    }

    /**
     * Record occupancy at a point in time
     */
    recordHistory(time = null) {
        const t = time !== null ? time : this.currentTime;
        this.history.push({ time: t, occupancy: this.currentOccupancy });
    }

    /**
     * Advance simulation time
     */
    advanceTime(dt) {
        this.currentTime += dt;
    }

    /**
     * Get active customers (still in store)
     */
    getActiveCustomers() {
        return this.customers.filter(c => c.exitTime === null);
    }

    /**
     * Get statistics
     */
    getStats() {
        const occupancies = this.history.map(h => h.occupancy);
        if (occupancies.length === 0) return { mean: 0, max: 0, current: 0 };

        const mean = occupancies.reduce((a, b) => a + b, 0) / occupancies.length;
        const max = Math.max(...occupancies);
        return {
            mean,
            max,
            current: this.currentOccupancy,
            observations: occupancies.length
        };
    }

    /**
     * Draw the store visualization
     */
    draw(ctx, x, y, width, height) {
        const padding = { top: 30, bottom: 30, left: 20, right: 20 };
        const storeX = x + padding.left;
        const storeY = y + padding.top;
        const storeW = width - padding.left - padding.right;
        const storeH = height - padding.top - padding.bottom;

        // Store background
        ctx.fillStyle = this.storeColor;
        ctx.fillRect(storeX, storeY, storeW, storeH);

        // Store border (thick walls)
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(storeX, storeY, storeW, storeH);

        // Door (gap in bottom wall)
        const doorWidth = 40;
        ctx.fillStyle = this.storeColor;
        ctx.fillRect(storeX + storeW / 2 - doorWidth / 2, storeY + storeH - 2, doorWidth, 6);

        // Door label
        ctx.fillStyle = '#666';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('sisään/ulos', storeX + storeW / 2, storeY + storeH + 15);

        // Draw customers
        const active = this.getActiveCustomers();
        active.forEach(customer => {
            const cx = storeX + customer.x * storeW;
            const cy = storeY + customer.y * storeH;

            ctx.fillStyle = this.customerColor;
            ctx.beginPath();
            ctx.arc(cx, cy, this.customerSize, 0, Math.PI * 2);
            ctx.fill();
        });

        // Counter display
        if (this.showCounter) {
            const isOverThreshold = this.highlightThreshold !== null &&
                                    this.currentOccupancy >= this.highlightThreshold;

            ctx.fillStyle = isOverThreshold ? '#e74c3c' : '#333';
            ctx.font = 'bold 24px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(this.currentOccupancy.toString(), x + width / 2, y + 22);

            ctx.font = '11px system-ui';
            ctx.fillStyle = '#666';
            ctx.fillText('asiakasta', x + width / 2, y + height - 8);
        }

        // Clock display
        if (this.showClock) {
            ctx.fillStyle = '#666';
            ctx.font = '11px system-ui';
            ctx.textAlign = 'right';
            ctx.fillText(`t=${this.currentTime.toFixed(0)}`, x + width - 10, y + 18);
        }

        // Threshold indicator
        if (this.highlightThreshold !== null) {
            ctx.fillStyle = '#999';
            ctx.font = '10px system-ui';
            ctx.textAlign = 'left';
            ctx.fillText(`raja: ${this.highlightThreshold}`, x + 10, y + 18);
        }

        ctx.lineWidth = 1;
    }

    /**
     * Draw occupancy over time chart
     */
    drawHistory(ctx, x, y, width, height) {
        if (this.history.length < 2) return;

        const padding = { top: 25, bottom: 35, left: 45, right: 15 };
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
        ctx.fillText('Asiakasmäärä ajan funktiona', x + width / 2, y + 14);

        // Data bounds
        const times = this.history.map(h => h.time);
        const occs = this.history.map(h => h.occupancy);
        const minT = Math.min(...times);
        const maxT = Math.max(...times);
        const maxOcc = Math.max(...occs, 1);
        const timeRange = maxT - minT || 1;

        // Draw threshold line
        if (this.highlightThreshold !== null && this.highlightThreshold <= maxOcc * 1.1) {
            const threshY = plotY + plotH - (this.highlightThreshold / (maxOcc * 1.1)) * plotH;
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.moveTo(plotX, threshY);
            ctx.lineTo(plotX + plotW, threshY);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw line
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.beginPath();
        this.history.forEach((h, i) => {
            const px = plotX + ((h.time - minT) / timeRange) * plotW;
            const py = plotY + plotH - (h.occupancy / (maxOcc * 1.1)) * plotH;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.lineWidth = 1;

        // Axis labels
        ctx.fillStyle = '#666';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('aika', x + width / 2, y + height - 5);
        ctx.fillText(minT.toFixed(0), plotX, plotY + plotH + 15);
        ctx.fillText(maxT.toFixed(0), plotX + plotW, plotY + plotH + 15);

        ctx.textAlign = 'right';
        ctx.fillText('0', plotX - 5, plotY + plotH);
        ctx.fillText(Math.ceil(maxOcc * 1.1).toString(), plotX - 5, plotY + 10);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StoreComponent;
}
