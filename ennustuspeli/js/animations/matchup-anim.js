/**
 * Matchup Animation
 *
 * Visualizes head-to-head matchups with ELO ratings.
 * Uses MatchupComponent for rendering.
 */

class MatchupAnimation extends BaseAnimation {
    constructor(canvas, config = {}) {
        super(canvas, config);

        // Teams
        this.teamA = config.dgp?.teamA || { name: 'Joukkue A', rating: 1500 };
        this.teamB = config.dgp?.teamB || { name: 'Joukkue B', rating: 1500 };
        this.homeAdvantage = config.dgp?.homeAdvantage || 0;
        this.seriesLength = config.dgp?.seriesLength || 1;

        // Simulation
        this.numSimulations = config.dgp?.numSimulations || 100;
        this.simulationsPerSecond = config.simulationsPerSecond || 20;

        this.resetState();
    }

    resetState() {
        this.matchup = new MatchupComponent({
            teamA: this.teamA,
            teamB: this.teamB,
            homeAdvantage: this.homeAdvantage,
            seriesLength: this.seriesLength
        });
        this.matchup.setTeams(this.teamA, this.teamB);

        this.simulationResults = [];
        this.currentSimulation = 0;
        this.timeSinceLast = 0;

        // Histogram for series outcomes
        this.outcomeHistogram = new HistogramComponent({
            numBins: 7,
            min: 0,
            max: this.seriesLength,
            label: 'Voitetut ottelut',
            color: '#3498db'
        });

        this.collectedData = {
            winsA: 0,
            winsB: 0,
            winRateA: 0,
            theoreticalProbA: this.matchup.getSeriesWinProbability(),
            avgGamesA: 0
        };
    }

    updateLayout() {
        // Top: matchup display
        this.matchupArea = {
            x: 20,
            y: 20,
            width: this.width - 40,
            height: this.height * 0.5
        };

        // Bottom: results histogram
        this.histArea = {
            x: 20,
            y: this.height * 0.55,
            width: this.width - 40,
            height: this.height * 0.4
        };
    }

    update(dt) {
        this.timeSinceLast += dt;

        while (this.timeSinceLast >= 1 / this.simulationsPerSecond &&
               this.currentSimulation < this.numSimulations) {
            this.timeSinceLast -= 1 / this.simulationsPerSecond;

            // Run simulation
            const winner = this.matchup.simulateSeries();
            const gamesWonA = this.matchup.getSeriesScore().winsA;

            this.simulationResults.push({
                winner,
                gamesA: gamesWonA,
                gamesB: this.matchup.results.length - gamesWonA
            });

            // Update histogram
            this.outcomeHistogram.addPoint(gamesWonA);

            // Update stats
            this.collectedData.winsA = this.simulationResults.filter(r => r.winner === 'A').length;
            this.collectedData.winsB = this.simulationResults.filter(r => r.winner === 'B').length;
            this.collectedData.winRateA = this.collectedData.winsA / this.simulationResults.length;
            this.collectedData.avgGamesA = this.simulationResults.reduce((s, r) => s + r.gamesA, 0) /
                                           this.simulationResults.length;

            this.currentSimulation++;

            if (this.onDataUpdate) {
                this.onDataUpdate(this.collectedData);
            }
        }

        // Stats callback
        if (this.onStatsUpdate) {
            this.onStatsUpdate({
                simulations: this.currentSimulation,
                winRateA: this.collectedData.winRateA
            });
        }

        // Check completion
        if (this.currentSimulation >= this.numSimulations) {
            this.finish();
        }
    }

    draw() {
        super.draw();
        if (!this.matchupArea) return;

        const ctx = this.ctx;

        // Draw matchup
        this.matchup.draw(ctx, this.matchupArea.x, this.matchupArea.y,
                          this.matchupArea.width, this.matchupArea.height);

        // Draw series timeline if available
        if (this.matchup.results.length > 0 && this.seriesLength > 1) {
            this.matchup.drawSeriesTimeline(ctx, this.matchupArea.x,
                                            this.matchupArea.y + this.matchupArea.height - 60,
                                            this.matchupArea.width, 50);
        }

        // Draw results histogram
        if (this.simulationResults.length > 0) {
            ctx.fillStyle = '#333';
            ctx.font = 'bold 12px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(`Simulaatiot: ${this.currentSimulation}/${this.numSimulations}`,
                        this.width / 2, this.histArea.y);

            this.outcomeHistogram.draw(ctx, this.histArea.x, this.histArea.y + 15,
                                       this.histArea.width, this.histArea.height - 15);

            // Win rate display
            ctx.fillStyle = '#333';
            ctx.font = '12px system-ui';
            ctx.textAlign = 'left';
            ctx.fillText(`${this.teamA.name} voittaa: ${(this.collectedData.winRateA * 100).toFixed(1)}%`,
                        this.histArea.x + 10, this.height - 10);
            ctx.textAlign = 'right';
            ctx.fillText(`Teoria: ${(this.collectedData.theoreticalProbA * 100).toFixed(1)}%`,
                        this.histArea.x + this.histArea.width - 10, this.height - 10);
        }

        // Progress bar
        const progress = this.currentSimulation / this.numSimulations;
        this.drawProgressBar(20, this.height - 25, this.width - 40, 5, progress, '#eee', '#27ae60');
    }
}

// Self-register
if (typeof AnimationRegistry !== 'undefined') {
    AnimationRegistry.register('matchup', {
        class: MatchupAnimation,
        statsConfig: {
            simulations: { label: 'Simulaatioita', initial: '0' },
            winRateA: { label: 'Voitto-%', initial: '-' }
        },
        outputs: ['winsA', 'winsB', 'winRateA', 'theoreticalProbA', 'avgGamesA'],
        statsMapper: (stats) => ({
            simulations: stats.simulations,
            winRateA: stats.winRateA ? `${(stats.winRateA * 100).toFixed(1)}%` : '-'
        })
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MatchupAnimation;
}
