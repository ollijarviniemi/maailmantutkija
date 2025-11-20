/**
 * Client-side Shape Finder for Yellow Star Finder app
 * This extends the ClientShapeGenerator to support the specific functionality
 * needed for the "Find the Yellow Star" game
 */

class ClientShapeFinder extends ClientShapeGenerator {
    constructor(width = 800, height = 600, marginPercent = 0.2, shapeBias = 0.6, colorBias = 0.6) {
        super(width, height, marginPercent);

        this.shapeBias = shapeBias;
        this.colorBias = colorBias;

        // Extended color list for ShapeFinder (includes yellow)
        this.colors = ["red", "blue", "green", "purple", "black", "orange", "pink", "brown", "yellow"];

        // Color mapping to match Python exactly - especially yellow to golden
        this.colorMap = {
            'red': '#FF0000',
            'blue': '#0000FF',
            'green': '#008000',
            'purple': '#800080',
            'black': '#000000',
            'orange': '#FFA500',
            'pink': '#FFC0CB',
            'brown': '#A52A2A',
            'yellow': '#DAA520'  // Exact match to Python: goldenrod for better visibility
        };
    }

    /**
     * Generate image specifically for shape finder game
     * Exact replication of Python find_yellow_star.py logic
     */
    async generateShapeFinderImage(options = {}) {
        const {
            targetShape = "star",
            targetColor = "yellow",
            distribution = "uniform",
            numGaussians = 3,
            canvasWidth = this.width,
            canvasHeight = this.height,
            numShapes = 150,
            hasTarget = Math.random() < 0.67  // Allow override of target presence
        } = options;

        // Validate target shape and color
        if (!this.shapeTypes.includes(targetShape)) {
            throw new Error(`Target shape must be one of ${this.shapeTypes.join(', ')}`);
        }
        if (!this.colors.includes(targetColor) && !this.colorMap[targetColor]) {
            throw new Error(`Target color must be one of ${this.colors.join(', ')}`);
        }

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d');

        // White background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Set up domain
        const domain = [0, 1, 0, 1];

        // Generate PDF parameters if needed
        let pdfParams = null;
        if (distribution === "gaussian_mixture") {
            pdfParams = this.generateRandomGaussianMixtureParams(numGaussians, domain);
        }

        // Calculate m_target exactly like Python
        let mTarget;
        if (distribution === "uniform") {
            mTarget = numShapes * 0.6; // Exact from Python
        } else {
            mTarget = Math.pow(numShapes, 4/3) / 5;
        }

        mTarget = Math.max(1, Math.min(Math.floor(mTarget), 50000));

        // Generate points
        const points = await this.generatePointsFromPDF(
            numShapes,
            mTarget,
            distribution,
            domain,
            pdfParams
        );

        // Scale points with 3% border margin (exact from Python)
        const borderMarginX = canvasWidth * 0.03;
        const borderMarginY = canvasHeight * 0.03;

        const scaledPoints = points.map(point => [
            borderMarginX + point[0] * (canvasWidth - 2 * borderMarginX),
            borderMarginY + point[1] * (canvasHeight - 2 * borderMarginY)
        ]);

        // Calculate max radius
        const maxRadius = this.calculateMaxRadius(scaledPoints);

        // Use the hasTarget parameter if provided, otherwise use 2/3 chance like Python
        const includeTargetShape = hasTarget;

        // Choose random point for target shape if including it
        let targetShapeIndex = null;
        if (includeTargetShape) {
            targetShapeIndex = Math.floor(Math.random() * scaledPoints.length);
        }

        // Track target positions
        const targetPositions = [];

        // Draw shapes
        for (let i = 0; i < scaledPoints.length; i++) {
            const point = scaledPoints[i];

            if (i === targetShapeIndex) {
                // Draw target shape
                this.drawShape(ctx, targetShape, point, maxRadius, targetColor);
                targetPositions.push({
                    x: point[0],
                    y: point[1],
                    radius: maxRadius,
                    shape: targetShape,
                    color: targetColor
                });
            } else {
                // Choose shape and color with bias, avoiding exact target combination
                let shapeType, color;

                // Keep trying until we don't get the exact target combination
                while (true) {
                    // Decide shape with bias
                    if (Math.random() < this.shapeBias) {
                        shapeType = targetShape;
                    } else {
                        const otherShapes = this.shapeTypes.filter(s => s !== targetShape);
                        shapeType = otherShapes[Math.floor(Math.random() * otherShapes.length)];
                    }

                    // Decide color with bias
                    if (Math.random() < this.colorBias) {
                        color = targetColor;
                    } else {
                        const otherColors = this.colors.filter(c => c !== targetColor);
                        color = otherColors[Math.floor(Math.random() * otherColors.length)];
                    }

                    // If we get the target combination, try again
                    if (shapeType === targetShape && color === targetColor) {
                        continue;
                    }
                    break;
                }

                this.drawShape(ctx, shapeType, point, maxRadius, color);
            }
        }

        return {
            success: true,
            image: canvas.toDataURL(),
            hasTarget: includeTargetShape,
            targetShape: targetShape,
            targetColor: targetColor,
            distribution: distribution,
            starPositions: targetPositions, // Matches Flask API
            canvas: canvas
        };
    }

    /**
     * Create reference image for the UI (small yellow star)
     */
    createReferenceImage(canvasElement) {
        const ctx = canvasElement.getContext('2d');
        const width = canvasElement.width;
        const height = canvasElement.height;

        // White background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);

        // Draw yellow star in center
        const center = [width / 2, height / 2];
        const radius = Math.min(width, height) / 4;

        this.drawShape(ctx, 'star', center, radius, 'yellow');
    }
}

/**
 * Enhanced Yellow Star Finder App with client-side generation
 * This replaces the Flask backend calls with client-side generation
 */
class ClientYellowStarFinderApp {
    constructor() {
        this.currentShapeCount = 0;
        this.selectedTime = 1;
        this.hasTarget = false;
        this.userResponse = null;
        this.gameState = 'setup';

        this.currentRound = 0;
        this.timerInterval = null;
        this.currentCountdown = 0;

        // Data collection
        this.roundData = [];

        // Buffer system for pre-generation
        this.bufferedImage = null;
        this.isBuffering = false;
        this.currentImageData = null;

        // Variance reduction
        this.roundQueue = [];
        this.currentRoundIndex = 0;

        // Initialize the client-side generator
        this.shapeFinder = new ClientShapeFinder(800, 600, 0.2, 0.6, 0.6);

        this.initializeApp();
    }

    initializeApp() {
        // Get DOM elements
        this.canvas = document.getElementById('shape-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.referenceCanvas = document.getElementById('reference-image');
        this.referenceCtx = this.referenceCanvas.getContext('2d');
        this.loadingMessage = document.getElementById('loading-message');
        this.timerText = document.getElementById('timer-text');
        this.timerCountdown = document.getElementById('timer-countdown');
        this.roundCounter = document.getElementById('round-counter');
        this.roundNumberElement = document.getElementById('round-number');
        this.questionContainer = document.getElementById('question-container');
        this.questionText = document.getElementById('question-text');
        this.responseButtons = document.getElementById('response-buttons');
        this.resultsDisplay = document.getElementById('results-display');
        this.resultsText = document.getElementById('results-text');
        this.nextRoundBtn = document.getElementById('next-round-btn');
        this.showStatsBtn = document.getElementById('show-stats-btn');
        this.statisticsDisplay = document.getElementById('statistics-display');
        this.statisticsContent = document.getElementById('statistics-content');
        this.backToGameBtn = document.getElementById('back-to-game-btn');
        this.startRoundBtn = document.getElementById('start-round-btn');

        // Create reference image
        this.createReferenceImage();

        // Load saved data
        this.loadSavedData();

        // Set up event listeners
        this.startRoundBtn?.addEventListener('click', () => this.startNewRound());
        document.getElementById('yes-btn')?.addEventListener('click', () => this.handleResponse(true));
        document.getElementById('no-btn')?.addEventListener('click', () => this.handleResponse(false));
        this.nextRoundBtn?.addEventListener('click', () => this.startNewRound());
        this.showStatsBtn?.addEventListener('click', () => this.showStatistics());
        document.getElementById('inline-stats-btn')?.addEventListener('click', () => this.showStatistics());
        this.backToGameBtn?.addEventListener('click', () => this.backToGame());
        document.getElementById('reset-data-btn')?.addEventListener('click', () => this.resetAllData());

        // Help tooltip
        this.setupHelpTooltip();

        console.log('Client-side Yellow Star Finder initialized');
    }

    createReferenceImage() {
        if (this.referenceCanvas) {
            this.shapeFinder.createReferenceImage(this.referenceCanvas);
        }
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

    async startNewRound() {
        if (this.gameState === 'statistics') {
            this.backToGame();
            return;
        }

        this.currentRound++;
        this.updateRoundCounter();
        this.gameState = 'loading';
        this.showLoadingState();

        try {
            // Generate new image using client-side generator
            const result = await this.shapeFinder.generateShapeFinderImage({
                targetShape: 'star',
                targetColor: 'yellow',
                distribution: Math.random() < 0.5 ? 'uniform' : 'gaussian_mixture',
                numGaussians: Math.floor(Math.random() * 5) + 1
            });

            if (result.success) {
                this.hasTarget = result.hasTarget;
                this.currentImageData = result;

                // Display the generated image
                const img = new Image();
                img.onload = () => {
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
                    this.showImageForTiming();
                };
                img.src = result.image;

                // Start buffering next image in background
                this.bufferNextImage();

            } else {
                throw new Error(result.error || 'Generation failed');
            }

        } catch (error) {
            console.error('Client-side generation error:', error);
            this.showError(`Image generation failed: ${error.message}`);
        }
    }

    async bufferNextImage() {
        if (this.isBuffering) return;

        this.isBuffering = true;
        try {
            this.bufferedImage = await this.shapeFinder.generateShapeFinderImage({
                targetShape: 'star',
                targetColor: 'yellow',
                distribution: Math.random() < 0.5 ? 'uniform' : 'gaussian_mixture',
                numGaussians: Math.floor(Math.random() * 5) + 1
            });
        } catch (error) {
            console.warn('Background buffering failed:', error);
            this.bufferedImage = null;
        }
        this.isBuffering = false;
    }

    showLoadingState() {
        this.hideAllElements();
        if (this.loadingMessage) {
            this.loadingMessage.style.display = 'block';
            this.loadingMessage.textContent = 'Generoidaan kuvaa...';
        }
    }

    showImageForTiming() {
        this.gameState = 'showing';
        this.hideAllElements();

        if (this.canvas) this.canvas.style.display = 'block';
        if (this.timerText) {
            this.timerText.style.display = 'block';
            this.timerText.textContent = 'Katsele kuvaa huolellisesti...';
            this.timerText.classList.add('visible');
        }

        // Show for 3 seconds, then start question phase
        setTimeout(() => {
            this.startQuestionPhase();
        }, 3000);
    }

    startQuestionPhase() {
        this.gameState = 'question';
        this.hideAllElements();

        if (this.questionContainer) this.questionContainer.style.display = 'block';
        if (this.questionText) {
            this.questionText.textContent = 'Näitkö kuvassa kultaisen tähden?';
        }
        if (this.responseButtons) this.responseButtons.style.display = 'flex';
    }

    handleResponse(userSaidYes) {
        if (this.gameState !== 'question') return;

        this.userResponse = userSaidYes;
        const correct = (userSaidYes === this.hasTarget);

        // Record data
        this.roundData.push({
            round: this.currentRound,
            hasTarget: this.hasTarget,
            userResponse: userSaidYes,
            correct: correct,
            timestamp: Date.now()
        });

        // Save to localStorage
        this.saveDataToLocalStorage();

        // Show results
        this.showResults(correct);
    }

    showResults(correct) {
        this.gameState = 'results';
        this.hideAllElements();

        if (this.resultsDisplay) this.resultsDisplay.style.display = 'block';
        if (this.resultsText) {
            const correctAnswer = this.hasTarget ? 'Kyllä' : 'Ei';
            const userAnswer = this.userResponse ? 'Kyllä' : 'Ei';

            if (correct) {
                this.resultsText.innerHTML = `
                    <div style="color: #4caf50; font-size: 24px; font-weight: bold;">Oikein!</div>
                    <div style="margin-top: 10px;">Vastaus: ${correctAnswer}</div>
                `;
            } else {
                this.resultsText.innerHTML = `
                    <div style="color: #f44336; font-size: 24px; font-weight: bold;">Väärin</div>
                    <div style="margin-top: 10px;">Oikea vastaus: ${correctAnswer}</div>
                    <div>Sinun vastauksesi: ${userAnswer}</div>
                `;
            }
        }

        if (this.nextRoundBtn) this.nextRoundBtn.style.display = 'block';
        if (this.showStatsBtn) this.showStatsBtn.style.display = 'block';
    }

    showStatistics() {
        this.gameState = 'statistics';
        this.hideAllElements();

        if (this.statisticsDisplay) this.statisticsDisplay.style.display = 'block';

        if (this.statisticsContent && this.roundData.length > 0) {
            const totalRounds = this.roundData.length;
            const correctRounds = this.roundData.filter(r => r.correct).length;
            const accuracy = ((correctRounds / totalRounds) * 100).toFixed(1);

            const yesResponses = this.roundData.filter(r => r.userResponse).length;
            const noResponses = totalRounds - yesResponses;

            const actualYes = this.roundData.filter(r => r.hasTarget).length;
            const actualNo = totalRounds - actualYes;

            this.statisticsContent.innerHTML = `
                <h3>Tilastot</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td>Kierrokset yhteensä:</td><td><strong>${totalRounds}</strong></td></tr>
                    <tr><td>Oikeat vastaukset:</td><td><strong>${correctRounds}</strong></td></tr>
                    <tr><td>Tarkkuus:</td><td><strong>${accuracy}%</strong></td></tr>
                    <tr><td colspan="2" style="height: 20px;"></td></tr>
                    <tr><td>Kyllä-vastaukset:</td><td><strong>${yesResponses}</strong></td></tr>
                    <tr><td>Ei-vastaukset:</td><td><strong>${noResponses}</strong></td></tr>
                    <tr><td colspan="2" style="height: 20px;"></td></tr>
                    <tr><td>Tähtiä oli:</td><td><strong>${actualYes}</strong></td></tr>
                    <tr><td>Tähtiä ei ollut:</td><td><strong>${actualNo}</strong></td></tr>
                </table>
            `;
        }

        if (this.backToGameBtn) this.backToGameBtn.style.display = 'block';
    }

    backToGame() {
        this.gameState = 'setup';
        this.hideAllElements();
        if (this.startRoundBtn) this.startRoundBtn.style.display = 'block';
    }

    hideAllElements() {
        const elements = [
            this.loadingMessage, this.canvas, this.timerText, this.timerCountdown,
            this.questionContainer, this.resultsDisplay, this.statisticsDisplay
        ];

        elements.forEach(el => {
            if (el) el.style.display = 'none';
        });

        if (this.timerText) this.timerText.classList.remove('visible');
    }

    updateRoundCounter() {
        if (this.roundNumberElement) {
            this.roundNumberElement.textContent = this.currentRound;
        }
    }

    showError(message) {
        this.hideAllElements();
        if (this.loadingMessage) {
            this.loadingMessage.style.display = 'block';
            this.loadingMessage.textContent = `Virhe: ${message}`;
            this.loadingMessage.style.color = '#f44336';
        }
    }

    loadSavedData() {
        try {
            const saved = localStorage.getItem('yellowStarFinderData');
            if (saved) {
                const data = JSON.parse(saved);
                this.roundData = data.rounds || [];
                this.currentRound = this.roundData.length;
                this.updateRoundCounter();
            }
        } catch (error) {
            console.warn('Failed to load saved data:', error);
        }
    }

    saveDataToLocalStorage() {
        try {
            const data = {
                rounds: this.roundData,
                lastUpdated: Date.now()
            };
            localStorage.setItem('yellowStarFinderData', JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save data:', error);
        }
    }

    resetAllData() {
        if (confirm('Haluatko varmasti poistaa kaikki talletetut tulokset?')) {
            localStorage.removeItem('yellowStarFinderData');
            this.roundData = [];
            this.currentRound = 0;
            this.updateRoundCounter();
            this.backToGame();
        }
    }
}

// Auto-initialization removed - now handled by yellow-star-finder-client.js