/**
 * Reusable Tournament Bracket Component
 *
 * For visualizing elimination tournaments and match outcomes.
 * Supports single/double elimination and probability annotations.
 */

class BracketComponent {
    constructor(config = {}) {
        this.teams = [];  // Array of {id, name, rating, seed}
        this.matches = [];  // Array of {round, position, team1, team2, winner?, prob1?, prob2?}
        this.rounds = 0;
        this.highlightTeam = config.highlightTeam || null;
        this.showProbabilities = config.showProbabilities || false;
        this.teamColors = config.teamColors || {};
        this.defaultColor = config.defaultColor || '#3498db';
        this.winnerColor = config.winnerColor || '#27ae60';
        this.backgroundColor = config.backgroundColor || '#f8f8f8';
    }

    /**
     * Set up tournament with teams
     */
    setTeams(teams) {
        this.teams = teams.map((t, i) => ({
            id: t.id || i,
            name: t.name || `Joukkue ${i + 1}`,
            rating: t.rating || 1500,
            seed: t.seed || i + 1
        }));

        // Calculate rounds needed
        const n = this.teams.length;
        this.rounds = Math.ceil(Math.log2(n));

        // Generate initial bracket
        this.generateBracket();
    }

    /**
     * Generate bracket structure
     */
    generateBracket() {
        this.matches = [];
        const numTeams = this.teams.length;
        const totalSlots = Math.pow(2, this.rounds);

        // First round - seeded matchups
        for (let i = 0; i < totalSlots / 2; i++) {
            const team1Idx = i < numTeams ? i : null;
            const team2Idx = (totalSlots - 1 - i) < numTeams ? (totalSlots - 1 - i) : null;

            this.matches.push({
                round: 0,
                position: i,
                team1: team1Idx !== null ? this.teams[team1Idx] : null,
                team2: team2Idx !== null ? this.teams[team2Idx] : null,
                winner: null,
                prob1: null,
                prob2: null
            });

            // Handle byes
            if (team1Idx !== null && team2Idx === null) {
                this.matches[this.matches.length - 1].winner = this.teams[team1Idx];
            } else if (team2Idx !== null && team1Idx === null) {
                this.matches[this.matches.length - 1].winner = this.teams[team2Idx];
            }
        }

        // Later rounds
        for (let r = 1; r < this.rounds; r++) {
            const matchesInRound = Math.pow(2, this.rounds - r - 1);
            for (let i = 0; i < matchesInRound; i++) {
                this.matches.push({
                    round: r,
                    position: i,
                    team1: null,
                    team2: null,
                    winner: null,
                    prob1: null,
                    prob2: null
                });
            }
        }
    }

    /**
     * Set match result
     */
    setMatchResult(round, position, winner) {
        const match = this.matches.find(m => m.round === round && m.position === position);
        if (!match) return false;

        match.winner = winner;

        // Advance winner to next round
        if (round < this.rounds - 1) {
            const nextRound = round + 1;
            const nextPosition = Math.floor(position / 2);
            const nextMatch = this.matches.find(m => m.round === nextRound && m.position === nextPosition);
            if (nextMatch) {
                if (position % 2 === 0) {
                    nextMatch.team1 = winner;
                } else {
                    nextMatch.team2 = winner;
                }
            }
        }

        return true;
    }

    /**
     * Set match probabilities (for display)
     */
    setMatchProbabilities(round, position, prob1) {
        const match = this.matches.find(m => m.round === round && m.position === position);
        if (!match) return false;

        match.prob1 = prob1;
        match.prob2 = 1 - prob1;
        return true;
    }

    /**
     * Get tournament winner
     */
    getWinner() {
        const finalMatch = this.matches.find(m => m.round === this.rounds - 1 && m.position === 0);
        return finalMatch?.winner || null;
    }

    /**
     * Calculate win probability using ELO
     */
    calculateWinProbability(team1, team2, k = 400) {
        if (!team1 || !team2) return 0.5;
        return 1 / (1 + Math.pow(10, (team2.rating - team1.rating) / k));
    }

    /**
     * Simulate tournament with probabilities
     */
    simulate() {
        // Reset winners
        this.matches.forEach(m => {
            if (m.round > 0) {
                m.team1 = null;
                m.team2 = null;
            }
            m.winner = null;
        });

        // Re-handle first round byes
        this.matches.filter(m => m.round === 0).forEach(m => {
            if (m.team1 && !m.team2) m.winner = m.team1;
            else if (m.team2 && !m.team1) m.winner = m.team2;
        });

        // Simulate each round
        for (let r = 0; r < this.rounds; r++) {
            const roundMatches = this.matches.filter(m => m.round === r);
            roundMatches.forEach(match => {
                if (match.winner) {
                    // Already decided (bye)
                    this.advanceWinner(match);
                    return;
                }

                if (match.team1 && match.team2) {
                    const prob1 = this.calculateWinProbability(match.team1, match.team2);
                    match.prob1 = prob1;
                    match.prob2 = 1 - prob1;

                    // Random outcome based on probability
                    match.winner = Math.random() < prob1 ? match.team1 : match.team2;
                    this.advanceWinner(match);
                }
            });
        }

        return this.getWinner();
    }

    /**
     * Advance winner to next match
     */
    advanceWinner(match) {
        if (match.round >= this.rounds - 1) return;

        const nextRound = match.round + 1;
        const nextPosition = Math.floor(match.position / 2);
        const nextMatch = this.matches.find(m => m.round === nextRound && m.position === nextPosition);

        if (nextMatch && match.winner) {
            if (match.position % 2 === 0) {
                nextMatch.team1 = match.winner;
            } else {
                nextMatch.team2 = match.winner;
            }
        }
    }

    /**
     * Draw the bracket
     */
    draw(ctx, x, y, width, height) {
        if (this.teams.length === 0) {
            ctx.fillStyle = '#999';
            ctx.font = '12px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('Ei joukkueita', x + width / 2, y + height / 2);
            return;
        }

        const padding = 20;
        const roundWidth = (width - padding * 2) / this.rounds;
        const maxMatchesInRound = Math.pow(2, this.rounds - 1);
        const matchHeight = Math.min(40, (height - padding * 2) / maxMatchesInRound - 10);

        // Draw each round
        for (let r = 0; r < this.rounds; r++) {
            const roundMatches = this.matches.filter(m => m.round === r);
            const matchesInRound = roundMatches.length;
            const roundStartY = y + padding + (height - padding * 2) * (1 - matchesInRound / maxMatchesInRound) / 2;
            const spacing = (height - padding * 2) / matchesInRound;

            // Round label
            ctx.fillStyle = '#666';
            ctx.font = '10px system-ui';
            ctx.textAlign = 'center';
            const roundLabel = r === this.rounds - 1 ? 'Finaali' :
                               r === this.rounds - 2 ? 'Semifinaali' :
                               `Kierros ${r + 1}`;
            ctx.fillText(roundLabel, x + padding + r * roundWidth + roundWidth / 2, y + 12);

            roundMatches.forEach((match, i) => {
                const matchX = x + padding + r * roundWidth;
                const matchY = roundStartY + i * spacing + (spacing - matchHeight) / 2;
                this.drawMatch(ctx, match, matchX, matchY, roundWidth - 10, matchHeight);

                // Draw connector lines to next round
                if (r < this.rounds - 1) {
                    const nextY = y + padding + (height - padding * 2) * (1 - matchesInRound / 2 / maxMatchesInRound) / 2 +
                                  Math.floor(i / 2) * spacing * 2 + spacing - matchHeight / 2;

                    ctx.strokeStyle = '#ccc';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(matchX + roundWidth - 10, matchY + matchHeight / 2);
                    ctx.lineTo(matchX + roundWidth - 5, matchY + matchHeight / 2);
                    ctx.lineTo(matchX + roundWidth - 5, nextY);
                    ctx.stroke();
                }
            });
        }
    }

    /**
     * Draw a single match box
     */
    drawMatch(ctx, match, x, y, width, height) {
        // Background
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = '#aaa';
        ctx.strokeRect(x, y, width, height);

        const halfHeight = height / 2;

        // Divider
        ctx.strokeStyle = '#ddd';
        ctx.beginPath();
        ctx.moveTo(x, y + halfHeight);
        ctx.lineTo(x + width, y + halfHeight);
        ctx.stroke();

        // Team 1
        if (match.team1) {
            const isWinner = match.winner && match.winner.id === match.team1.id;
            const isHighlighted = this.highlightTeam === match.team1.id;

            ctx.fillStyle = isWinner ? this.winnerColor :
                           isHighlighted ? '#f39c12' :
                           this.teamColors[match.team1.id] || this.defaultColor;

            ctx.font = isWinner ? 'bold 10px system-ui' : '10px system-ui';
            ctx.textAlign = 'left';
            ctx.fillText(match.team1.name, x + 5, y + halfHeight - 5);

            if (this.showProbabilities && match.prob1 !== null) {
                ctx.fillStyle = '#999';
                ctx.font = '9px system-ui';
                ctx.textAlign = 'right';
                ctx.fillText(`${(match.prob1 * 100).toFixed(0)}%`, x + width - 5, y + halfHeight - 5);
            }
        }

        // Team 2
        if (match.team2) {
            const isWinner = match.winner && match.winner.id === match.team2.id;
            const isHighlighted = this.highlightTeam === match.team2.id;

            ctx.fillStyle = isWinner ? this.winnerColor :
                           isHighlighted ? '#f39c12' :
                           this.teamColors[match.team2.id] || this.defaultColor;

            ctx.font = isWinner ? 'bold 10px system-ui' : '10px system-ui';
            ctx.textAlign = 'left';
            ctx.fillText(match.team2.name, x + 5, y + height - 5);

            if (this.showProbabilities && match.prob2 !== null) {
                ctx.fillStyle = '#999';
                ctx.font = '9px system-ui';
                ctx.textAlign = 'right';
                ctx.fillText(`${(match.prob2 * 100).toFixed(0)}%`, x + width - 5, y + height - 5);
            }
        }
    }

    /**
     * Draw simplified bracket (just showing progression for one team)
     */
    drawTeamPath(ctx, teamId, x, y, width, height) {
        const teamMatches = this.matches.filter(m =>
            (m.team1?.id === teamId || m.team2?.id === teamId)
        );

        if (teamMatches.length === 0) return;

        const boxWidth = (width - 40) / teamMatches.length;
        const boxHeight = 50;
        const centerY = y + height / 2;

        teamMatches.forEach((match, i) => {
            const bx = x + 20 + i * boxWidth;
            const by = centerY - boxHeight / 2;

            // Box
            const isWin = match.winner?.id === teamId;
            ctx.fillStyle = isWin ? '#e8f8f0' : '#fee';
            ctx.fillRect(bx, by, boxWidth - 10, boxHeight);
            ctx.strokeStyle = isWin ? this.winnerColor : '#e74c3c';
            ctx.strokeRect(bx, by, boxWidth - 10, boxHeight);

            // Opponent
            const opponent = match.team1?.id === teamId ? match.team2 : match.team1;
            ctx.fillStyle = '#333';
            ctx.font = '10px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(`vs ${opponent?.name || '?'}`, bx + (boxWidth - 10) / 2, by + 20);

            // Result
            ctx.fillStyle = isWin ? this.winnerColor : '#e74c3c';
            ctx.font = 'bold 12px system-ui';
            ctx.fillText(isWin ? 'VOITTO' : 'TAPPIO', bx + (boxWidth - 10) / 2, by + 38);

            // Arrow to next
            if (i < teamMatches.length - 1 && isWin) {
                ctx.strokeStyle = '#ccc';
                ctx.beginPath();
                ctx.moveTo(bx + boxWidth - 10, centerY);
                ctx.lineTo(bx + boxWidth, centerY);
                ctx.stroke();
            }
        });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BracketComponent;
}
