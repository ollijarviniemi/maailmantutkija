/**
 * Bracket Animation
 *
 * Visualizes tournament brackets with probability annotations.
 * Uses BracketComponent for rendering.
 */

class BracketAnimation extends BaseAnimation {
    constructor(canvas, config = {}) {
        super(canvas, config);

        // Teams
        this.teams = config.dgp?.teams || [
            { id: 0, name: 'A', rating: 1600 },
            { id: 1, name: 'B', rating: 1550 },
            { id: 2, name: 'C', rating: 1500 },
            { id: 3, name: 'D', rating: 1450 },
            { id: 4, name: 'E', rating: 1400 },
            { id: 5, name: 'F', rating: 1350 },
            { id: 6, name: 'G', rating: 1300 },
            { id: 7, name: 'H', rating: 1250 }
        ];

        this.highlightTeam = config.dgp?.highlightTeam || null;
        this.numSimulations = config.dgp?.numSimulations || 100;
        this.simulationsPerSecond = config.simulationsPerSecond || 10;

        this.resetState();
    }

    resetState() {
        this.bracket = new BracketComponent({
            highlightTeam: this.highlightTeam,
            showProbabilities: true
        });
        this.bracket.setTeams(this.teams);

        // Run initial tournament for display
        this.bracket.simulate();

        this.simulationResults = [];
        this.winCounts = {};
        this.teams.forEach(t => this.winCounts[t.id] = 0);

        this.currentSimulation = 0;
        this.timeSinceLast = 0;

        this.collectedData = {
            winCounts: { ...this.winCounts },
            winRates: {},
            highlightedTeamWinRate: 0
        };
    }

    updateLayout() {
        // Main bracket display
        this.bracketArea = {
            x: 20,
            y: 30,
            width: this.width - 40,
            height: this.height * 0.6
        };

        // Win probability bar chart
        this.barChartArea = {
            x: 20,
            y: this.height * 0.65,
            width: this.width - 40,
            height: this.height * 0.3
        };
    }

    update(dt) {
        this.timeSinceLast += dt;

        while (this.timeSinceLast >= 1 / this.simulationsPerSecond &&
               this.currentSimulation < this.numSimulations) {
            this.timeSinceLast -= 1 / this.simulationsPerSecond;

            // Run simulation
            const winner = this.bracket.simulate();
            if (winner) {
                this.winCounts[winner.id]++;
            }
            this.currentSimulation++;

            // Update collected data
            this.collectedData.winCounts = { ...this.winCounts };
            this.collectedData.winRates = {};
            for (const team of this.teams) {
                this.collectedData.winRates[team.id] = this.winCounts[team.id] / this.currentSimulation;
            }

            if (this.highlightTeam !== null) {
                this.collectedData.highlightedTeamWinRate =
                    this.winCounts[this.highlightTeam] / this.currentSimulation;
            }

            if (this.onDataUpdate) {
                this.onDataUpdate(this.collectedData);
            }
        }

        // Stats callback
        if (this.onStatsUpdate) {
            this.onStatsUpdate({
                simulations: this.currentSimulation,
                highlightWinRate: this.collectedData.highlightedTeamWinRate
            });
        }

        // Check completion
        if (this.currentSimulation >= this.numSimulations) {
            this.finish();
        }
    }

    draw() {
        super.draw();
        if (!this.bracketArea) return;

        const ctx = this.ctx;

        // Title
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Turnaus', this.width / 2, 20);

        // Draw bracket
        this.bracket.draw(ctx, this.bracketArea.x, this.bracketArea.y,
                          this.bracketArea.width, this.bracketArea.height);

        // Draw win probability bar chart
        this.drawWinProbabilities(ctx);

        // Progress bar
        const progress = this.currentSimulation / this.numSimulations;
        this.drawProgressBar(20, this.height - 15, this.width - 40, 8, progress);
    }

    drawWinProbabilities(ctx) {
        const area = this.barChartArea;
        const numTeams = this.teams.length;
        const barWidth = (area.width - 40) / numTeams;
        const maxWins = Math.max(...Object.values(this.winCounts), 1);

        // Title
        ctx.fillStyle = '#333';
        ctx.font = '11px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`Voittotodennäköisyydet (${this.currentSimulation} simulaatiota)`,
                    area.x + area.width / 2, area.y + 12);

        // Bars
        this.teams.forEach((team, i) => {
            const wins = this.winCounts[team.id];
            const barHeight = (wins / maxWins) * (area.height - 50);
            const barX = area.x + 20 + i * barWidth;
            const barY = area.y + area.height - 25 - barHeight;

            // Bar
            const isHighlighted = team.id === this.highlightTeam;
            ctx.fillStyle = isHighlighted ? '#f39c12' : '#3498db';
            ctx.fillRect(barX + 2, barY, barWidth - 4, barHeight);

            // Team label
            ctx.fillStyle = '#333';
            ctx.font = '10px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(team.name, barX + barWidth / 2, area.y + area.height - 10);

            // Win percentage
            if (this.currentSimulation > 0) {
                const pct = (wins / this.currentSimulation * 100).toFixed(0);
                ctx.fillStyle = '#666';
                ctx.font = '9px system-ui';
                ctx.fillText(`${pct}%`, barX + barWidth / 2, barY - 5);
            }
        });
    }
}

// Self-register
if (typeof AnimationRegistry !== 'undefined') {
    AnimationRegistry.register('bracket', {
        class: BracketAnimation,
        statsConfig: {
            simulations: { label: 'Simulaatioita', initial: '0' },
            highlightWinRate: { label: 'Voitto-%', initial: '-' }
        },
        outputs: ['winCounts', 'winRates', 'highlightedTeamWinRate'],
        statsMapper: (stats) => ({
            simulations: stats.simulations,
            highlightWinRate: stats.highlightWinRate ?
                `${(stats.highlightWinRate * 100).toFixed(1)}%` : '-'
        })
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BracketAnimation;
}
