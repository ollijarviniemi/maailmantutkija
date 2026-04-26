/**
 * Game Controller
 *
 * Main controller that orchestrates levels, animations, and UI.
 */

class Game {
    constructor(containerElement) {
        this.container = containerElement;
        this.currentLevel = null;
        this.animation = null;
        this.state = 'idle'; // idle, running, waiting_answer, complete

        // UI components
        this.ui = {};

        // Initialize registry
        LevelRegistry.init();
    }

    /**
     * Load and start a level
     */
    loadLevel(levelId) {
        const level = LevelRegistry.get(levelId);
        if (!level) {
            throw new Error(`Unknown level: ${levelId}`);
        }

        this.currentLevel = level;
        this.state = 'idle';

        // Build UI for this level
        this.buildUI(level);
    }

    /**
     * Build the UI for a level
     */
    buildUI(level) {
        this.container.innerHTML = '';
        this.container.className = 'game-container';

        // Header
        const header = document.createElement('div');
        header.className = 'game-header';
        header.innerHTML = `
            <h1 class="game-title">${level.name}</h1>
            <span class="level-badge">Taso ${LevelRegistry.getIndex(level.id) + 1}</span>
        `;
        this.container.appendChild(header);

        // Story (if present) - PREFERENCE: Keep compact
        if (level.story) {
            const storyBox = document.createElement('div');
            storyBox.className = 'question-box';
            storyBox.textContent = level.story;
            this.container.appendChild(storyBox);
        }

        // Main content area
        const main = document.createElement('div');
        main.className = 'game-main';
        this.container.appendChild(main);

        // Left panel: Animation
        const leftPanel = document.createElement('div');
        leftPanel.className = 'panel';
        main.appendChild(leftPanel);

        // PREFERENCE: No "Simulaatio" header - removed per user request

        // Animation canvas
        // PREFERENCE: Animation should fill available space, not use fixed aspect ratio
        const animContainer = document.createElement('div');
        animContainer.className = 'animation-container';
        const canvas = document.createElement('canvas');
        canvas.className = 'animation-canvas';
        animContainer.appendChild(canvas);
        leftPanel.appendChild(animContainer);

        // Controls
        this.ui.controls = UI.createControls(leftPanel);
        this.setupControlHandlers();

        // Create animation
        this.createAnimation(canvas, level);

        // Right panel: Question & Answer
        const rightPanel = document.createElement('div');
        rightPanel.className = 'panel';
        main.appendChild(rightPanel);

        // PREFERENCE: No "Tehtävä" header - removed per user request

        const qBody = document.createElement('div');
        qBody.className = 'panel-body';
        rightPanel.appendChild(qBody);

        // Check if this is a DSL-type question
        if (level.question.type === 'dsl') {
            this.buildDSLUI(qBody, level);
        } else {
            // Original UI for non-DSL questions
            // Question
            this.ui.question = UI.createQuestionBox(qBody, level.question.prompt);

            // Stats panel - use registry
            this.ui.stats = UI.createStatsPanel(
                qBody,
                AnimationRegistry.getStatsConfig(level.animation.type)
            );

            // Answer input - use question handler registry
            const questionType = level.question.type || 'estimate';
            this.questionHandler = QuestionHandlers.get(questionType);
            this.ui.answer = this.questionHandler.createInput(qBody, level);

            // Submit button
            this.ui.submit = UI.createSubmitButton(qBody, { text: 'Lähetä vastaus' });
            this.ui.submit.onClick(() => this.submitAnswer());
        }

        // For code questions with static info, enable submit immediately
        // For animated levels, wait until animation finishes
        const isStaticLevel = level.animation.type === 'static-info';
        this.ui.submit.setDisabled(!isStaticLevel);

        // Results panel (hidden initially)
        this.ui.results = UI.createResultsPanel(qBody);

        // Initial draw
        if (this.animation) {
            this.animation.draw();
        }
    }

    /**
     * Create the appropriate animation for the level
     * Uses AnimationRegistry instead of switch statement
     */
    createAnimation(canvas, level) {
        const { animation } = level;
        const config = animation.config || {};

        try {
            this.animation = AnimationRegistry.create(animation.type, canvas, config);
        } catch (e) {
            console.error(e.message);
            this.animation = null;
            return;
        }

        if (this.animation) {
            this.animation.onStatsUpdate = (stats) => this.updateStats(stats);
            this.animation.onDataUpdate = (data) => this.onDataUpdate(data);
            this.animation.onFinish = () => this.onAnimationFinish();
        }
    }

    /**
     * Setup control button handlers
     */
    setupControlHandlers() {
        this.ui.controls.onPlay((play) => {
            if (play) {
                this.startAnimation();
            } else {
                this.pauseAnimation();
            }
        });

        this.ui.controls.onReset(() => {
            this.resetLevel();
        });

        this.ui.controls.onSpeedChange((speed) => {
            if (this.animation) {
                this.animation.setSpeed(speed);
            }
        });
    }

    /**
     * Start the animation
     */
    startAnimation() {
        if (!this.animation) return;

        if (this.state === 'idle') {
            this.state = 'running';
        }

        this.animation.start();
        this.ui.controls.setPlaying(true);
    }

    /**
     * Pause the animation
     */
    pauseAnimation() {
        if (this.animation) {
            this.animation.pause();
        }
        this.ui.controls.setPlaying(false);
    }

    /**
     * Reset the level
     */
    resetLevel() {
        if (this.animation) {
            this.animation.reset();
        }

        this.state = 'idle';
        this.ui.controls.setPlaying(false);
        this.ui.submit.setDisabled(true);
        this.ui.results.hide();
    }

    /**
     * Update stats display using registry's statsMapper
     */
    updateStats(stats) {
        // DSL levels don't have stats panel
        if (!this.ui.stats) return;

        const animType = this.currentLevel.animation.type;
        const mapped = AnimationRegistry.mapStats(animType, stats);

        if (mapped) {
            this.ui.stats.updateAll(mapped);
        }
    }

    /**
     * Handle data updates from animation
     */
    onDataUpdate(data) {
        // Store collected data for answer calculation
        this.collectedData = data;

        // Update DSL editor data panel if present
        if (this.ui.dslEditor && data) {
            this.ui.dslEditor.updateData(this.buildDataVariables());
        }
    }

    /**
     * Build the DSL editor UI
     */
    buildDSLUI(container, level) {
        // Create DSL editor
        this.ui.dslEditor = DSLEditor.create(container, {
            dataVariables: {},  // Will be populated when animation runs
            starterCode: level.question.starterCode || '# Kirjoita koodisi tähän\n\nreturn Normal(0, 1)',
            prompt: level.question.prompt
        });

        // Submit button
        this.ui.submit = UI.createSubmitButton(container, { text: 'Arvioi jakaumani' });
        this.ui.submit.onClick(() => this.submitDSLAnswer());

        // Results panel (hidden initially)
        this.ui.dslResults = document.createElement('div');
        this.ui.dslResults.className = 'dsl-results';
        this.ui.dslResults.style.display = 'none';
        container.appendChild(this.ui.dslResults);
    }

    /**
     * Build data variables for DSL context
     * PREFERENCE: Provide flat numerical arrays for easy DSL calculations
     */
    buildDataVariables() {
        const data = this.collectedData || {};
        const level = this.currentLevel;
        const vars = {};

        // Store occupancy data - flat numerical arrays for DSL
        if (data.days) {
            vars.days = data.days;
            vars.numDays = data.numDays;
            vars.dayNames = data.dayNames;

            // PREFERENCE: Flat numerical arrays are most useful for DSL
            if (data.arrivalTimes) vars.arrivalTimes = data.arrivalTimes;
            if (data.arrivalHours) vars.arrivalHours = data.arrivalHours;
            if (data.stayDurations) vars.stayDurations = data.stayDurations;
            if (data.maxOccupancies) vars.maxOccupancies = data.maxOccupancies;

            // Also keep legacy format for compatibility
            vars.allArrivals = data.allArrivals;
            vars.allStayDurations = data.allStayDurations;
        }

        // Main data array
        if (data.samples) vars.data = data.samples;
        if (data.weights) vars.data = data.weights;
        if (data.lifetimes) vars.data = data.lifetimes;
        if (data.defects) vars.data = data.defects;
        if (data.arrivals) vars.arrivals = data.arrivals;
        if (data.serviceTimes) vars.serviceTimes = data.serviceTimes;
        if (data.dailySales) vars.dailySales = data.dailySales;
        if (data.prices) vars.prices = data.prices;
        if (data.wins) vars.wins = data.wins;
        if (data.scores) vars.scores = data.scores;
        if (data.carsPerMinute) vars.carsPerMinute = data.carsPerMinute;

        // Named variables
        if (data.eloA) vars.eloA = data.eloA;
        if (data.eloB) vars.eloB = data.eloB;
        if (data.pollResult) vars.pollResult = data.pollResult;
        if (data.sampleSize) vars.sampleSize = data.sampleSize;
        if (data.n) vars.n = data.n;
        if (data.currentDay) vars.currentDay = data.currentDay;
        if (data.inProgress) vars.inProgress = data.inProgress;

        // Computed stats
        if (vars.data && Array.isArray(vars.data) && vars.data.length > 0) {
            vars.n = vars.data.length;
        }

        return vars;
    }

    /**
     * Submit DSL answer
     */
    submitDSLAnswer() {
        const level = this.currentLevel;
        const code = this.ui.dslEditor.getCode();

        // Clear previous errors
        this.ui.dslEditor.clearError();

        // Build context with data variables
        const dataVars = this.buildDataVariables();

        // Evaluate the DSL code
        const result = DSLEvaluator.evaluate(code, {
            data: dataVars.data || [],
            variables: dataVars
        });

        if (!result.success) {
            this.ui.dslEditor.showError(result.error);
            return;
        }

        // Check scoring type to determine expected return type
        const scoringType = level.scoring.type;

        if (scoringType === 'probability-mc') {
            // Probability-based scoring (e.g., store occupancy)
            this.submitProbabilityDSLAnswer(result.result);
            return;
        }

        if (scoringType === 'probability-mc-multiday') {
            // Multiday probability scoring
            this.submitMultidayProbabilityDSLAnswer(result.result);
            return;
        }

        // Default: distribution-based scoring
        const playerDist = result.result;
        if (!playerDist || typeof playerDist !== 'object' || !playerDist.type) {
            this.ui.dslEditor.showError('Koodin pitää palauttaa jakauma (esim. Normal, Poisson, Beta)');
            return;
        }

        // Score against true DGP
        const trueDGP = level.trueDGP;
        if (!trueDGP) {
            this.ui.dslEditor.showError('Tason konfiguraatiosta puuttuu trueDGP');
            return;
        }

        const scoreResult = DistributionScorer.score(
            playerDist,
            trueDGP,
            'distribution',
            { thresholds: level.scoring.thresholds }
        );

        // Show results
        this.showDSLResults(playerDist, trueDGP, scoreResult);

        // Save progress
        LevelRegistry.completeLevel(
            level.id,
            scoreResult.stars,
            Math.max(0, 100 - scoreResult.score * 100)
        );

        this.state = 'complete';
        this.ui.submit.setDisabled(true);
        this.ui.dslEditor.disable();
    }

    /**
     * Submit probability-based DSL answer (single day)
     * Used for store occupancy levels
     */
    submitProbabilityDSLAnswer(playerProb) {
        const level = this.currentLevel;

        // Validate probability
        if (typeof playerProb !== 'number' || isNaN(playerProb)) {
            this.ui.dslEditor.showError('Koodin pitää palauttaa luku (todennäköisyys väliltä 0-1)');
            return;
        }

        if (playerProb < 0 || playerProb > 1) {
            this.ui.dslEditor.showError('Todennäköisyyden pitää olla välillä 0 ja 1');
            return;
        }

        // Show loading indicator
        UI.showToast('Lasketaan todellista todennäköisyyttä...', 'info');

        // Run Monte Carlo simulation (async to not block UI)
        setTimeout(() => {
            const trueDGP = level.trueDGP;
            const scoreResult = StoreOccupancyMC.scoreExceedanceProbability(
                playerProb,
                trueDGP,
                level.scoring
            );

            // Show results
            this.showProbabilityResults(playerProb, scoreResult);

            // Save progress
            LevelRegistry.completeLevel(
                level.id,
                scoreResult.stars,
                Math.round((1 - scoreResult.error) * 100)
            );

            this.state = 'complete';
            this.ui.submit.setDisabled(true);
            this.ui.dslEditor.disable();
        }, 50);
    }

    /**
     * Submit multiday probability DSL answer (7 days)
     */
    submitMultidayProbabilityDSLAnswer(playerProbs) {
        const level = this.currentLevel;

        // Validate array of 7 probabilities
        if (!Array.isArray(playerProbs) || playerProbs.length !== 7) {
            this.ui.dslEditor.showError('Koodin pitää palauttaa lista 7 todennäköisyydestä');
            return;
        }

        for (let i = 0; i < 7; i++) {
            const p = playerProbs[i];
            if (typeof p !== 'number' || isNaN(p) || p < 0 || p > 1) {
                this.ui.dslEditor.showError(`Todennäköisyys ${i + 1} ei ole validi (pitää olla 0-1)`);
                return;
            }
        }

        // Show loading indicator
        UI.showToast('Lasketaan todellisia todennäköisyyksiä (7 päivää)...', 'info');

        // Run Monte Carlo simulation
        setTimeout(() => {
            const trueDGP = level.trueDGP;
            const scoreResult = StoreOccupancyMC.scoreMultidayProbability(
                playerProbs,
                trueDGP,
                level.scoring
            );

            // Show results
            this.showMultidayProbabilityResults(playerProbs, scoreResult);

            // Save progress
            LevelRegistry.completeLevel(
                level.id,
                scoreResult.stars,
                Math.round((1 - scoreResult.avgError) * 100)
            );

            this.state = 'complete';
            this.ui.submit.setDisabled(true);
            this.ui.dslEditor.disable();
        }, 50);
    }

    /**
     * Show results for probability-based DSL answer
     */
    showProbabilityResults(playerProb, scoreResult) {
        const resultsDiv = this.ui.dslResults;
        resultsDiv.style.display = 'block';

        const stars = '★'.repeat(scoreResult.stars) + '☆'.repeat(3 - scoreResult.stars);
        const threshold = this.currentLevel.question.threshold;

        resultsDiv.innerHTML = `
            <div class="dsl-results-header">
                <span class="dsl-results-title">Tulokset</span>
                <span class="dsl-results-stars">${stars}</span>
            </div>
            <div class="dsl-results-comparison">
                <div class="dsl-result-item">
                    <div class="dsl-result-label">Sinun arvio</div>
                    <div class="dsl-result-value player">${(playerProb * 100).toFixed(1)}%</div>
                </div>
                <div class="dsl-result-item">
                    <div class="dsl-result-label">Todellinen (simuloitu)</div>
                    <div class="dsl-result-value true">${(scoreResult.trueProb * 100).toFixed(1)}%</div>
                </div>
                <div class="dsl-result-score">
                    <div class="score-label">P(max > ${threshold})</div>
                    <div class="score-value">Virhe: ${(scoreResult.error * 100).toFixed(1)} %-yks.</div>
                </div>
            </div>
        `;

        // Show insight modal after delay
        if (this.currentLevel.insight && scoreResult.stars >= 1) {
            setTimeout(() => {
                const modal = UI.createModal({ title: 'Oivallus' });
                modal.setContent(`<p style="line-height: 1.6">${this.currentLevel.insight}</p>`);
                modal.addButton('Selvä!', 'btn-primary', () => modal.hide());
                modal.show();
            }, 1500);
        }

        // Toast feedback
        if (scoreResult.stars === 3) {
            UI.showToast('Erinomainen arvio! ⭐⭐⭐', 'success');
        } else if (scoreResult.stars === 2) {
            UI.showToast('Hyvä arvio! ⭐⭐', 'success');
        } else if (scoreResult.stars === 1) {
            UI.showToast('Kohtalainen arvio ⭐', 'info');
        } else {
            UI.showToast('Kokeile tarkentaa malliasi!', 'warning');
        }
    }

    /**
     * Show results for multiday probability answer
     */
    showMultidayProbabilityResults(playerProbs, scoreResult) {
        const resultsDiv = this.ui.dslResults;
        resultsDiv.style.display = 'block';

        const stars = '★'.repeat(scoreResult.stars) + '☆'.repeat(3 - scoreResult.stars);
        const dayNames = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'];
        const threshold = this.currentLevel.question.threshold;

        let tableRows = '';
        for (let i = 0; i < 7; i++) {
            const playerP = (playerProbs[i] * 100).toFixed(0);
            const trueP = (scoreResult.trueProbs[i] * 100).toFixed(0);
            const err = (scoreResult.errors[i] * 100).toFixed(1);
            tableRows += `<tr><td>${dayNames[i]}</td><td>${playerP}%</td><td>${trueP}%</td><td>${err}</td></tr>`;
        }

        resultsDiv.innerHTML = `
            <div class="dsl-results-header">
                <span class="dsl-results-title">Tulokset (P(max > ${threshold}))</span>
                <span class="dsl-results-stars">${stars}</span>
            </div>
            <table class="dsl-results-table">
                <thead><tr><th>Päivä</th><th>Sinä</th><th>Tosi</th><th>Virhe</th></tr></thead>
                <tbody>${tableRows}</tbody>
            </table>
            <div class="dsl-result-score">
                <div class="score-value">Keskivirhe: ${(scoreResult.avgError * 100).toFixed(1)} %-yks.</div>
            </div>
        `;

        // Show insight modal after delay
        if (this.currentLevel.insight && scoreResult.stars >= 1) {
            setTimeout(() => {
                const modal = UI.createModal({ title: 'Oivallus' });
                modal.setContent(`<p style="line-height: 1.6">${this.currentLevel.insight}</p>`);
                modal.addButton('Selvä!', 'btn-primary', () => modal.hide());
                modal.show();
            }, 1500);
        }

        // Toast feedback
        if (scoreResult.stars === 3) {
            UI.showToast('Erinomainen viikkoennuste! ⭐⭐⭐', 'success');
        } else if (scoreResult.stars === 2) {
            UI.showToast('Hyvä viikkoennuste! ⭐⭐', 'success');
        } else if (scoreResult.stars === 1) {
            UI.showToast('Kohtalainen viikkoennuste ⭐', 'info');
        } else {
            UI.showToast('Tutki viikonpäivien eroja tarkemmin!', 'warning');
        }
    }

    /**
     * Show DSL scoring results
     */
    showDSLResults(playerDist, trueDGP, scoreResult) {
        const resultsDiv = this.ui.dslResults;
        resultsDiv.style.display = 'block';

        const formatDist = (d) => {
            if (d.type === 'normal') return `Normal(${d.mean?.toFixed(1)}, ${d.std?.toFixed(1)})`;
            if (d.type === 'exponential') return `Exponential(${d.mean?.toFixed(1)})`;
            if (d.type === 'poisson') return `Poisson(${d.lambda?.toFixed(1)})`;
            if (d.type === 'bernoulli') return `Bernoulli(${d.p?.toFixed(3)})`;
            if (d.type === 'beta') return `Beta(${d.alpha?.toFixed(1)}, ${d.beta?.toFixed(1)})`;
            if (d.type === 'lognormal') return `LogNormal(${d.mu?.toFixed(2)}, ${d.sigma?.toFixed(2)})`;
            if (d.type === 'uniform') return `Uniform(${d.min?.toFixed(1)}, ${d.max?.toFixed(1)})`;
            return `${d.type}(...)`;
        };

        const stars = '★'.repeat(scoreResult.stars) + '☆'.repeat(3 - scoreResult.stars);

        resultsDiv.innerHTML = `
            <div class="dsl-results-header">
                <span class="dsl-results-title">Tulokset</span>
                <span class="dsl-results-stars">${stars}</span>
            </div>
            <div class="dsl-results-comparison">
                <div class="dsl-result-item">
                    <div class="dsl-result-label">Sinun jakauma</div>
                    <div class="dsl-result-value player">${formatDist(playerDist)}</div>
                </div>
                <div class="dsl-result-item">
                    <div class="dsl-result-label">Todellinen DGP</div>
                    <div class="dsl-result-value true">${formatDist(trueDGP)}</div>
                </div>
                <div class="dsl-result-score">
                    <div class="score-label">CRPS (normalisoitu)</div>
                    <div class="score-value">${scoreResult.score.toFixed(3)}</div>
                    <div class="score-label">${scoreResult.details.interpretation}</div>
                </div>
            </div>
        `;

        // Show insight modal after delay
        if (this.currentLevel.insight && scoreResult.stars >= 1) {
            setTimeout(() => {
                const modal = UI.createModal({ title: 'Oivallus' });
                modal.setContent(`<p style="line-height: 1.6">${this.currentLevel.insight}</p>`);
                modal.addButton('Selvä!', 'btn-primary', () => modal.hide());
                modal.show();
            }, 1500);
        }

        // Toast feedback
        if (scoreResult.stars === 3) {
            UI.showToast('Erinomainen malli! ⭐⭐⭐', 'success');
        } else if (scoreResult.stars === 2) {
            UI.showToast('Hyvä malli! ⭐⭐', 'success');
        } else if (scoreResult.stars === 1) {
            UI.showToast('Kohtalainen malli ⭐', 'info');
        } else {
            UI.showToast('Kokeile säätää parametreja!', 'warning');
        }
    }

    /**
     * Called when animation finishes
     */
    onAnimationFinish() {
        this.state = 'waiting_answer';
        this.ui.controls.setPlaying(false);
        this.ui.submit.setDisabled(false);

        UI.showToast('Simulaatio valmis! Anna vastauksesi.', 'info');
    }

    /**
     * Get true answer using AnswerResolver
     */
    getTrueAnswer() {
        const level = this.currentLevel;
        const data = this.collectedData || {};

        // Support both new answer format and legacy answerFrom/trueAnswer
        const answerConfig = level.answer || level.answerFrom || level.trueAnswer;

        return AnswerResolver.resolve(answerConfig, data, level.context || {});
    }

    /**
     * Submit the player's answer
     * Uses QuestionHandlers for validation and Scoring registry for scoring
     */
    submitAnswer() {
        const level = this.currentLevel;
        const handler = this.questionHandler;

        // Get raw value from input
        const rawAnswer = handler.getValue(this.ui.answer);

        // Validate using handler
        const validation = handler.validate(rawAnswer);
        if (!validation.valid) {
            UI.showToast(validation.error, 'warning');
            return;
        }

        // For code questions, execute and validate result
        if (handler instanceof CodeHandler) {
            this.submitCodeAnswer();
            return;
        }

        const playerAnswer = rawAnswer;

        // Get true answer using resolver
        const trueAnswer = this.getTrueAnswer();

        // Score using registry
        const result = Scoring.score(
            level.scoring.type,
            playerAnswer,
            trueAnswer,
            level.scoring.thresholds
        );

        // Save progress
        const completionResult = LevelRegistry.completeLevel(
            this.currentLevel.id,
            result.stars,
            Math.max(0, 100 - result.error)
        );

        // Show results
        this.showResults(result, completionResult, trueAnswer);

        this.state = 'complete';
        this.ui.submit.setDisabled(true);
    }

    /**
     * Submit a code-type answer
     * Uses CodeHandler for execution and validation
     */
    submitCodeAnswer() {
        const level = this.currentLevel;
        const handler = this.questionHandler;
        const code = handler.getValue(this.ui.answer);

        // Clear previous errors
        this.ui.answer.clearError();

        // Execute using CodeHandler
        const execResult = handler.execute(code, level.context || {});
        if (!execResult.success) {
            this.ui.answer.showError(execResult.error);
            return;
        }

        // Validate result format
        const expectedFormat = level.question.expectedFormat || 'number';
        const formatValidation = handler.validateResult(execResult.result, expectedFormat);
        if (!formatValidation.valid) {
            this.ui.answer.showError(formatValidation.error);
            return;
        }

        // Route to appropriate scoring
        if (expectedFormat === 'distribution') {
            this.scoreDistributionAnswer(execResult.result);
        } else {
            this.scoreNumericCodeAnswer(execResult.result);
        }
    }

    /**
     * Score a distribution-type answer using Scoring registry
     */
    scoreDistributionAnswer(playerDist) {
        const level = this.currentLevel;

        // Get observed data from answerFrom field
        const answerField = level.answerFrom || level.answer?.field;
        const observedData = this.collectedData[answerField] || [];

        if (!Array.isArray(observedData) || observedData.length === 0) {
            UI.showToast('Ei havaintodataa vertailuun!', 'error');
            return;
        }

        // Score using registry (distribution-fit type)
        const result = Scoring.score(
            'distribution-fit',
            playerDist,
            null,  // No trueAnswer for distribution fit
            level.scoring.thresholds,
            { observedData }
        );

        // Save progress
        const completionResult = LevelRegistry.completeLevel(
            level.id,
            result.stars,
            Math.max(0, 100 - result.error * 100)
        );

        // Show results for distribution fitting
        this.showDistributionResults({
            stars: result.stars,
            ksStatistic: result.error,
            playerDist,
            observedData
        }, completionResult);

        this.state = 'complete';
        this.ui.submit.setDisabled(true);
    }

    /**
     * Score a numeric answer from code using Scoring registry
     */
    scoreNumericCodeAnswer(playerAnswer) {
        const level = this.currentLevel;

        // Get true answer using resolver
        const trueAnswer = this.getTrueAnswer();

        // Score using registry
        const result = Scoring.score(
            level.scoring.type,
            playerAnswer,
            trueAnswer,
            level.scoring.thresholds
        );

        // Save progress
        const completionResult = LevelRegistry.completeLevel(
            level.id,
            result.stars,
            Math.max(0, 100 - result.error * 100)
        );

        // Show results
        this.showCodeResults(result, completionResult, trueAnswer);

        this.state = 'complete';
        this.ui.submit.setDisabled(true);
    }

    /**
     * Show results for distribution fitting
     */
    showDistributionResults(result, completionResult) {
        const level = this.currentLevel;

        this.ui.results.show();

        const distStr = `${result.playerDist.type}(${result.playerDist.mean?.toFixed(1) || '?'}, ${result.playerDist.std?.toFixed(1) || '?'})`;

        this.ui.results.setValue(`KS = ${result.ksStatistic.toFixed(3)}`, 'Sovitus');
        this.ui.results.setStars(result.stars);

        this.ui.results.setComparison([
            ['Sinun jakauma', distStr],
            ['KS-statistiikka', result.ksStatistic.toFixed(3)],
            ['Havaintoja', result.observedData.length.toString()]
        ]);

        // Show feedback
        if (result.stars === 3) {
            UI.showToast('Erinomainen sovitus! ⭐⭐⭐', 'success');
        } else if (result.stars === 2) {
            UI.showToast('Hyvä sovitus! ⭐⭐', 'success');
        } else if (result.stars === 1) {
            UI.showToast('Kohtalainen sovitus ⭐', 'info');
        } else {
            UI.showToast('Kokeile säätää parametreja!', 'warning');
        }
    }

    /**
     * Show results for numeric code answer
     */
    showCodeResults(result, completionResult, trueAnswer) {
        this.ui.results.show();

        // Format based on whether it's a probability (0-1) or other number
        const isProb = trueAnswer > 0 && trueAnswer < 1;
        const formatValue = (v) => isProb ? (v * 100).toFixed(1) + '%' : v.toFixed(4);

        this.ui.results.setValue(formatValue(trueAnswer), 'Oikea vastaus');
        this.ui.results.setStars(result.stars);

        this.ui.results.setComparison([
            ['Sinun vastaus', formatValue(result.playerAnswer)],
            ['Oikea vastaus', formatValue(trueAnswer)],
            ['Ero', isProb ? (result.error * 100).toFixed(2) + ' %-yksikköä' : result.error.toFixed(4)]
        ]);

        // Show insight if available
        const level = this.currentLevel;
        if (level.insight && result.stars >= 1) {
            setTimeout(() => {
                const modal = UI.createModal({ title: 'Oivallus' });
                modal.setContent(`<p style="line-height: 1.6">${level.insight}</p>`);
                modal.addButton('Selvä!', 'btn-primary', () => modal.hide());
                modal.show();
            }, 1500);
        }

        // Star feedback
        if (result.stars === 3) {
            UI.showToast('Täydellistä! ⭐⭐⭐', 'success');
        } else if (result.stars === 2) {
            UI.showToast('Hyvä! ⭐⭐', 'success');
        } else if (result.stars === 1) {
            UI.showToast('Läpi! ⭐', 'info');
        } else {
            UI.showToast('Yritä uudelleen!', 'warning');
        }
    }

    /**
     * Show the results
     */
    showResults(result, completionResult, trueAnswer) {
        this.ui.results.show();

        const level = this.currentLevel;
        const isProbability = level.question.type === 'probability';
        const unit = level.question.unit || '';
        const suffix = isProbability ? '%' : (unit ? ` ${unit}` : '');

        // Format display
        const formatValue = (v) => {
            if (isProbability) return v.toFixed(0) + '%';
            if (Number.isInteger(v)) return v.toString() + (unit ? ` ${unit}` : '');
            return v.toFixed(1) + (unit ? ` ${unit}` : '');
        };

        this.ui.results.setValue(formatValue(trueAnswer), 'Oikea vastaus');
        this.ui.results.setStars(result.stars);

        this.ui.results.setComparison([
            ['Sinun vastaus', formatValue(result.playerAnswer)],
            ['Oikea vastaus', formatValue(trueAnswer)],
            ['Virhe', isProbability ? `${result.error.toFixed(1)} %-yksikköä` : result.error.toFixed(1) + (unit ? ` ${unit}` : '')]
        ]);

        // Show insight if level has one and player got at least 1 star
        if (level.insight && result.stars >= 1) {
            setTimeout(() => {
                const modal = UI.createModal({ title: 'Oivallus' });
                modal.setContent(`<p style="line-height: 1.6">${level.insight}</p>`);
                modal.addButton('Selvä!', 'btn-primary', () => modal.hide());
                modal.show();
            }, 1500);
        }

        // Star feedback
        if (result.stars === 3) {
            UI.showToast('Täydellistä! ⭐⭐⭐', 'success');
        } else if (result.stars === 2) {
            UI.showToast('Hyvä! ⭐⭐', 'success');
        } else if (result.stars === 1) {
            UI.showToast('Läpi! ⭐', 'info');
        } else {
            UI.showToast('Yritä uudelleen!', 'warning');
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.animation) {
            this.animation.destroy();
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Game;
}
