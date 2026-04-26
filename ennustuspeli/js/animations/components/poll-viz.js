/**
 * Reusable Poll Visualization Component
 *
 * For polling/election visualizations.
 * Shows poll results, confidence intervals, aggregation.
 */

class PollVizComponent {
    constructor(config = {}) {
        this.polls = [];  // Array of {id, pollster, date, result, sampleSize, margin?}
        this.trueValue = config.trueValue || null;  // Hidden true value (for simulation)
        this.candidates = config.candidates || ['A', 'B'];
        this.colors = config.colors || ['#3498db', '#e74c3c'];
        this.backgroundColor = config.backgroundColor || '#f8f8f8';
        this.showAggregate = config.showAggregate || false;
        this.showConfidence = config.showConfidence || true;
    }

    /**
     * Add a poll result
     */
    addPoll(poll) {
        this.polls.push({
            id: poll.id || this.polls.length,
            pollster: poll.pollster || `Gallup ${this.polls.length + 1}`,
            date: poll.date || Date.now(),
            result: poll.result,  // e.g., 0.52 for 52%
            sampleSize: poll.sampleSize || 1000,
            margin: poll.margin || this.calculateMargin(poll.sampleSize, poll.result),
            bias: poll.bias || 0  // Hidden pollster bias
        });
    }

    /**
     * Clear all polls
     */
    clear() {
        this.polls = [];
    }

    /**
     * Calculate margin of error (95% CI)
     */
    calculateMargin(n, p = 0.5) {
        return 1.96 * Math.sqrt(p * (1 - p) / n);
    }

    /**
     * Simulate a poll from true value
     */
    simulatePoll(trueValue, sampleSize, pollsterBias = 0) {
        const n = sampleSize;
        // Binomial approximation
        let count = 0;
        for (let i = 0; i < n; i++) {
            if (Math.random() < trueValue + pollsterBias) count++;
        }
        return count / n;
    }

    /**
     * Generate polls for simulation
     */
    generatePolls(trueValue, numPolls, config = {}) {
        this.trueValue = trueValue;
        this.clear();

        const pollsters = config.pollsters || ['Yle', 'HS', 'MTV', 'Taloustutkimus', 'Kantar'];
        const biases = config.biases || {};  // {pollster: bias}

        for (let i = 0; i < numPolls; i++) {
            const pollster = pollsters[i % pollsters.length];
            const sampleSize = config.sampleSize || (800 + Math.floor(Math.random() * 700));
            const bias = biases[pollster] || 0;
            const result = this.simulatePoll(trueValue, sampleSize, bias);

            this.addPoll({
                pollster,
                date: Date.now() - (numPolls - i) * 86400000,  // Days apart
                result,
                sampleSize,
                bias
            });
        }
    }

    /**
     * Calculate aggregate (weighted average)
     */
    getAggregate() {
        if (this.polls.length === 0) return null;

        // Weight by sample size
        let totalWeight = 0;
        let weightedSum = 0;
        this.polls.forEach(poll => {
            const weight = poll.sampleSize;
            totalWeight += weight;
            weightedSum += poll.result * weight;
        });

        const mean = weightedSum / totalWeight;

        // Combined margin
        const totalN = this.polls.reduce((sum, p) => sum + p.sampleSize, 0);
        const margin = this.calculateMargin(totalN, mean);

        return { mean, margin, totalN };
    }

    /**
     * Calculate Bayesian posterior (Beta-Binomial)
     */
    getBayesianPosterior(priorAlpha = 1, priorBeta = 1) {
        // Sum up all successes and sample sizes
        let totalSuccesses = 0;
        let totalN = 0;
        this.polls.forEach(poll => {
            totalSuccesses += Math.round(poll.result * poll.sampleSize);
            totalN += poll.sampleSize;
        });

        const posteriorAlpha = priorAlpha + totalSuccesses;
        const posteriorBeta = priorBeta + totalN - totalSuccesses;

        const mean = posteriorAlpha / (posteriorAlpha + posteriorBeta);
        // 95% credible interval (approximation)
        const std = Math.sqrt(posteriorAlpha * posteriorBeta /
                              (Math.pow(posteriorAlpha + posteriorBeta, 2) * (posteriorAlpha + posteriorBeta + 1)));

        return {
            alpha: posteriorAlpha,
            beta: posteriorBeta,
            mean,
            ci95: [mean - 1.96 * std, mean + 1.96 * std]
        };
    }

    /**
     * Draw poll comparison (bars)
     */
    draw(ctx, x, y, width, height) {
        if (this.polls.length === 0) {
            ctx.fillStyle = '#999';
            ctx.font = '12px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('Ei gallup-dataa', x + width / 2, y + height / 2);
            return;
        }

        const padding = { top: 30, bottom: 30, left: 100, right: 50 };
        const plotW = width - padding.left - padding.right;
        const plotH = height - padding.top - padding.bottom;
        const plotX = x + padding.left;
        const plotY = y + padding.top;

        // Title
        ctx.fillStyle = '#333';
        ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Gallupit', x + width / 2, y + 16);

        // Background scale (0-100%)
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(plotX, plotY, plotW, plotH);
        ctx.strokeStyle = '#ddd';
        ctx.strokeRect(plotX, plotY, plotW, plotH);

        // 50% line
        const mid = plotX + plotW * 0.5;
        ctx.strokeStyle = '#999';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(mid, plotY);
        ctx.lineTo(mid, plotY + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        // Scale labels
        ctx.fillStyle = '#666';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('0%', plotX, plotY + plotH + 15);
        ctx.fillText('50%', mid, plotY + plotH + 15);
        ctx.fillText('100%', plotX + plotW, plotY + plotH + 15);

        // Draw polls
        const barHeight = Math.min(25, plotH / this.polls.length - 5);
        this.polls.forEach((poll, i) => {
            const by = plotY + i * (plotH / this.polls.length) + (plotH / this.polls.length - barHeight) / 2;

            // Pollster name
            ctx.fillStyle = '#333';
            ctx.font = '10px system-ui';
            ctx.textAlign = 'right';
            ctx.fillText(poll.pollster, plotX - 10, by + barHeight / 2 + 4);

            // Bar
            const barW = poll.result * plotW;
            ctx.fillStyle = this.colors[0];
            ctx.fillRect(plotX, by, barW, barHeight);

            // Confidence interval
            if (this.showConfidence && poll.margin) {
                const ciLeft = plotX + (poll.result - poll.margin) * plotW;
                const ciRight = plotX + (poll.result + poll.margin) * plotW;

                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(ciLeft, by + barHeight / 2);
                ctx.lineTo(ciRight, by + barHeight / 2);
                ctx.moveTo(ciLeft, by + 5);
                ctx.lineTo(ciLeft, by + barHeight - 5);
                ctx.moveTo(ciRight, by + 5);
                ctx.lineTo(ciRight, by + barHeight - 5);
                ctx.stroke();
                ctx.lineWidth = 1;
            }

            // Result text
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px system-ui';
            ctx.textAlign = 'left';
            if (barW > 40) {
                ctx.fillText(`${(poll.result * 100).toFixed(1)}%`, plotX + 5, by + barHeight / 2 + 4);
            }

            // Sample size
            ctx.fillStyle = '#999';
            ctx.font = '9px system-ui';
            ctx.textAlign = 'left';
            ctx.fillText(`n=${poll.sampleSize}`, plotX + plotW + 5, by + barHeight / 2 + 3);
        });

        // True value (if known)
        if (this.trueValue !== null) {
            const trueX = plotX + this.trueValue * plotW;
            ctx.strokeStyle = '#27ae60';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(trueX, plotY);
            ctx.lineTo(trueX, plotY + plotH);
            ctx.stroke();
            ctx.lineWidth = 1;

            ctx.fillStyle = '#27ae60';
            ctx.font = 'bold 10px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(`Tosi: ${(this.trueValue * 100).toFixed(1)}%`, trueX, plotY - 5);
        }

        // Aggregate
        if (this.showAggregate) {
            const agg = this.getAggregate();
            if (agg) {
                const aggX = plotX + agg.mean * plotW;
                ctx.strokeStyle = '#e74c3c';
                ctx.lineWidth = 2;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(aggX, plotY);
                ctx.lineTo(aggX, plotY + plotH);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.lineWidth = 1;

                ctx.fillStyle = '#e74c3c';
                ctx.font = '10px system-ui';
                ctx.textAlign = 'center';
                ctx.fillText(`Yhdistetty: ${(agg.mean * 100).toFixed(1)}%`, aggX, plotY + plotH + 25);
            }
        }
    }

    /**
     * Draw Bayesian posterior visualization
     */
    drawPosterior(ctx, x, y, width, height) {
        const padding = { top: 30, bottom: 40, left: 50, right: 20 };
        const plotW = width - padding.left - padding.right;
        const plotH = height - padding.top - padding.bottom;
        const plotX = x + padding.left;
        const plotY = y + padding.top;

        // Title
        ctx.fillStyle = '#333';
        ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Posteriorijakauma', x + width / 2, y + 16);

        // Background
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(plotX, plotY, plotW, plotH);
        ctx.strokeStyle = '#ddd';
        ctx.strokeRect(plotX, plotY, plotW, plotH);

        const posterior = this.getBayesianPosterior();
        if (!posterior) return;

        // Draw Beta distribution approximation
        const points = 100;
        const xMin = Math.max(0, posterior.mean - 0.2);
        const xMax = Math.min(1, posterior.mean + 0.2);

        // Calculate Beta PDF values
        const values = [];
        for (let i = 0; i <= points; i++) {
            const p = xMin + (i / points) * (xMax - xMin);
            // Beta PDF approximation (using normal approximation for simplicity)
            const std = Math.sqrt(posterior.alpha * posterior.beta /
                                  (Math.pow(posterior.alpha + posterior.beta, 2) * (posterior.alpha + posterior.beta + 1)));
            const pdf = Math.exp(-Math.pow(p - posterior.mean, 2) / (2 * std * std)) / (std * Math.sqrt(2 * Math.PI));
            values.push({ p, pdf });
        }

        const maxPdf = Math.max(...values.map(v => v.pdf));

        // Draw curve
        ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
        ctx.beginPath();
        ctx.moveTo(plotX, plotY + plotH);
        values.forEach(v => {
            const px = plotX + ((v.p - xMin) / (xMax - xMin)) * plotW;
            const py = plotY + plotH - (v.pdf / maxPdf) * plotH;
            ctx.lineTo(px, py);
        });
        ctx.lineTo(plotX + plotW, plotY + plotH);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.beginPath();
        values.forEach((v, i) => {
            const px = plotX + ((v.p - xMin) / (xMax - xMin)) * plotW;
            const py = plotY + plotH - (v.pdf / maxPdf) * plotH;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.lineWidth = 1;

        // Mean line
        const meanX = plotX + ((posterior.mean - xMin) / (xMax - xMin)) * plotW;
        ctx.strokeStyle = '#e74c3c';
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(meanX, plotY);
        ctx.lineTo(meanX, plotY + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        // CI bounds
        const ciLeftX = plotX + ((posterior.ci95[0] - xMin) / (xMax - xMin)) * plotW;
        const ciRightX = plotX + ((posterior.ci95[1] - xMin) / (xMax - xMin)) * plotW;
        ctx.fillStyle = 'rgba(231, 76, 60, 0.1)';
        ctx.fillRect(ciLeftX, plotY, ciRightX - ciLeftX, plotH);

        // Labels
        ctx.fillStyle = '#666';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`${(xMin * 100).toFixed(0)}%`, plotX, plotY + plotH + 15);
        ctx.fillText(`${(xMax * 100).toFixed(0)}%`, plotX + plotW, plotY + plotH + 15);

        ctx.fillStyle = '#e74c3c';
        ctx.fillText(`μ=${(posterior.mean * 100).toFixed(1)}%`, meanX, plotY + plotH + 28);

        // 95% CI text
        ctx.fillStyle = '#999';
        ctx.font = '9px system-ui';
        ctx.fillText(`95% CI: [${(posterior.ci95[0] * 100).toFixed(1)}%, ${(posterior.ci95[1] * 100).toFixed(1)}%]`,
                     x + width / 2, y + height - 5);

        // True value
        if (this.trueValue !== null && this.trueValue >= xMin && this.trueValue <= xMax) {
            const trueX = plotX + ((this.trueValue - xMin) / (xMax - xMin)) * plotW;
            ctx.strokeStyle = '#27ae60';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(trueX, plotY);
            ctx.lineTo(trueX, plotY + plotH);
            ctx.stroke();
            ctx.lineWidth = 1;
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PollVizComponent;
}
