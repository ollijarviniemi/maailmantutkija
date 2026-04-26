/**
 * Rule Discovery Game Application - Version 2
 * Complete rewrite with improved UI and game mechanics
 */

// ============================================================================
// GAME RULES DATABASE
// ============================================================================

const GAME_RULES = {
    shapes: [
        // Color patterns (20 rules)
        { id: 's1', name: 'Kaikki samaa väriä', check: (shapes) => shapes.every(s => s.color === shapes[0].color) },
        { id: 's2', name: 'Kaikki eri värejä', check: (shapes) => new Set(shapes.map(s => s.color)).size === shapes.length },
        { id: 's3', name: 'Löytyy vihreä', check: (shapes) => shapes.some(s => s.color === 'green') },
        { id: 's4', name: 'Löytyy punainen', check: (shapes) => shapes.some(s => s.color === 'red') },
        { id: 's5', name: 'Ei löydy punaista', check: (shapes) => !shapes.some(s => s.color === 'red') },
        { id: 's6', name: 'Ensimmäinen ja viimeinen samaa väriä', check: (shapes) => shapes[0].color === shapes[3].color },
        { id: 's7', name: 'Tarkalleen kaksi eri väriä', check: (shapes) => new Set(shapes.map(s => s.color)).size === 2 },
        { id: 's8', name: 'Kaikki samaa muotoa', check: (shapes) => shapes.every(s => s.shape === shapes[0].shape) },
        { id: 's9', name: 'Kaikki eri muotoja', check: (shapes) => new Set(shapes.map(s => s.shape)).size === shapes.length },
        { id: 's10', name: 'Löytyy kolmio', check: (shapes) => shapes.some(s => s.shape === 'triangle') },
        { id: 's11', name: 'Löytyy ympyrä', check: (shapes) => shapes.some(s => s.shape === 'circle') },
        { id: 's12', name: 'Ei ole neliöitä', check: (shapes) => !shapes.some(s => s.shape === 'square') },
        { id: 's13', name: 'Vähintään kaksi kolmiota', check: (shapes) => shapes.filter(s => s.shape === 'triangle').length >= 2 },
        { id: 's14', name: 'Tarkalleen kaksi eri muotoa', check: (shapes) => new Set(shapes.map(s => s.shape)).size === 2 },
        { id: 's15', name: 'Vähintään kaksi samaa', check: (shapes) => {
            const pairs = shapes.map(s => `${s.color}-${s.shape}`);
            return pairs.length !== new Set(pairs).size;
        }},
        { id: 's16', name: 'Kaikki punaiset ovat ympyröitä', check: (shapes) => shapes.filter(s => s.color === 'red').every(s => s.shape === 'circle') },
        { id: 's17', name: 'Ei ole punaista kolmiota', check: (shapes) => !shapes.some(s => s.color === 'red' && s.shape === 'triangle') },
        { id: 's18', name: 'Kolmas on ympyrä', check: (shapes) => shapes[2].shape === 'circle' },
        { id: 's19', name: 'Ensimmäinen on punainen tai sininen', check: (shapes) => ['red', 'blue'].includes(shapes[0].color) },
        { id: 's20', name: 'Viimeinen ei ole punainen', check: (shapes) => shapes[3].color !== 'red' },
    ],

    points: [
        // Point patterns (10 rules)
        { id: 'p1', name: 'Kaikki samalla suoralla', check: (points) => {
            if (points.length <= 2) return true;
            const [x1, y1] = points[0], [x2, y2] = points[1];
            return points.slice(2).every(([x, y]) => Math.abs((y2-y1)*(x-x1) - (x-x2)*(y2-y1)) < 0.01);
        }},
        { id: 'p2', name: 'Kaikki samalla vaakasuoralla', check: (points) => {
            const y = points[0][1];
            return points.every(([_, py]) => Math.abs(py - y) < 0.01);
        }},
        { id: 'p3', name: 'Kaikki samalla pystysuoralla', check: (points) => {
            const x = points[0][0];
            return points.every(([px, _]) => Math.abs(px - x) < 0.01);
        }},
        { id: 'p4', name: 'Jotkin kolme samalla suoralla', check: (points) => {
            for (let i = 0; i < points.length - 2; i++) {
                for (let j = i + 1; j < points.length - 1; j++) {
                    for (let k = j + 1; k < points.length; k++) {
                        const [x1, y1] = points[i], [x2, y2] = points[j], [x3, y3] = points[k];
                        if (Math.abs((y2-y1)*(x3-x1) - (x2-x1)*(y3-y1)) < 0.01) return true;
                    }
                }
            }
            return false;
        }},
        { id: 'p5', name: 'Symmetrinen pystysuunnassa', check: (points) => {
            const centerX = points.reduce((sum, [x, _]) => sum + x, 0) / points.length;
            return points.every(([x, y]) => points.some(([px, py]) => Math.abs(px - (2*centerX - x)) < 0.05 && Math.abs(py - y) < 0.05));
        }},
        { id: 'p6', name: 'Kaikki ympyrän kehällä', check: (points) => {
            if (points.length < 3) return true;
            const centerX = points.reduce((sum, [x, _]) => sum + x, 0) / points.length;
            const centerY = points.reduce((sum, [_, y]) => sum + y, 0) / points.length;
            const r1 = Math.sqrt((points[0][0] - centerX)**2 + (points[0][1] - centerY)**2);
            return points.every(([x, y]) => Math.abs(Math.sqrt((x - centerX)**2 + (y - centerY)**2) - r1) < 0.05);
        }},
        { id: 'p7', name: 'Pisteitä on parillinen määrä', check: (points) => points.length % 2 === 0 },
        { id: 'p8', name: 'Pisteitä on vähemmän kuin 8', check: (points) => points.length < 8 },
        { id: 'p9', name: 'Pisteitä on enemmän kuin 5', check: (points) => points.length > 5 },
        { id: 'p10', name: 'Konveksi', check: (points) => {
            // Simple convexity check (all points on or inside convex hull)
            if (points.length < 4) return true;
            return true; // Simplified - always return true for now
        }},
    ],

    functions: [
        // Function rules (30 rules)
        { id: 'f1', name: 'Tuplaa (2x)', check: (x) => 2 * x },
        { id: 'f2', name: 'Lisää 5', check: (x) => x + 5 },
        { id: 'f3', name: 'Kerro kolmella', check: (x) => 3 * x },
        { id: 'f4', name: 'Vähennä 3', check: (x) => x - 3 },
        { id: 'f5', name: 'Neliöi (x²)', check: (x) => x * x },
        { id: 'f6', name: 'Negoi (−x)', check: (x) => -x },
        { id: 'f7', name: 'Itseisarvo |x|', check: (x) => Math.abs(x) },
        { id: 'f8', name: 'Puolita', check: (x) => x / 2 },
        { id: 'f9', name: 'Jakojäännös kahdella (x mod 2)', check: (x) => x % 2 },
        { id: 'f10', name: 'Jakojäännös kolmella (x mod 3)', check: (x) => ((x % 3) + 3) % 3 },
        { id: 'f11', name: 'Jakojäännös viidellä (x mod 5)', check: (x) => ((x % 5) + 5) % 5 },
        { id: 'f12', name: 'Viimeinen numero (x mod 10)', check: (x) => ((x % 10) + 10) % 10 },
        { id: 'f13', name: 'Pyöristä alaspäin', check: (x) => Math.floor(x) },
        { id: 'f14', name: 'Pyöristä ylöspäin', check: (x) => Math.ceil(x) },
        { id: 'f15', name: 'Pyöristä lähimpään', check: (x) => Math.round(x) },
        { id: 'f16', name: 'Jos parillinen, puolita; muuten triplaa ja lisää 1', check: (x) => x % 2 === 0 ? x / 2 : 3 * x + 1 },
        { id: 'f17', name: 'Jos positiivinen, neliöi; muuten nolla', check: (x) => x > 0 ? x * x : 0 },
        { id: 'f18', name: 'Maksimi (x ja 10)', check: (x) => Math.max(x, 10) },
        { id: 'f19', name: 'Minimi (x ja 10)', check: (x) => Math.min(x, 10) },
        { id: 'f20', name: 'Onko parillinen? (1/0)', check: (x) => x % 2 === 0 ? 1 : 0 },
        { id: 'f21', name: 'Onko positiivinen? (1/0)', check: (x) => x > 0 ? 1 : 0 },
        { id: 'f22', name: 'Onko suurempi kuin 10? (1/0)', check: (x) => x > 10 ? 1 : 0 },
        { id: 'f23', name: 'Onko jaollinen kolmella? (1/0)', check: (x) => x % 3 === 0 ? 1 : 0 },
        { id: 'f24', name: '2x + 1', check: (x) => 2 * x + 1 },
        { id: 'f25', name: 'x² + x', check: (x) => x * x + x },
        { id: 'f26', name: 'Palauttaa aina 7', check: (x) => 7 },
        { id: 'f27', name: 'Palauttaa inputin (x)', check: (x) => x },
        { id: 'f28', name: '10 - x', check: (x) => 10 - x },
        { id: 'f29', name: 'x² - 5', check: (x) => x * x - 5 },
        { id: 'f30', name: 'Jos alle 5, kertoo kahdella; muuten lisää 3', check: (x) => x < 5 ? 2 * x : x + 3 },
    ],

    sequences: [
        // Sequence rules (20 rules)
        { id: 'seq1', name: 'Lisää 1 (1, 2, 3, 4...)', generate: () => [1, 2, 3, 4, 5, 6], required: 4 },
        { id: 'seq2', name: 'Lisää 2 (2, 4, 6, 8...)', generate: () => [2, 4, 6, 8, 10, 12], required: 4 },
        { id: 'seq3', name: 'Lisää 3 (3, 6, 9, 12...)', generate: () => [3, 6, 9, 12, 15, 18], required: 4 },
        { id: 'seq4', name: 'Lisää 5 (5, 10, 15...)', generate: () => [5, 10, 15, 20, 25, 30], required: 4 },
        { id: 'seq5', name: 'Vähennä 2 (20, 18, 16...)', generate: () => [20, 18, 16, 14, 12, 10], required: 4 },
        { id: 'seq6', name: 'Kaksinkertaistuu (1, 2, 4, 8...)', generate: () => [1, 2, 4, 8, 16, 32], required: 4 },
        { id: 'seq7', name: 'Kolminkertaistuu (1, 3, 9, 27...)', generate: () => [1, 3, 9, 27, 81, 243], required: 4 },
        { id: 'seq8', name: 'Puolittuu (64, 32, 16...)', generate: () => [64, 32, 16, 8, 4, 2], required: 4 },
        { id: 'seq9', name: 'Neliöluvut (1, 4, 9, 16...)', generate: () => [1, 4, 9, 16, 25, 36], required: 4 },
        { id: 'seq10', name: 'Kuutioluvut (1, 8, 27, 64...)', generate: () => [1, 8, 27, 64, 125, 216], required: 4 },
        { id: 'seq11', name: 'Kolmioluvut n(n+1)/2 (1, 3, 6, 10...)', generate: () => [1, 3, 6, 10, 15, 21], required: 4 },
        { id: 'seq12', name: 'n² + 1 (2, 5, 10, 17...)', generate: () => [2, 5, 10, 17, 26, 37], required: 4 },
        { id: 'seq13', name: 'n² + n (2, 6, 12, 20...)', generate: () => [2, 6, 12, 20, 30, 42], required: 4 },
        { id: 'seq14', name: 'Fibonacci (1, 1, 2, 3, 5, 8...)', generate: () => [1, 1, 2, 3, 5, 8], required: 4 },
        { id: 'seq15', name: 'Erotus kasvaa (1, 2, 4, 7, 11...)', generate: () => [1, 2, 4, 7, 11, 16], required: 4 },
        { id: 'seq16', name: 'Vuorottele +3, -1 (1, 4, 3, 6, 5...)', generate: () => [1, 4, 3, 6, 5, 8], required: 5 },
        { id: 'seq17', name: 'Parilliset luvut (2, 4, 6, 8...)', generate: () => [2, 4, 6, 8, 10, 12], required: 4 },
        { id: 'seq18', name: 'Parittomat luvut (1, 3, 5, 7...)', generate: () => [1, 3, 5, 7, 9, 11], required: 4 },
        { id: 'seq19', name: 'Alkuluvut (2, 3, 5, 7, 11...)', generate: () => [2, 3, 5, 7, 11, 13, 17, 19, 23, 29], required: 8 },
        { id: 'seq20', name: 'Kaikki samoja (5, 5, 5, 5...)', generate: () => [5, 5, 5, 5, 5, 5], required: 4 },
    ],

    threeNumbers: [
        // Three number rules (35 rules)
        { id: 't1', name: 'Aidosti kasvava (a < b < c)', check: (a, b, c) => a < b && b < c },
        { id: 't2', name: 'Aidosti vähenevä (a > b > c)', check: (a, b, c) => a > b && b > c },
        { id: 't3', name: 'Ei-vähenevä (a ≤ b ≤ c)', check: (a, b, c) => a <= b && b <= c },
        { id: 't4', name: 'Suurin kasa on keskellä', check: (a, b, c) => b > a && b > c },
        { id: 't5', name: 'Pienin kasa on keskellä', check: (a, b, c) => b < a && b < c },
        { id: 't6', name: 'Kaikki samaa kokoa', check: (a, b, c) => a === b && b === c },
        { id: 't7', name: 'Tarkalleen kaksi on samaa kokoa', check: (a, b, c) => (a === b && b !== c) || (b === c && a !== b) || (a === c && a !== b) },
        { id: 't8', name: 'Ensimmäinen ja viimeinen samaa kokoa', check: (a, b, c) => a === c },
        { id: 't9', name: 'Kaikki eri suuret', check: (a, b, c) => a !== b && b !== c && a !== c },
        { id: 't10', name: 'Reunimmaisissa on yhtä paljon', check: (a, b, c) => a === c },
        { id: 't11', name: 'Summa on parillinen', check: (a, b, c) => (a + b + c) % 2 === 0 },
        { id: 't12', name: 'Summa on pariton', check: (a, b, c) => (a + b + c) % 2 === 1 },
        { id: 't13', name: 'Summa on alle 15', check: (a, b, c) => a + b + c < 15 },
        { id: 't14', name: 'Summa on yli 20', check: (a, b, c) => a + b + c > 20 },
        { id: 't15', name: 'Yhteensä enintään 10 mustikkaa', check: (a, b, c) => a + b + c <= 10 },
        { id: 't16', name: 'Summa on jaollinen kolmella', check: (a, b, c) => (a + b + c) % 3 === 0 },
        { id: 't17', name: 'Aritmeettinen (erotukset yhtäsuuret)', check: (a, b, c) => (b - a) === (c - b) },
        { id: 't18', name: 'Aina +1 (esim. 3, 4, 5)', check: (a, b, c) => b === a + 1 && c === b + 1 },
        { id: 't19', name: 'Erotus suurimman ja pienimmän välillä on alle 5', check: (a, b, c) => Math.max(a, b, c) - Math.min(a, b, c) < 5 },
        { id: 't20', name: 'Tulo on parillinen', check: (a, b, c) => (a * b * c) % 2 === 0 },
        { id: 't21', name: 'Ensimmäinen × 2 = toinen', check: (a, b, c) => a * 2 === b },
        { id: 't22', name: 'Geometrinen (suhde vakio)', check: (a, b, c) => a !== 0 && b !== 0 && Math.abs(b / a - c / b) < 0.01 },
        { id: 't23', name: 'Ensimmäinen on parillinen', check: (a, b, c) => a % 2 === 0 },
        { id: 't24', name: 'Toinen on pariton', check: (a, b, c) => b % 2 === 1 },
        { id: 't25', name: 'Kolmas on suurempi kuin 5', check: (a, b, c) => c > 5 },
        { id: 't26', name: 'Kaikki ovat parillisia', check: (a, b, c) => a % 2 === 0 && b % 2 === 0 && c % 2 === 0 },
        { id: 't27', name: 'Kaikki ovat parittomia', check: (a, b, c) => a % 2 === 1 && b % 2 === 1 && c % 2 === 1 },
        { id: 't28', name: 'Vähintään yksi on parillinen', check: (a, b, c) => a % 2 === 0 || b % 2 === 0 || c % 2 === 0 },
        { id: 't29', name: 'Löytyy parillinen luku', check: (a, b, c) => a % 2 === 0 || b % 2 === 0 || c % 2 === 0 },
        { id: 't30', name: 'Kaikki ovat alle 10', check: (a, b, c) => a < 10 && b < 10 && c < 10 },
        { id: 't31', name: 'Ensimmäinen + toinen = kolmas', check: (a, b, c) => a + b === c },
        { id: 't32', name: 'Yhdessä yhtä monta kuin kahdessa muussa yhteensä', check: (a, b, c) => a === b + c || b === a + c || c === a + b },
        { id: 't33', name: 'Kolme peräkkäistä kokonaislukua', check: (a, b, c) => {
            const sorted = [a, b, c].sort((x, y) => x - y);
            return sorted[1] === sorted[0] + 1 && sorted[2] === sorted[1] + 1;
        }},
        { id: 't34', name: 'Mediaani on 5', check: (a, b, c) => {
            const sorted = [a, b, c].sort((x, y) => x - y);
            return sorted[1] === 5;
        }},
        { id: 't35', name: 'Muodostavat kolmion (kolmioepäyhtälö)', check: (a, b, c) => {
            return a > 0 && b > 0 && c > 0 && a + b > c && b + c > a && a + c > b;
        }},
    ]
};

// ============================================================================
// MAIN APPLICATION CLASS
// ============================================================================

class RuleDiscoveryApp {
    constructor() {
        this.currentGame = null;
        this.currentRound = null;
        this.progress = this.loadProgress();
        this.roundHistory = [];
        this.correctStreak = 0;
        this.sequenceStreak = 0;
        this.revealButtonTimer = null;
        this.inputBlocked = false;
        this.shapeGenerator = new ClientShapeGenerator(100, 100);

        this.initializeApp();
    }

    initializeApp() {
        // Initialize DOM elements
        this.mainMenu = document.getElementById('main-menu');
        this.gameScreen = document.getElementById('game-screen');
        this.exampleDisplay = document.getElementById('example-display');
        this.controlsDiv = document.getElementById('controls');
        this.historyColumn = document.getElementById('history-column');
        this.historyContent = document.getElementById('history-content');
        this.feedback = document.getElementById('feedback');

        // Render progress for all games
        this.renderAllProgress();

        // Set up event listeners
        this.setupEventListeners();

        // Help tooltip
        this.setupHelpTooltip();

        console.log('Rule Discovery App initialized');
    }

    setupEventListeners() {
        // Game row clicks
        document.querySelectorAll('.game-row').forEach(row => {
            row.addEventListener('click', (e) => {
                const game = row.dataset.game;
                this.startGame(game);
            });
        });

        // Back button
        document.getElementById('back-to-menu').addEventListener('click', () => {
            this.backToMenu();
        });

        // Reset button (only on main menu)
        document.getElementById('reset-all').addEventListener('click', () => this.resetAllData());
    }

    setupHelpTooltip() {
        const helpIcon = document.getElementById('help-icon');
        const helpTooltip = document.getElementById('help-tooltip');

        if (helpIcon && helpTooltip) {
            helpIcon.addEventListener('mouseenter', () => {
                helpTooltip.style.display = 'block';
            });

            helpIcon.addEventListener('mouseleave', () => {
                helpTooltip.style.display = 'none';
            });
        }
    }

    // ========================================================================
    // PROGRESS MANAGEMENT
    // ========================================================================

    loadProgress() {
        try {
            const saved = localStorage.getItem('ruleDiscoveryProgress');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading progress:', error);
        }

        // Initialize empty progress
        const progress = {};
        for (const game in GAME_RULES) {
            progress[game] = GAME_RULES[game].map(rule => ({
                ruleId: rule.id,
                completed: false,
                attempts: 0
            }));
        }
        return progress;
    }

    saveProgress() {
        try {
            localStorage.setItem('ruleDiscoveryProgress', JSON.stringify(this.progress));
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    }

    markRoundComplete(game, ruleId) {
        const roundProgress = this.progress[game].find(p => p.ruleId === ruleId);
        if (roundProgress) {
            roundProgress.completed = true;
            roundProgress.attempts++;
            this.saveProgress();
            this.renderProgress(game);
        }
    }

    renderAllProgress() {
        for (const game in GAME_RULES) {
            this.renderProgress(game);
        }
    }

    renderProgress(game) {
        const container = document.getElementById(`${game}-rounds`);
        if (!container) return;

        container.innerHTML = '';
        const rules = GAME_RULES[game];
        const progress = this.progress[game];

        rules.forEach((rule, index) => {
            const box = document.createElement('div');
            box.className = 'round-box';
            box.textContent = index + 1;

            const roundProgress = progress.find(p => p.ruleId === rule.id);
            if (roundProgress && roundProgress.completed) {
                box.classList.add('completed');
            }
            container.appendChild(box);
        });
    }

    resetAllData() {
        if (confirm('Haluatko varmasti nollata kaikki tiedot? Tätä ei voi perua.')) {
            localStorage.removeItem('ruleDiscoveryProgress');
            this.progress = this.loadProgress();
            this.renderAllProgress();
            this.backToMenu();
            alert('Kaikki tiedot on nollattu.');
        }
    }

    // ========================================================================
    // GAME FLOW
    // ========================================================================

    startGame(game) {
        this.currentGame = game;
        const rules = GAME_RULES[game];

        // Find next incomplete round
        const incompletedRound = this.progress[game].findIndex(p => !p.completed);
        const roundIndex = incompletedRound !== -1 ? incompletedRound : 0;

        this.currentRound = rules[roundIndex];
        this.roundHistory = [];
        this.correctStreak = 0;
        this.sequenceStreak = 0;

        // Show game screen
        this.mainMenu.style.display = 'none';
        this.gameScreen.classList.add('active');

        // Update game info
        document.getElementById('game-title').textContent = this.getGameTitle(game);
        document.getElementById('round-info').textContent = `Kierros ${roundIndex + 1} / ${rules.length}`;

        // Show history column for applicable games
        if (['shapes', 'points'].includes(game)) {
            this.historyColumn.classList.remove('hidden');
            this.historyContent.innerHTML = '';
        } else {
            this.historyColumn.classList.add('hidden');
        }

        // Generate first example
        this.generateExample();
    }

    getGameTitle(game) {
        const titles = {
            shapes: 'Värikkäät muodot',
            points: 'Pisteet tasossa',
            functions: 'Funktiokoneet',
            sequences: 'Lukujonot',
            threeNumbers: 'Kolmen luvun peli'
        };
        return titles[game] || game;
    }

    backToMenu() {
        this.currentGame = null;
        this.currentRound = null;
        this.roundHistory = [];
        this.correctStreak = 0;
        this.sequenceStreak = 0;

        if (this.revealButtonTimer) {
            clearTimeout(this.revealButtonTimer);
            this.revealButtonTimer = null;
        }

        this.gameScreen.classList.remove('active');
        this.mainMenu.style.display = 'block';

        this.clearFeedback();
    }

    // ========================================================================
    // EXAMPLE GENERATION
    // ========================================================================

    generateExample() {
        this.clearFeedback();

        if (this.currentGame === 'shapes') {
            this.generateShapesExample();
        } else if (this.currentGame === 'points') {
            this.generatePointsExample();
        } else if (this.currentGame === 'functions') {
            this.generateFunctionsUI();
        } else if (this.currentGame === 'sequences') {
            this.generateSequencesUI();
        } else if (this.currentGame === 'threeNumbers') {
            this.generateThreeNumbersUI();
        }
    }

    // ========================================================================
    // SHAPES GAME
    // ========================================================================

    generateShapesExample() {
        // Generate shapes that match the rule 50% of the time
        const colors = ['red', 'blue', 'green', 'purple', 'black'];
        const shapeTypes = ['circle', 'square', 'triangle', 'star', 'heart', 'plus'];

        let shapes, satisfiesRule;
        const maxAttempts = 100;
        let attempt = 0;

        // Decide if this example should satisfy the rule or not
        const shouldSatisfy = Math.random() < 0.5;

        do {
            shapes = [];

            // Generate shapes based on the current rule to ensure balance
            const ruleId = this.currentRound.id;

            if (ruleId === 's1' && shouldSatisfy && Math.random() < 0.8) {
                // All same color
                const color = colors[Math.floor(Math.random() * colors.length)];
                for (let i = 0; i < 4; i++) {
                    shapes.push({
                        color: color,
                        shape: shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
                    });
                }
            } else if (ruleId === 's2' && shouldSatisfy && Math.random() < 0.8) {
                // All different colors
                const shuffledColors = [...colors].sort(() => Math.random() - 0.5);
                for (let i = 0; i < 4; i++) {
                    shapes.push({
                        color: shuffledColors[i],
                        shape: shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
                    });
                }
            } else if ((ruleId === 's3' || ruleId === 's4') && shouldSatisfy && Math.random() < 0.8) {
                // Contains specific color
                const targetColor = ruleId === 's3' ? 'green' : 'red';
                const targetIndex = Math.floor(Math.random() * 4);
                for (let i = 0; i < 4; i++) {
                    if (i === targetIndex) {
                        shapes.push({
                            color: targetColor,
                            shape: shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
                        });
                    } else {
                        shapes.push({
                            color: colors[Math.floor(Math.random() * colors.length)],
                            shape: shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
                        });
                    }
                }
            } else if (ruleId === 's5' && shouldSatisfy && Math.random() < 0.8) {
                // No red
                const nonRedColors = colors.filter(c => c !== 'red');
                for (let i = 0; i < 4; i++) {
                    shapes.push({
                        color: nonRedColors[Math.floor(Math.random() * nonRedColors.length)],
                        shape: shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
                    });
                }
            } else if (ruleId === 's6' && shouldSatisfy && Math.random() < 0.8) {
                // First and last same color
                const color = colors[Math.floor(Math.random() * colors.length)];
                shapes.push({
                    color: color,
                    shape: shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
                });
                shapes.push({
                    color: colors[Math.floor(Math.random() * colors.length)],
                    shape: shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
                });
                shapes.push({
                    color: colors[Math.floor(Math.random() * colors.length)],
                    shape: shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
                });
                shapes.push({
                    color: color,
                    shape: shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
                });
            } else if (ruleId === 's7' && shouldSatisfy && Math.random() < 0.8) {
                // Exactly two colors
                const color1 = colors[Math.floor(Math.random() * colors.length)];
                let color2 = colors[Math.floor(Math.random() * colors.length)];
                while (color2 === color1) color2 = colors[Math.floor(Math.random() * colors.length)];

                for (let i = 0; i < 4; i++) {
                    shapes.push({
                        color: Math.random() < 0.5 ? color1 : color2,
                        shape: shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
                    });
                }
            } else if (ruleId === 's8' && shouldSatisfy && Math.random() < 0.8) {
                // All same shape
                const shapeType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
                for (let i = 0; i < 4; i++) {
                    shapes.push({
                        color: colors[Math.floor(Math.random() * colors.length)],
                        shape: shapeType
                    });
                }
            } else if (ruleId === 's9' && shouldSatisfy && Math.random() < 0.8) {
                // All different shapes
                const shuffledShapes = [...shapeTypes].sort(() => Math.random() - 0.5);
                for (let i = 0; i < 4; i++) {
                    shapes.push({
                        color: colors[Math.floor(Math.random() * colors.length)],
                        shape: shuffledShapes[i]
                    });
                }
            } else if ((ruleId === 's10' || ruleId === 's11') && shouldSatisfy && Math.random() < 0.8) {
                // Contains specific shape
                const targetShape = ruleId === 's10' ? 'triangle' : 'circle';
                const targetIndex = Math.floor(Math.random() * 4);
                for (let i = 0; i < 4; i++) {
                    if (i === targetIndex) {
                        shapes.push({
                            color: colors[Math.floor(Math.random() * colors.length)],
                            shape: targetShape
                        });
                    } else {
                        shapes.push({
                            color: colors[Math.floor(Math.random() * colors.length)],
                            shape: shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
                        });
                    }
                }
            } else if (ruleId === 's12' && shouldSatisfy && Math.random() < 0.8) {
                // No squares
                const nonSquareShapes = shapeTypes.filter(s => s !== 'square');
                for (let i = 0; i < 4; i++) {
                    shapes.push({
                        color: colors[Math.floor(Math.random() * colors.length)],
                        shape: nonSquareShapes[Math.floor(Math.random() * nonSquareShapes.length)]
                    });
                }
            } else if (ruleId === 's13' && shouldSatisfy && Math.random() < 0.8) {
                // At least two triangles
                const numTriangles = 2 + Math.floor(Math.random() * 3); // 2-4 triangles
                const triangleIndices = [];
                while (triangleIndices.length < numTriangles) {
                    const idx = Math.floor(Math.random() * 4);
                    if (!triangleIndices.includes(idx)) triangleIndices.push(idx);
                }
                for (let i = 0; i < 4; i++) {
                    shapes.push({
                        color: colors[Math.floor(Math.random() * colors.length)],
                        shape: triangleIndices.includes(i) ? 'triangle' : shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
                    });
                }
            } else if (ruleId === 's14' && shouldSatisfy && Math.random() < 0.8) {
                // Exactly two shapes
                const shape1 = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
                let shape2 = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
                while (shape2 === shape1) shape2 = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];

                for (let i = 0; i < 4; i++) {
                    shapes.push({
                        color: colors[Math.floor(Math.random() * colors.length)],
                        shape: Math.random() < 0.5 ? shape1 : shape2
                    });
                }
            } else if (ruleId === 's15' && shouldSatisfy && Math.random() < 0.8) {
                // At least two identical (same color AND shape)
                const duplicateColor = colors[Math.floor(Math.random() * colors.length)];
                const duplicateShape = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
                const duplicateIndices = [0, 1]; // First two will be identical

                shapes.push({ color: duplicateColor, shape: duplicateShape });
                shapes.push({ color: duplicateColor, shape: duplicateShape });
                shapes.push({
                    color: colors[Math.floor(Math.random() * colors.length)],
                    shape: shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
                });
                shapes.push({
                    color: colors[Math.floor(Math.random() * colors.length)],
                    shape: shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
                });
            } else if (ruleId === 's16' && shouldSatisfy && Math.random() < 0.8) {
                // All red ones are circles
                for (let i = 0; i < 4; i++) {
                    const color = colors[Math.floor(Math.random() * colors.length)];
                    const shape = color === 'red' ? 'circle' : shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
                    shapes.push({ color, shape });
                }
            } else if (ruleId === 's17' && shouldSatisfy && Math.random() < 0.8) {
                // No red triangle
                for (let i = 0; i < 4; i++) {
                    const color = colors[Math.floor(Math.random() * colors.length)];
                    const shape = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
                    if (color === 'red' && shape === 'triangle') {
                        // Change one of them
                        shapes.push(Math.random() < 0.5 ?
                            { color: colors.filter(c => c !== 'red')[Math.floor(Math.random() * (colors.length - 1))], shape } :
                            { color, shape: shapeTypes.filter(s => s !== 'triangle')[Math.floor(Math.random() * (shapeTypes.length - 1))] }
                        );
                    } else {
                        shapes.push({ color, shape });
                    }
                }
            } else if (ruleId === 's18' && shouldSatisfy && Math.random() < 0.8) {
                // Third is circle
                for (let i = 0; i < 4; i++) {
                    shapes.push({
                        color: colors[Math.floor(Math.random() * colors.length)],
                        shape: i === 2 ? 'circle' : shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
                    });
                }
            } else if (ruleId === 's19' && shouldSatisfy && Math.random() < 0.8) {
                // First is red or blue
                const firstColor = Math.random() < 0.5 ? 'red' : 'blue';
                shapes.push({
                    color: firstColor,
                    shape: shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
                });
                for (let i = 1; i < 4; i++) {
                    shapes.push({
                        color: colors[Math.floor(Math.random() * colors.length)],
                        shape: shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
                    });
                }
            } else if (ruleId === 's20' && shouldSatisfy && Math.random() < 0.8) {
                // Last is not red
                for (let i = 0; i < 3; i++) {
                    shapes.push({
                        color: colors[Math.floor(Math.random() * colors.length)],
                        shape: shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
                    });
                }
                shapes.push({
                    color: colors.filter(c => c !== 'red')[Math.floor(Math.random() * (colors.length - 1))],
                    shape: shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
                });
            } else {
                // Default: random generation
                for (let i = 0; i < 4; i++) {
                    shapes.push({
                        color: colors[Math.floor(Math.random() * colors.length)],
                        shape: shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
                    });
                }
            }

            satisfiesRule = this.currentRound.check(shapes);
            attempt++;

        } while (satisfiesRule !== shouldSatisfy && attempt < maxAttempts);

        // Display shapes in individual boxes
        const shapesRow = document.createElement('div');
        shapesRow.className = 'shapes-row';

        shapes.forEach(shape => {
            const shapeBox = document.createElement('div');
            shapeBox.className = 'shape-box';

            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 100;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, 100, 100);

            this.shapeGenerator.drawShape(ctx, shape.shape, [50, 50], 35, shape.color);

            shapeBox.appendChild(canvas);
            shapesRow.appendChild(shapeBox);
        });

        this.exampleDisplay.innerHTML = '';
        this.exampleDisplay.appendChild(shapesRow);

        // Controls
        this.controlsDiv.innerHTML = `
            <div class="button-group">
                <button class="btn btn-yes" id="btn-yes">Kyllä</button>
                <button class="btn btn-no" id="btn-no">Ei</button>
            </div>
        `;

        document.getElementById('btn-yes').addEventListener('click', () => this.handleBinaryAnswer(true, shapes));
        document.getElementById('btn-no').addEventListener('click', () => this.handleBinaryAnswer(false, shapes));

        this.currentExample = shapes;
    }

    handleBinaryAnswer(userAnswer, example) {
        const correctAnswer = this.currentRound.check(example);
        const isCorrect = userAnswer === correctAnswer;

        // Add to history
        this.addToHistory(example, correctAnswer, userAnswer, isCorrect);

        if (isCorrect) {
            this.correctStreak++;
            this.showFeedback(`✓ ${this.correctStreak}/10`, 'correct');

            if (this.correctStreak >= 10) {
                this.completeRound();
            } else {
                setTimeout(() => this.generateExample(), 800);
            }
        } else {
            this.correctStreak = 0;
            this.showFeedback('✗', 'incorrect');
            setTimeout(() => this.generateExample(), 1200);
        }
    }

    addToHistory(example, correctAnswer, userAnswer, isCorrect) {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';

        const trialNumber = this.roundHistory.length + 1;

        const header = document.createElement('div');
        header.className = 'history-item-header';
        header.innerHTML = `
            <span>#${trialNumber}</span>
            <span class="${isCorrect ? 'correct-answer' : 'incorrect-answer'}">${isCorrect ? '✓' : '✗'}</span>
        `;
        historyItem.appendChild(header);

        if (this.currentGame === 'shapes') {
            // Draw mini shapes
            const shapesDiv = document.createElement('div');
            shapesDiv.className = 'history-shapes';

            example.forEach(shape => {
                const miniCanvas = document.createElement('canvas');
                miniCanvas.className = 'history-shape-mini';
                miniCanvas.width = 30;
                miniCanvas.height = 30;
                const ctx = miniCanvas.getContext('2d');

                // White background
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, 30, 30);

                // Draw shape
                this.shapeGenerator.drawShape(ctx, shape.shape, [15, 15], 10, shape.color);
                shapesDiv.appendChild(miniCanvas);
            });

            historyItem.appendChild(shapesDiv);

            const result = document.createElement('div');
            result.className = 'history-result';
            // Visual representation: correctAnswer (userAnswer)
            const correctIcon = correctAnswer ? '✓' : '✗';
            const userIcon = userAnswer ? '✓' : '✗';
            const matchColor = isCorrect ? '#4caf50' : '#f44336';
            result.innerHTML = `${correctIcon} <span style="color: ${matchColor};">(${userIcon})</span>`;
            historyItem.appendChild(result);

        } else if (this.currentGame === 'points') {
            // Draw mini point visualization
            const miniCanvas = document.createElement('canvas');
            miniCanvas.width = 150;
            miniCanvas.height = 80;
            const ctx = miniCanvas.getContext('2d');

            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, 150, 80);

            // Draw points (copy stored raw points for this specific example)
            const rawPoints = JSON.parse(JSON.stringify(this.currentExampleRaw));
            rawPoints.forEach(([x, y]) => {
                // Scale to mini canvas
                const scaledX = (x - 50) / 500 * 130 + 10;
                const scaledY = (y - 50) / 300 * 60 + 10;

                ctx.fillStyle = '#2196F3';
                ctx.beginPath();
                ctx.arc(scaledX, scaledY, 3, 0, 2 * Math.PI);
                ctx.fill();
            });

            historyItem.appendChild(miniCanvas);

            const result = document.createElement('div');
            result.className = 'history-result';
            // Visual representation
            const correctIcon = correctAnswer ? '✓' : '✗';
            const userIcon = userAnswer ? '✓' : '✗';
            const matchColor = isCorrect ? '#4caf50' : '#f44336';
            result.innerHTML = `${correctIcon} <span style="color: ${matchColor};">(${userIcon})</span>`;
            historyItem.appendChild(result);
        }

        this.historyContent.insertBefore(historyItem, this.historyContent.firstChild);
        this.roundHistory.push({ example, correctAnswer, userAnswer, isCorrect, rawPoints: this.currentExampleRaw ? JSON.parse(JSON.stringify(this.currentExampleRaw)) : null });
    }

    // ========================================================================
    // POINTS GAME
    // ========================================================================

    generateNonOverlappingPoints(points, numPoints) {
        const minDistance = 30; // Minimum distance between points
        const maxAttempts = 100;

        for (let i = 0; i < numPoints; i++) {
            let validPoint = false;
            let attempts = 0;

            while (!validPoint && attempts < maxAttempts) {
                const newPoint = [
                    50 + Math.random() * 500,
                    50 + Math.random() * 300
                ];

                // Check distance from all existing points
                validPoint = true;
                for (const existingPoint of points) {
                    const dx = newPoint[0] - existingPoint[0];
                    const dy = newPoint[1] - existingPoint[1];
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < minDistance) {
                        validPoint = false;
                        break;
                    }
                }

                if (validPoint) {
                    points.push(newPoint);
                }

                attempts++;
            }

            // If we couldn't find a valid point, just add a random one
            if (!validPoint) {
                points.push([
                    50 + Math.random() * 500,
                    50 + Math.random() * 300
                ]);
            }
        }
    }

    generatePointsExample() {
        // Generate points that match the rule 50% of the time
        let points, normalized, satisfiesRule;
        const maxAttempts = 100;
        let attempt = 0;

        // Decide if this example should satisfy the rule or not
        const shouldSatisfy = Math.random() < 0.5;

        do {
            const numPoints = 4 + Math.floor(Math.random() * 5);
            points = [];

            // Generate points based on the current rule to ensure balance
            if (this.currentRound.id === 'p1' || this.currentRound.id === 'p2' || this.currentRound.id === 'p3') {
                // Linear rules - make it easier to generate matching examples
                if (shouldSatisfy && Math.random() < 0.7) {
                    // Generate points on a line
                    const x1 = 50 + Math.random() * 500;
                    const y1 = 50 + Math.random() * 300;
                    const x2 = 50 + Math.random() * 500;
                    const y2 = 50 + Math.random() * 300;

                    for (let i = 0; i < numPoints; i++) {
                        const t = i / (numPoints - 1);
                        points.push([
                            x1 + t * (x2 - x1),
                            y1 + t * (y2 - y1)
                        ]);
                    }
                } else {
                    // Generate random points with minimum distance
                    this.generateNonOverlappingPoints(points, numPoints);
                }
            } else {
                // For other rules, generate random points with minimum distance
                this.generateNonOverlappingPoints(points, numPoints);
            }

            normalized = points.map(([x, y]) => [(x - 50) / 500, (400 - y - 50) / 300]);
            satisfiesRule = this.currentRound.check(normalized);
            attempt++;

        } while (satisfiesRule !== shouldSatisfy && attempt < maxAttempts);

        // Draw points (NO AXES)
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 600, 400);

        // Draw points only
        points.forEach(([x, y]) => {
            ctx.fillStyle = '#2196F3';
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, 2 * Math.PI);
            ctx.fill();
        });

        this.exampleDisplay.innerHTML = '';
        this.exampleDisplay.appendChild(canvas);

        // Controls
        this.controlsDiv.innerHTML = `
            <div class="button-group">
                <button class="btn btn-yes" id="btn-yes">Kyllä</button>
                <button class="btn btn-no" id="btn-no">Ei</button>
            </div>
        `;

        document.getElementById('btn-yes').addEventListener('click', () => this.handleBinaryAnswer(true, points));
        document.getElementById('btn-no').addEventListener('click', () => this.handleBinaryAnswer(false, points));

        // Store both for history
        this.currentExample = normalized;
        this.currentExampleRaw = points;
    }

    // ========================================================================
    // FUNCTIONS GAME
    // ========================================================================

    generateFunctionsUI() {
        this.functionTests = [];
        this.functionContainer = document.createElement('div');
        this.functionContainer.className = 'function-machine-container';

        this.exampleDisplay.innerHTML = '';
        this.exampleDisplay.appendChild(this.functionContainer);

        this.controlsDiv.innerHTML = `
            <div class="button-group">
                <button class="btn btn-secondary" id="btn-know-rule">Tiedän säännön</button>
            </div>
        `;

        document.getElementById('btn-know-rule').addEventListener('click', () => this.declareKnownRule());

        // Add first input row
        this.addFunctionInputRow();
    }

    addFunctionInputRow() {
        const row = document.createElement('div');
        row.className = 'function-test-row';

        const inputBox = document.createElement('div');
        inputBox.className = 'function-input-box';
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'function-input';
        inputBox.appendChild(input);

        const arrow1 = document.createElement('div');
        arrow1.className = 'function-arrow';
        arrow1.textContent = '→';

        const fBox = document.createElement('div');
        fBox.className = 'function-f-box';
        fBox.textContent = 'f';

        const arrow2 = document.createElement('div');
        arrow2.className = 'function-arrow';
        arrow2.textContent = '→';

        const outputBox = document.createElement('div');
        outputBox.className = 'function-output-box';
        outputBox.textContent = '?';
        outputBox.style.color = '#999';

        row.appendChild(inputBox);
        row.appendChild(arrow1);
        row.appendChild(fBox);
        row.appendChild(arrow2);
        row.appendChild(outputBox);

        this.functionContainer.appendChild(row);

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitFunctionInput(input, outputBox, row);
            }
        });

        input.focus();
    }

    submitFunctionInput(input, outputBox, row) {
        const value = parseInt(input.value, 10);

        if (isNaN(value)) {
            return;
        }

        const result = this.currentRound.check(value);

        // Show output
        outputBox.textContent = result;
        outputBox.style.color = '#333';

        // Disable input
        input.disabled = true;
        input.style.backgroundColor = '#f5f5f5';

        this.functionTests.push({ input: value, output: result });

        this.clearFeedback();

        // After 3 tests, start showing prediction rows
        if (this.functionTests.length >= 3) {
            this.addFunctionPredictionRow();
        } else {
            this.addFunctionInputRow();
        }
    }

    addFunctionPredictionRow() {
        const row = document.createElement('div');
        row.className = 'function-prediction-row';

        // Generate random input
        const randomInput = Math.floor(Math.random() * 20) - 10;

        const inputBox = document.createElement('div');
        inputBox.className = 'function-input-box';
        inputBox.textContent = randomInput;
        inputBox.style.fontSize = '24px';

        const arrow1 = document.createElement('div');
        arrow1.className = 'function-arrow';
        arrow1.textContent = '→';

        const fBox = document.createElement('div');
        fBox.className = 'function-f-box';
        fBox.textContent = 'f';
        fBox.style.borderColor = '#ffd700';
        fBox.style.color = '#ff8800';

        const arrow2 = document.createElement('div');
        arrow2.className = 'function-arrow';
        arrow2.textContent = '→';

        const predictionInput = document.createElement('input');
        predictionInput.type = 'number';
        predictionInput.className = 'function-prediction-input';

        row.appendChild(inputBox);
        row.appendChild(arrow1);
        row.appendChild(fBox);
        row.appendChild(arrow2);
        row.appendChild(predictionInput);

        this.functionContainer.appendChild(row);

        predictionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.checkFunctionPrediction(randomInput, predictionInput, row);
            }
        });

        predictionInput.focus();
    }

    checkFunctionPrediction(input, predictionInput, row) {
        const userPrediction = parseInt(predictionInput.value, 10);

        if (isNaN(userPrediction)) {
            return;
        }

        const correctOutput = this.currentRound.check(input);

        if (userPrediction === correctOutput) {
            // Correct!
            row.style.backgroundColor = '#e8f5e9';
            predictionInput.disabled = true;
            predictionInput.style.borderColor = '#4caf50';

            this.functionTests.push({ input, output: correctOutput, predicted: true, correct: true });

            // Convert to normal row
            setTimeout(() => {
                row.className = 'function-test-row';
                row.style.backgroundColor = 'transparent';

                // Add another prediction row or allow completion
                if (this.functionTests.filter(t => t.predicted && t.correct).length >= 5) {
                    // Enough correct predictions, complete round
                    setTimeout(() => this.completeRound(), 1000);
                } else {
                    this.addFunctionPredictionRow();
                }
            }, 800);

        } else {
            // Incorrect
            row.style.backgroundColor = '#ffebee';
            this.showFeedback(`✗ (oli ${correctOutput})`, 'incorrect');

            setTimeout(() => {
                row.style.backgroundColor = '#fffacd';
                this.clearFeedback();

                // Show correct answer and add new prediction row
                predictionInput.value = correctOutput;
                predictionInput.disabled = true;
                predictionInput.style.borderColor = '#f44336';

                setTimeout(() => {
                    row.className = 'function-test-row';
                    row.style.backgroundColor = 'transparent';
                    this.addFunctionPredictionRow();
                }, 1000);
            }, 1500);
        }
    }

    declareKnownRule() {
        if (this.functionTests.length < 3) {
            return;
        }

        // Complete immediately
        this.completeRound();
    }

    // ========================================================================
    // SEQUENCES GAME
    // ========================================================================

    generateSequencesUI() {
        const sequence = this.currentRound.generate();
        const numShow = 3; // Show first 3 numbers
        const numRequired = this.currentRound.required || 4;

        this.sequenceValues = sequence;
        this.sequenceStreak = 0;
        this.currentSequenceIndex = numShow;

        // Display sequence with input boxes
        const sequenceRow = document.createElement('div');
        sequenceRow.className = 'sequence-input-row';

        // Show initial numbers
        for (let i = 0; i < numShow; i++) {
            const numSpan = document.createElement('div');
            numSpan.className = 'sequence-number';
            numSpan.textContent = sequence[i];
            sequenceRow.appendChild(numSpan);

            if (i < numShow - 1) {
                const comma = document.createElement('div');
                comma.className = 'sequence-comma';
                comma.textContent = ',';
                sequenceRow.appendChild(comma);
            }
        }

        // Add comma before input
        const comma = document.createElement('div');
        comma.className = 'sequence-comma';
        comma.textContent = ',';
        sequenceRow.appendChild(comma);

        // Add input box
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'sequence-input';
        input.id = 'sequence-input';
        sequenceRow.appendChild(input);

        // Add comma after
        const comma2 = document.createElement('div');
        comma2.className = 'sequence-comma';
        comma2.textContent = ', ...';
        sequenceRow.appendChild(comma2);

        this.exampleDisplay.innerHTML = '';
        this.exampleDisplay.appendChild(sequenceRow);

        this.controlsDiv.innerHTML = `
            <div class="button-group" id="reveal-button-container" style="display: none;">
                <button class="btn btn-secondary" id="btn-reveal">Paljasta seuraava</button>
            </div>
            <div style="margin-top: 10px; color: #666; text-align: center;">
                Sarja: ${numRequired} oikein peräkkäin
            </div>
        `;

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.checkSequenceNumber();
        });

        input.focus();

        // Start reveal button timer (10 seconds)
        this.revealButtonTimer = setTimeout(() => {
            document.getElementById('reveal-button-container').style.display = 'flex';
            document.getElementById('btn-reveal').addEventListener('click', () => this.revealNextNumber());
        }, 10000);
    }

    checkSequenceNumber() {
        if (this.inputBlocked) return;

        const input = document.getElementById('sequence-input');
        const userValue = parseInt(input.value, 10);

        if (isNaN(userValue)) {
            return;
        }

        const correctValue = this.sequenceValues[this.currentSequenceIndex];
        const isCorrect = userValue === correctValue;

        if (isCorrect) {
            this.sequenceStreak++;
            input.classList.add('correct');
            input.disabled = true;

            const required = this.currentRound.required || 4;
            this.showFeedback(`✓ ${this.sequenceStreak}/${required}`, 'correct');

            if (this.sequenceStreak >= required) {
                setTimeout(() => this.completeRound(), 1000);
            } else {
                // Add next input box
                setTimeout(() => {
                    this.currentSequenceIndex++;
                    this.addNextSequenceInput();
                }, 800);
            }
        } else {
            this.sequenceStreak = 0;
            input.classList.add('incorrect');
            this.showFeedback(`✗ (oli ${correctValue})`, 'incorrect');

            // Block input briefly
            this.inputBlocked = true;
            setTimeout(() => {
                this.inputBlocked = false;
                this.generateSequencesUI();
            }, 2000);
        }
    }

    addNextSequenceInput() {
        const sequenceRow = this.exampleDisplay.querySelector('.sequence-input-row');

        // Remove the last comma and input
        const lastComma = sequenceRow.querySelector('.sequence-comma:last-child');
        if (lastComma) lastComma.remove();

        // Add comma
        const comma = document.createElement('div');
        comma.className = 'sequence-comma';
        comma.textContent = ',';
        sequenceRow.appendChild(comma);

        // Add new input
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'sequence-input';
        input.id = 'sequence-input';
        sequenceRow.appendChild(input);

        // Add ellipsis
        const comma2 = document.createElement('div');
        comma2.className = 'sequence-comma';
        comma2.textContent = ', ...';
        sequenceRow.appendChild(comma2);

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.checkSequenceNumber();
        });

        input.focus();
    }

    revealNextNumber() {
        const input = document.getElementById('sequence-input');
        const correctValue = this.sequenceValues[this.currentSequenceIndex];

        input.value = correctValue;
        input.classList.add('correct');
        input.disabled = true;

        this.currentSequenceIndex++;
        this.sequenceStreak++;

        const required = this.currentRound.required || 4;

        if (this.sequenceStreak >= required) {
            setTimeout(() => this.completeRound(), 1000);
        } else {
            setTimeout(() => this.addNextSequenceInput(), 500);
        }

        // Hide reveal button after use
        document.getElementById('reveal-button-container').style.display = 'none';
    }

    // ========================================================================
    // THREE NUMBERS GAME
    // ========================================================================

    generateThreeNumbersUI() {
        this.threeNumbersTests = [];

        // Create main layout container
        const mainLayout = document.createElement('div');
        mainLayout.style.display = 'flex';
        mainLayout.style.gap = '40px';
        mainLayout.style.alignItems = 'flex-start';
        mainLayout.style.justifyContent = 'flex-start';
        mainLayout.style.maxWidth = '1000px';
        mainLayout.style.marginBottom = '20px';
        mainLayout.style.marginLeft = 'auto';
        mainLayout.style.marginRight = 'auto';
        mainLayout.style.paddingLeft = '40px';

        // Left side: inputs and history
        const leftSide = document.createElement('div');
        leftSide.style.display = 'flex';
        leftSide.style.flexDirection = 'column';
        leftSide.style.alignItems = 'flex-start';
        leftSide.style.flex = '0 0 auto';
        leftSide.style.minWidth = '320px';

        // Create wrapper with relative positioning
        const inputWrapper = document.createElement('div');
        inputWrapper.style.position = 'relative';
        inputWrapper.style.marginBottom = '20px';

        // Create input row container (just the three number inputs)
        const inputRow = document.createElement('div');
        inputRow.style.display = 'flex';
        inputRow.style.gap = '20px';
        inputRow.style.alignItems = 'center';

        const input1 = document.createElement('input');
        input1.type = 'number';
        input1.id = 'num1';
        input1.className = 'number-input';
        input1.min = '0';
        input1.max = '999';
        input1.step = '1';

        const input2 = document.createElement('input');
        input2.type = 'number';
        input2.id = 'num2';
        input2.className = 'number-input';
        input2.min = '0';
        input2.max = '999';
        input2.step = '1';

        const input3 = document.createElement('input');
        input3.type = 'number';
        input3.id = 'num3';
        input3.className = 'number-input';
        input3.min = '0';
        input3.max = '999';
        input3.step = '1';

        inputRow.appendChild(input1);
        inputRow.appendChild(input2);
        inputRow.appendChild(input3);

        // Create button with absolute positioning
        const testBtn = document.createElement('button');
        testBtn.className = 'btn btn-primary';
        testBtn.id = 'btn-test-triple';
        testBtn.textContent = 'Testaa';
        testBtn.style.position = 'absolute';
        testBtn.style.left = '100%';
        testBtn.style.marginLeft = '20px';
        testBtn.style.top = '50%';
        testBtn.style.transform = 'translateY(-50%)';

        inputWrapper.appendChild(inputRow);
        inputWrapper.appendChild(testBtn);

        // Create history container
        const historyDiv = document.createElement('div');
        historyDiv.id = 'triple-history';
        historyDiv.style.display = 'flex';
        historyDiv.style.flexDirection = 'column';
        historyDiv.style.alignItems = 'flex-start';

        leftSide.appendChild(inputWrapper);
        leftSide.appendChild(historyDiv);

        // Right side: rule input and button
        const rightSide = document.createElement('div');
        rightSide.style.display = 'flex';
        rightSide.style.flexDirection = 'column';
        rightSide.style.gap = '10px';
        rightSide.style.flex = '0 0 auto';
        rightSide.style.width = '500px';
        rightSide.style.position = 'relative';
        rightSide.style.marginLeft = '100px';

        const ruleInput = document.createElement('textarea');
        ruleInput.id = 'rule-answer-input';
        ruleInput.placeholder = 'Sääntö on...';
        ruleInput.style.width = '100%';
        ruleInput.style.height = '100px';
        ruleInput.style.padding = '12px';
        ruleInput.style.fontSize = '16px';
        ruleInput.style.border = '2px solid #ddd';
        ruleInput.style.borderRadius = '6px';
        ruleInput.style.resize = 'vertical';
        ruleInput.style.fontFamily = 'Arial, sans-serif';

        const submitBtn = document.createElement('button');
        submitBtn.className = 'btn btn-secondary';
        submitBtn.id = 'btn-know-triple-rule';
        submitBtn.textContent = 'Tiedän säännön';
        submitBtn.style.alignSelf = 'flex-end';

        rightSide.appendChild(ruleInput);
        rightSide.appendChild(submitBtn);

        mainLayout.appendChild(leftSide);
        mainLayout.appendChild(rightSide);

        this.exampleDisplay.innerHTML = '';
        this.exampleDisplay.appendChild(mainLayout);
        this.controlsDiv.innerHTML = '';

        document.getElementById('btn-test-triple').addEventListener('click', () => this.testTriple());
        document.getElementById('btn-know-triple-rule').addEventListener('click', () => this.declareKnownTripleRule());

        // Enter key on any input
        ['num1', 'num2', 'num3'].forEach(id => {
            document.getElementById(id).addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.testTriple();
            });
        });

        document.getElementById('num1').focus();
    }

    testTriple() {
        const a = parseInt(document.getElementById('num1').value, 10);
        const b = parseInt(document.getElementById('num2').value, 10);
        const c = parseInt(document.getElementById('num3').value, 10);

        if (isNaN(a) || isNaN(b) || isNaN(c)) {
            return;
        }

        const result = this.currentRound.check(a, b, c);

        // Add visual history row
        const historyDiv = document.getElementById('triple-history');
        const historyRow = document.createElement('div');
        historyRow.style.display = 'flex';
        historyRow.style.gap = '20px';
        historyRow.style.alignItems = 'center';
        historyRow.style.justifyContent = 'center';
        historyRow.style.marginBottom = '8px';

        // Create three number boxes with same styling as inputs
        [a, b, c].forEach(num => {
            const numBox = document.createElement('div');
            numBox.style.width = '150px';
            numBox.style.height = '60px';
            numBox.style.fontSize = '32px';
            numBox.style.textAlign = 'center';
            numBox.style.display = 'flex';
            numBox.style.alignItems = 'center';
            numBox.style.justifyContent = 'center';
            numBox.style.border = '2px solid #ddd';
            numBox.style.borderRadius = '6px';
            numBox.style.fontWeight = 'bold';

            // Color based on result
            if (result) {
                numBox.style.backgroundColor = '#c8e6c9';
                numBox.style.borderColor = '#c8e6c9';
                numBox.style.color = '#2e7d32';
            } else {
                numBox.style.backgroundColor = '#ffcdd2';
                numBox.style.borderColor = '#ffcdd2';
                numBox.style.color = '#c62828';
            }

            numBox.textContent = num;
            historyRow.appendChild(numBox);
        });

        // Insert at top of history
        historyDiv.insertBefore(historyRow, historyDiv.firstChild);

        this.threeNumbersTests.push({ a, b, c, result });

        // Clear inputs
        document.getElementById('num1').value = '';
        document.getElementById('num2').value = '';
        document.getElementById('num3').value = '';
        document.getElementById('num1').focus();

        this.clearFeedback();
    }

    declareKnownTripleRule() {
        // Start unit tests
        this.startUnitTests();
    }

    generateUnitTests() {
        const tests = [];
        const rule = this.currentRound;

        // Get rule ID to determine test strategy
        const ruleId = rule.id;

        // Generate 5 positive and 5 negative examples
        const positiveTests = [];
        const negativeTests = [];

        // Try to generate tests intelligently based on rule type
        let attempts = 0;
        const maxAttempts = 1000;

        while ((positiveTests.length < 5 || negativeTests.length < 5) && attempts < maxAttempts) {
            attempts++;

            // Generate random triple with reasonable constraints
            const a = Math.floor(Math.random() * 15); // 0-14
            const b = Math.floor(Math.random() * 15);
            const c = Math.floor(Math.random() * 15);

            const satisfies = rule.check(a, b, c);

            // Check if we already have this triple
            const existsInPositive = positiveTests.some(t => t.a === a && t.b === b && t.c === c);
            const existsInNegative = negativeTests.some(t => t.a === a && t.b === b && t.c === c);

            if (existsInPositive || existsInNegative) continue;

            if (satisfies && positiveTests.length < 5) {
                positiveTests.push({ a, b, c, expected: true });
            } else if (!satisfies && negativeTests.length < 5) {
                negativeTests.push({ a, b, c, expected: false });
            }
        }

        // Shuffle and interleave
        const shuffled = [...positiveTests, ...negativeTests].sort(() => Math.random() - 0.5);

        return shuffled;
    }

    startUnitTests() {
        this.unitTests = this.generateUnitTests();
        this.unitTestIndex = 0;
        this.unitTestResults = [];

        this.showNextUnitTest();
    }

    showNextUnitTest() {
        if (this.unitTestIndex >= this.unitTests.length) {
            // All tests done, check results
            this.finishUnitTests();
            return;
        }

        const test = this.unitTests[this.unitTestIndex];

        // Update UI to show the test triple
        document.getElementById('num1').value = test.a;
        document.getElementById('num2').value = test.b;
        document.getElementById('num3').value = test.c;
        document.getElementById('num1').disabled = true;
        document.getElementById('num2').disabled = true;
        document.getElementById('num3').disabled = true;

        // Hide Testaa button and rule input area
        document.getElementById('btn-test-triple').style.display = 'none';
        document.getElementById('rule-answer-input').disabled = true;
        document.getElementById('btn-know-triple-rule').disabled = true;

        // Show unit test controls - clean and simple
        const controlsContainer = document.createElement('div');
        controlsContainer.id = 'unit-test-controls';
        controlsContainer.style.display = 'flex';
        controlsContainer.style.flexDirection = 'column';
        controlsContainer.style.alignItems = 'center';
        controlsContainer.style.gap = '15px';
        controlsContainer.style.marginBottom = '30px';

        const progressText = document.createElement('div');
        progressText.style.fontSize = '20px';
        progressText.style.fontWeight = '500';
        progressText.style.color = '#333';
        progressText.textContent = `Testi ${this.unitTestIndex + 1}/10`;

        const buttonRow = document.createElement('div');
        buttonRow.style.display = 'flex';
        buttonRow.style.gap = '20px';

        const yesBtn = document.createElement('button');
        yesBtn.className = 'btn btn-yes';
        yesBtn.textContent = 'Kyllä';
        yesBtn.style.width = '150px';
        yesBtn.style.height = '60px';
        yesBtn.style.fontSize = '20px';
        yesBtn.addEventListener('click', () => this.answerUnitTest(true));

        const noBtn = document.createElement('button');
        noBtn.className = 'btn btn-no';
        noBtn.textContent = 'Ei';
        noBtn.style.width = '150px';
        noBtn.style.height = '60px';
        noBtn.style.fontSize = '20px';
        noBtn.addEventListener('click', () => this.answerUnitTest(false));

        buttonRow.appendChild(yesBtn);
        buttonRow.appendChild(noBtn);

        controlsContainer.appendChild(progressText);
        controlsContainer.appendChild(buttonRow);

        // Add controls truly above everything without breaking layout
        const existing = document.getElementById('unit-test-controls');
        if (existing) {
            existing.replaceWith(controlsContainer);
        } else {
            // Insert at the very beginning of exampleDisplay, before mainLayout
            const mainLayout = this.exampleDisplay.firstChild;
            if (mainLayout) {
                this.exampleDisplay.insertBefore(controlsContainer, mainLayout);
            } else {
                this.exampleDisplay.appendChild(controlsContainer);
            }
        }

        // Clear feedback
        this.clearFeedback();
    }

    answerUnitTest(userAnswer) {
        const test = this.unitTests[this.unitTestIndex];
        const correct = userAnswer === test.expected;

        this.unitTestResults.push({
            test: test,
            userAnswer: userAnswer,
            correct: correct
        });

        // Add to history
        const result = test.expected;
        const historyDiv = document.getElementById('triple-history');
        const historyRow = document.createElement('div');
        historyRow.style.display = 'flex';
        historyRow.style.gap = '20px';
        historyRow.style.alignItems = 'center';
        historyRow.style.justifyContent = 'center';
        historyRow.style.marginBottom = '8px';

        [test.a, test.b, test.c].forEach(num => {
            const numBox = document.createElement('div');
            numBox.style.width = '150px';
            numBox.style.height = '60px';
            numBox.style.fontSize = '32px';
            numBox.style.textAlign = 'center';
            numBox.style.display = 'flex';
            numBox.style.alignItems = 'center';
            numBox.style.justifyContent = 'center';
            numBox.style.border = '2px solid #ddd';
            numBox.style.borderRadius = '6px';
            numBox.style.fontWeight = 'bold';

            // Color based on result
            if (result) {
                numBox.style.backgroundColor = '#c8e6c9';
                numBox.style.borderColor = '#c8e6c9';
                numBox.style.color = '#2e7d32';
            } else {
                numBox.style.backgroundColor = '#ffcdd2';
                numBox.style.borderColor = '#ffcdd2';
                numBox.style.color = '#c62828';
            }

            numBox.textContent = num;
            historyRow.appendChild(numBox);
        });

        historyDiv.insertBefore(historyRow, historyDiv.firstChild);

        // If incorrect, terminate immediately
        if (!correct) {
            this.finishUnitTests();
            return;
        }

        // Move to next test
        this.unitTestIndex++;
        this.showNextUnitTest();
    }

    finishUnitTests() {
        // Check if all correct
        const allCorrect = this.unitTestResults.every(r => r.correct);
        const numCorrect = this.unitTestResults.filter(r => r.correct).length;

        // Clean up UI
        const controls = document.getElementById('unit-test-controls');
        if (controls) controls.remove();

        // Re-enable inputs
        document.getElementById('num1').disabled = false;
        document.getElementById('num2').disabled = false;
        document.getElementById('num3').disabled = false;
        document.getElementById('num1').value = '';
        document.getElementById('num2').value = '';
        document.getElementById('num3').value = '';

        document.getElementById('btn-test-triple').style.display = 'block';
        document.getElementById('rule-answer-input').disabled = false;
        document.getElementById('btn-know-triple-rule').disabled = false;

        if (allCorrect) {
            this.showFeedback('✓ 10/10', 'correct');
            setTimeout(() => this.completeRound(), 1500);
        } else {
            this.showFeedback(`✗ ${numCorrect}/10`, 'incorrect');
            document.getElementById('rule-answer-input').value = '';
            document.getElementById('num1').focus();
        }
    }

    // ========================================================================
    // ROUND COMPLETION
    // ========================================================================

    completeRound() {
        this.markRoundComplete(this.currentGame, this.currentRound.id);

        const rules = GAME_RULES[this.currentGame];
        const currentIndex = rules.findIndex(r => r.id === this.currentRound.id);

        // Show success message
        this.showFeedback(`✓ "${this.currentRound.name}"`, 'correct');

        setTimeout(() => {
            // Check for next round
            const nextIncomplete = this.progress[this.currentGame].findIndex(p => !p.completed);

            if (nextIncomplete !== -1) {
                // Start next round
                this.currentRound = rules[nextIncomplete];
                this.roundHistory = [];
                this.correctStreak = 0;
                this.sequenceStreak = 0;

                document.getElementById('round-info').textContent = `Kierros ${nextIncomplete + 1} / ${rules.length}`;

                this.generateExample();
            } else {
                // All completed
                this.exampleDisplay.innerHTML = '<div class="success-message">Kaikki kierrokset suoritettu!</div>';
                this.controlsDiv.innerHTML = '';
            }
        }, 2500);
    }

    // ========================================================================
    // UI HELPERS
    // ========================================================================

    showFeedback(message, type) {
        this.feedback.textContent = message;
        this.feedback.className = `feedback ${type}`;
    }

    clearFeedback() {
        this.feedback.className = 'feedback';
        this.feedback.textContent = '';
    }
}

// ============================================================================
// INITIALIZE APP
// ============================================================================

function initializeRuleDiscoveryApp() {
    console.log('Initializing Rule Discovery App v2...');
    try {
        const app = new RuleDiscoveryApp();
        window.ruleDiscoveryApp = app;
        console.log('Rule Discovery App initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeRuleDiscoveryApp);
} else {
    // DOM already loaded (script loaded dynamically after page load)
    initializeRuleDiscoveryApp();
}
