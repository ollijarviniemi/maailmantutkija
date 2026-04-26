/**
 * Reusable Matchup Component
 *
 * For visualizing head-to-head matchups with ELO/probabilities.
 * Simpler than full bracket - just for single match or series.
 */

class MatchupComponent {
    constructor(config = {}) {
        this.teamA = config.teamA || { name: 'Joukkue A', rating: 1500 };
        this.teamB = config.teamB || { name: 'Joukkue B', rating: 1500 };
        this.homeAdvantage = config.homeAdvantage || 0;  // Rating points to add to home team
        this.seriesLength = config.seriesLength || 1;  // Best of N
        this.results = [];  // Array of 'A' or 'B' for each game
        this.colorA = config.colorA || '#3498db';
        this.colorB = config.colorB || '#e74c3c';
        this.backgroundColor = config.backgroundColor || '#f8f8f8';
    }

    /**
     * Set teams
     */
    setTeams(teamA, teamB) {
        this.teamA = { name: teamA.name || 'A', rating: teamA.rating || 1500 };
        this.teamB = { name: teamB.name || 'B', rating: teamB.rating || 1500 };
    }

    /**
     * Calculate single game win probability for team A
     */
    getWinProbability(includeHomeAdvantage = true) {
        const ratingA = this.teamA.rating + (includeHomeAdvantage ? this.homeAdvantage : 0);
        const ratingB = this.teamB.rating;
        return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    }

    /**
     * Calculate series win probability for team A
     */
    getSeriesWinProbability() {
        if (this.seriesLength === 1) return this.getWinProbability();

        const p = this.getWinProbability();
        const winsNeeded = Math.ceil(this.seriesLength / 2);

        // Dynamic programming for series probability
        // P(A wins series) = sum of P(A wins exactly k games where k >= winsNeeded)
        // Using negative binomial distribution

        let totalProb = 0;
        // Games needed to end: from winsNeeded to seriesLength
        for (let totalGames = winsNeeded; totalGames <= this.seriesLength; totalGames++) {
            // A wins in exactly totalGames games
            // A must win the last game and have (winsNeeded-1) wins in (totalGames-1) games
            const prevGames = totalGames - 1;
            const prevWins = winsNeeded - 1;

            // Binomial coefficient
            const binom = this.binomial(prevGames, prevWins);
            const prob = binom * Math.pow(p, winsNeeded) * Math.pow(1 - p, totalGames - winsNeeded);
            totalProb += prob;
        }

        return totalProb;
    }

    /**
     * Binomial coefficient
     */
    binomial(n, k) {
        if (k < 0 || k > n) return 0;
        if (k === 0 || k === n) return 1;
        let result = 1;
        for (let i = 0; i < k; i++) {
            result = result * (n - i) / (i + 1);
        }
        return result;
    }

    /**
     * Simulate single game
     */
    simulateGame() {
        const p = this.getWinProbability();
        return Math.random() < p ? 'A' : 'B';
    }

    /**
     * Simulate series
     */
    simulateSeries() {
        this.results = [];
        const winsNeeded = Math.ceil(this.seriesLength / 2);
        let winsA = 0, winsB = 0;

        while (winsA < winsNeeded && winsB < winsNeeded) {
            const result = this.simulateGame();
            this.results.push(result);
            if (result === 'A') winsA++;
            else winsB++;
        }

        return winsA >= winsNeeded ? 'A' : 'B';
    }

    /**
     * Get current series score
     */
    getSeriesScore() {
        const winsA = this.results.filter(r => r === 'A').length;
        const winsB = this.results.filter(r => r === 'B').length;
        return { winsA, winsB };
    }

    /**
     * Check if series is decided
     */
    isSeriesDecided() {
        const { winsA, winsB } = this.getSeriesScore();
        const winsNeeded = Math.ceil(this.seriesLength / 2);
        return winsA >= winsNeeded || winsB >= winsNeeded;
    }

    /**
     * Get series winner
     */
    getSeriesWinner() {
        if (!this.isSeriesDecided()) return null;
        const { winsA, winsB } = this.getSeriesScore();
        return winsA > winsB ? 'A' : 'B';
    }

    /**
     * Draw matchup visualization
     */
    draw(ctx, x, y, width, height) {
        const padding = 20;
        const centerX = x + width / 2;
        const centerY = y + height / 2;

        // Background
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = '#ddd';
        ctx.strokeRect(x, y, width, height);

        // Teams
        const teamBoxW = (width - padding * 3) / 2 - 20;
        const teamBoxH = 80;

        // Team A (left)
        const teamAx = x + padding;
        const teamAy = centerY - teamBoxH / 2;
        this.drawTeamBox(ctx, this.teamA, teamAx, teamAy, teamBoxW, teamBoxH, this.colorA, true);

        // VS
        ctx.fillStyle = '#666';
        ctx.font = 'bold 20px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('vs', centerX, centerY + 7);

        // Team B (right)
        const teamBx = x + width - padding - teamBoxW;
        const teamBy = centerY - teamBoxH / 2;
        this.drawTeamBox(ctx, this.teamB, teamBx, teamBy, teamBoxW, teamBoxH, this.colorB, false);

        // Win probability bar
        const probBarY = y + height - 40;
        const probBarW = width - padding * 2;
        const probA = this.seriesLength > 1 ? this.getSeriesWinProbability() : this.getWinProbability();

        ctx.fillStyle = '#eee';
        ctx.fillRect(x + padding, probBarY, probBarW, 20);

        ctx.fillStyle = this.colorA;
        ctx.fillRect(x + padding, probBarY, probBarW * probA, 20);

        ctx.fillStyle = this.colorB;
        ctx.fillRect(x + padding + probBarW * probA, probBarY, probBarW * (1 - probA), 20);

        // Probability text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px system-ui';
        if (probA > 0.15) {
            ctx.textAlign = 'left';
            ctx.fillText(`${(probA * 100).toFixed(0)}%`, x + padding + 5, probBarY + 14);
        }
        if (probA < 0.85) {
            ctx.textAlign = 'right';
            ctx.fillText(`${((1 - probA) * 100).toFixed(0)}%`, x + width - padding - 5, probBarY + 14);
        }

        // Series info
        if (this.seriesLength > 1) {
            ctx.fillStyle = '#999';
            ctx.font = '10px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(`Paras ${this.seriesLength}:stä`, centerX, y + 18);

            // Show series score if games played
            if (this.results.length > 0) {
                const { winsA, winsB } = this.getSeriesScore();
                ctx.fillStyle = '#333';
                ctx.font = 'bold 16px system-ui';
                ctx.fillText(`${winsA} - ${winsB}`, centerX, centerY + 35);
            }
        }

        // Home advantage indicator
        if (this.homeAdvantage > 0) {
            ctx.fillStyle = '#27ae60';
            ctx.font = '9px system-ui';
            ctx.textAlign = 'left';
            ctx.fillText('(koti)', teamAx, teamAy + teamBoxH + 12);
        }
    }

    /**
     * Draw team box
     */
    drawTeamBox(ctx, team, x, y, width, height, color, isLeft) {
        // Box
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.1;
        ctx.fillRect(x, y, width, height);
        ctx.globalAlpha = 1;

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        ctx.lineWidth = 1;

        // Team name
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(team.name, x + width / 2, y + 30);

        // Rating
        ctx.fillStyle = '#666';
        ctx.font = '12px system-ui';
        ctx.fillText(`ELO: ${team.rating}`, x + width / 2, y + 50);

        // Rating difference indicator
        const ratingDiff = team.rating - (isLeft ? this.teamB.rating : this.teamA.rating);
        if (Math.abs(ratingDiff) > 50) {
            const arrow = ratingDiff > 0 ? '↑' : '↓';
            const diffColor = ratingDiff > 0 ? '#27ae60' : '#e74c3c';
            ctx.fillStyle = diffColor;
            ctx.font = '11px system-ui';
            ctx.fillText(`${arrow}${Math.abs(ratingDiff)}`, x + width / 2, y + 68);
        }
    }

    /**
     * Draw series timeline
     */
    drawSeriesTimeline(ctx, x, y, width, height) {
        if (this.results.length === 0) return;

        const padding = 20;
        const gameW = Math.min(40, (width - padding * 2) / this.seriesLength);
        const gameH = 30;
        const startX = x + (width - gameW * this.results.length) / 2;

        // Title
        ctx.fillStyle = '#333';
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Ottelut', x + width / 2, y + 15);

        // Games
        this.results.forEach((result, i) => {
            const gx = startX + i * gameW;
            const gy = y + 25;

            ctx.fillStyle = result === 'A' ? this.colorA : this.colorB;
            ctx.fillRect(gx + 2, gy, gameW - 4, gameH);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(result === 'A' ? this.teamA.name.charAt(0) : this.teamB.name.charAt(0),
                        gx + gameW / 2, gy + gameH / 2 + 5);
        });

        // Remaining games (empty)
        const winsNeeded = Math.ceil(this.seriesLength / 2);
        const { winsA, winsB } = this.getSeriesScore();
        const maxGames = Math.min(this.seriesLength, this.results.length + Math.min(winsNeeded - winsA, winsNeeded - winsB));

        for (let i = this.results.length; i < maxGames; i++) {
            const gx = startX + i * gameW;
            const gy = y + 25;

            ctx.strokeStyle = '#ccc';
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(gx + 2, gy, gameW - 4, gameH);
            ctx.setLineDash([]);

            ctx.fillStyle = '#ccc';
            ctx.font = '12px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('?', gx + gameW / 2, gy + gameH / 2 + 5);
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MatchupComponent;
}
