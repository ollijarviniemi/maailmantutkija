/**
 * Base Animation Class
 *
 * Abstract base for all animation types. Handles canvas setup,
 * resize, animation loop, and common rendering utilities.
 */

class BaseAnimation {
    constructor(canvas, config = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.config = config;

        // State
        this.running = false;
        this.paused = false;
        this.finished = false;
        this.speed = 1;
        this.time = 0;
        this.lastRealTime = 0;

        // Collected data (subclasses populate this)
        this.collectedData = {};

        // Callbacks
        this.onDataUpdate = null;
        this.onFinish = null;
        this.onStatsUpdate = null;

        // Setup
        this.resize();
        this.setupResizeHandler();
        this.setupVisibilityHandler();
    }

    /**
     * PREFERENCE: Pause simulation when window loses focus to prevent
     * animations from running in the background and causing time jumps
     */
    setupVisibilityHandler() {
        this._visibilityHandler = () => {
            if (document.hidden && this.running && !this.paused) {
                this.pause();
                this._wasPausedByVisibility = true;
            } else if (!document.hidden && this._wasPausedByVisibility) {
                this._wasPausedByVisibility = false;
                this.resume();
            }
        };
        document.addEventListener('visibilitychange', this._visibilityHandler);
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;

        // Let subclasses update their layout
        this.updateLayout();
    }

    setupResizeHandler() {
        this._resizeHandler = () => {
            this.resize();
            this.draw();
        };
        window.addEventListener('resize', this._resizeHandler);
    }

    destroy() {
        this.stop();
        window.removeEventListener('resize', this._resizeHandler);
        document.removeEventListener('visibilitychange', this._visibilityHandler);
    }

    // Override in subclasses
    updateLayout() {}

    start() {
        if (this.running) return;
        this.running = true;
        this.paused = false;
        this.finished = false;
        this.lastRealTime = performance.now();
        this.animate();
    }

    pause() {
        this.paused = true;
    }

    resume() {
        if (!this.running || !this.paused) return;
        this.paused = false;
        this.lastRealTime = performance.now();
        this.animate();
    }

    stop() {
        this.running = false;
        this.paused = false;
    }

    reset() {
        this.stop();
        this.time = 0;
        this.finished = false;
        this.collectedData = {};
        this.resetState();
        this.draw();
    }

    // Override in subclasses
    resetState() {}

    setSpeed(speed) {
        this.speed = speed;
    }

    animate() {
        if (!this.running || this.paused) return;

        const now = performance.now();
        const realDt = (now - this.lastRealTime) / 1000;
        this.lastRealTime = now;

        const dt = realDt * this.speed;
        this.update(dt);
        this.draw();

        if (!this.finished) {
            requestAnimationFrame(() => this.animate());
        }
    }

    // Override in subclasses
    update(dt) {}

    // Override in subclasses
    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    finish() {
        this.finished = true;
        this.running = false;
        if (this.onFinish) {
            this.onFinish(this.collectedData);
        }
    }

    // Utility drawing methods
    drawRoundedRect(x, y, width, height, radius) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    drawEntity(x, y, size, color, style = 'square') {
        const ctx = this.ctx;

        switch (style) {
            case 'circle':
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, y, size / 2, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'square':
            default:
                ctx.fillStyle = color;
                this.drawRoundedRect(x - size / 2, y - size / 2, size, size, size * 0.2);
                ctx.fill();
                break;
        }
    }

    drawProgressBar(x, y, width, height, progress, bgColor = '#ddd', fgColor = '#27ae60') {
        const ctx = this.ctx;
        ctx.fillStyle = bgColor;
        ctx.fillRect(x, y, width, height);
        ctx.fillStyle = fgColor;
        ctx.fillRect(x, y, width * Math.min(1, progress), height);
    }

    getRandomColor() {
        const colors = ['#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Format time as HH:MM
    formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = Math.floor(minutes % 60);
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseAnimation;
}
