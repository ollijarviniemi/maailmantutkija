/**
 * Poll Animation
 *
 * Visualizes polling data and Bayesian updating.
 * Uses PollVizComponent for rendering.
 */

class PollAnimation extends BaseAnimation {
    constructor(canvas, config = {}) {
        super(canvas, config);

        // True value (hidden)
        this.trueValue = config.dgp?.trueValue || 0.5;
        this.numPolls = config.dgp?.numPolls || 6;
        this.sampleSize = config.dgp?.sampleSize || 1000;
        this.pollsters = config.dgp?.pollsters || ['Yle', 'HS', 'MTV', 'Kantar', 'Taloustutkimus'];
        this.biases = config.dgp?.biases || {};  // pollster -> bias

        // Display options
        this.showTrueValue = config.showTrueValue !== false;
        this.showAggregate = config.showAggregate !== false;

        // Animation
        this.pollsPerSecond = config.pollsPerSecond || 1;

        this.resetState();
    }

    resetState() {
        this.pollViz = new PollVizComponent({
            trueValue: this.showTrueValue ? this.trueValue : null,
            showAggregate: this.showAggregate,
            showConfidence: true
        });

        this.pollsGenerated = 0;
        this.timeSinceLast = 0;

        this.collectedData = {
            polls: [],
            aggregate: null,
            posterior: null,
            trueValue: this.trueValue
        };
    }

    updateLayout() {
        // Main poll display
        this.pollArea = {
            x: 20,
            y: 30,
            width: this.width - 40,
            height: this.height * 0.5
        };

        // Posterior distribution
        this.posteriorArea = {
            x: 20,
            y: this.height * 0.55,
            width: this.width - 40,
            height: this.height * 0.4
        };
    }

    generatePoll() {
        const pollster = this.pollsters[this.pollsGenerated % this.pollsters.length];
        const bias = this.biases[pollster] || 0;
        const sampleSize = this.sampleSize + Math.floor(Math.random() * 500 - 250);

        // Simulate poll result
        const result = this.pollViz.simulatePoll(this.trueValue, sampleSize, bias);

        this.pollViz.addPoll({
            pollster,
            result,
            sampleSize,
            bias
        });

        this.pollsGenerated++;
    }

    update(dt) {
        this.timeSinceLast += dt;

        while (this.timeSinceLast >= 1 / this.pollsPerSecond &&
               this.pollsGenerated < this.numPolls) {
            this.timeSinceLast -= 1 / this.pollsPerSecond;
            this.generatePoll();

            // Update collected data
            this.collectedData.polls = [...this.pollViz.polls];
            this.collectedData.aggregate = this.pollViz.getAggregate();
            this.collectedData.posterior = this.pollViz.getBayesianPosterior();

            if (this.onDataUpdate) {
                this.onDataUpdate(this.collectedData);
            }
        }

        // Stats callback
        if (this.onStatsUpdate) {
            const agg = this.pollViz.getAggregate();
            this.onStatsUpdate({
                polls: this.pollsGenerated,
                estimate: agg ? agg.mean : null
            });
        }

        // Check completion
        if (this.pollsGenerated >= this.numPolls) {
            this.finish();
        }
    }

    draw() {
        super.draw();
        if (!this.pollArea) return;

        const ctx = this.ctx;

        // Title
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Mielipidekyselyt', this.width / 2, 20);

        // Draw poll visualization
        this.pollViz.draw(ctx, this.pollArea.x, this.pollArea.y,
                          this.pollArea.width, this.pollArea.height);

        // Draw posterior if we have polls
        if (this.pollViz.polls.length > 0) {
            this.pollViz.drawPosterior(ctx, this.posteriorArea.x, this.posteriorArea.y,
                                       this.posteriorArea.width, this.posteriorArea.height);
        }

        // Progress bar
        const progress = this.pollsGenerated / this.numPolls;
        this.drawProgressBar(20, this.height - 15, this.width - 40, 8, progress);
    }
}

// Self-register
if (typeof AnimationRegistry !== 'undefined') {
    AnimationRegistry.register('poll', {
        class: PollAnimation,
        statsConfig: {
            polls: { label: 'Gallupit', initial: '0' },
            estimate: { label: 'Arvio', initial: '-' }
        },
        outputs: ['polls', 'aggregate', 'posterior', 'trueValue'],
        statsMapper: (stats) => ({
            polls: stats.polls,
            estimate: stats.estimate ? `${(stats.estimate * 100).toFixed(1)}%` : '-'
        })
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PollAnimation;
}
