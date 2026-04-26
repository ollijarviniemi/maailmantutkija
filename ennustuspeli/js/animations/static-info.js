/**
 * Static Info Display
 *
 * Not really an animation - displays static information for DSL-based levels.
 * Used when the player needs to see data but there's no dynamic process to watch.
 */

class StaticInfoAnimation extends BaseAnimation {
    constructor(canvas, config = {}) {
        super(canvas, config);

        this.title = config.title || 'Tiedot';
        this.data = config.data || [];
        this.question = config.question || null;

        // Static display - no actual animation needed
        this.finished = false;
        this.collectedData = {};

        // Extract rates from data for potential use
        for (const item of this.data) {
            if (item.rate !== undefined) {
                this.collectedData[item.label.toLowerCase().replace(/\s+/g, '_')] = item.rate;
            }
        }
    }

    resetState() {
        // Nothing to reset - static display
    }

    updateLayout() {
        // Guard against zero dimensions
        if (!this.width || !this.height) return;

        this.padding = 40;
        this.cardWidth = Math.min(180, (this.width - this.padding * 2 - 30) / 2);
        this.cardHeight = 80;
    }

    update(dt) {
        // No animation - just mark as ready
        // Don't call finish() - let the player take their time
    }

    // Override start to not auto-finish
    start() {
        this.running = true;
        this.draw();
    }

    draw() {
        super.draw();
        // Guard against uninitialized layout
        if (!this.cardWidth) return;

        const ctx = this.ctx;

        this.drawTitle();
        this.drawCards();

        if (this.question) {
            this.drawQuestion();
        }
    }

    drawTitle() {
        const ctx = this.ctx;

        ctx.fillStyle = '#333';
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.title, this.width / 2, 40);
    }

    drawCards() {
        const ctx = this.ctx;
        const startY = 80;
        const cols = Math.min(2, this.data.length);
        const rows = Math.ceil(this.data.length / cols);

        const totalWidth = cols * this.cardWidth + (cols - 1) * 20;
        const startX = (this.width - totalWidth) / 2;

        for (let i = 0; i < this.data.length; i++) {
            const item = this.data[i];
            const col = i % cols;
            const row = Math.floor(i / cols);

            const x = startX + col * (this.cardWidth + 20);
            const y = startY + row * (this.cardHeight + 15);

            // Card background
            ctx.fillStyle = '#f8f9fa';
            ctx.strokeStyle = '#dee2e6';
            ctx.lineWidth = 2;
            this.drawRoundedRect(x, y, this.cardWidth, this.cardHeight, 8);
            ctx.fill();
            ctx.stroke();

            // Value (large)
            ctx.fillStyle = '#3498db';
            ctx.font = 'bold 28px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.value, x + this.cardWidth / 2, y + 30);

            // Label (small)
            ctx.fillStyle = '#666';
            ctx.font = '13px system-ui, sans-serif';
            ctx.fillText(item.label, x + this.cardWidth / 2, y + 60);
        }
    }

    drawQuestion() {
        const ctx = this.ctx;
        const y = this.height - 60;

        // Question box
        ctx.fillStyle = '#fff3cd';
        ctx.strokeStyle = '#ffc107';
        ctx.lineWidth = 2;
        this.drawRoundedRect(this.padding, y - 20, this.width - this.padding * 2, 50, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#856404';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.question, this.width / 2, y + 5);
    }
}

// Self-register with AnimationRegistry
if (typeof AnimationRegistry !== 'undefined') {
    AnimationRegistry.register('static-info', {
        class: StaticInfoAnimation,
        statsConfig: {},  // No dynamic stats for static display
        outputs: [],  // Outputs depend on config data
        statsMapper: null
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StaticInfoAnimation;
}
