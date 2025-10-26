/**
 * Client-side Anchoring Bias App
 * Exactly replicates Flask backend functionality and flow
 */

class ClientAnchoringBiasApp {
    constructor() {
        this.currentShapeCount = 0;
        this.anchorNumber = 0;
        this.userComparison = null; // 'more' or 'fewer'
        this.userEstimate = null;
        this.gameState = 'loading'; // 'loading', 'showing', 'comparison', 'estimation', 'results', 'statistics'
        this.imageDisplayTime = 3000; // 3 seconds to view the image
        this.currentRound = 0;

        // Data collection for analysis - exactly like Flask
        this.roundData = [];

        // Buffer system for pre-generating next image - exactly like Flask
        this.bufferedImage = null; // {imageData: string, shapeCount: number, metadata: object}
        this.isBuffering = false;

        // Initialize the client-side generator
        this.shapeGenerator = new ClientShapeGenerator(800, 600);

        // Current image data (base64)
        this.currentImageData = null;

        this.initializeApp();
    }

    initializeApp() {
        // Get DOM elements - exactly like Flask version
        this.canvas = document.getElementById('shape-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.loadingMessage = document.getElementById('loading-message');
        this.anchorText = document.getElementById('anchor-text');
        this.anchorNumberElement = document.getElementById('anchor-number');
        this.roundCounter = document.getElementById('round-counter');
        this.roundNumberElement = document.getElementById('round-number');
        this.questionContainer = document.getElementById('question-container');
        this.questionText = document.getElementById('question-text');
        this.comparisonButtons = document.getElementById('comparison-buttons');
        this.estimationInput = document.getElementById('estimation-input');
        this.resultsDisplay = document.getElementById('results-display');
        this.resultsText = document.getElementById('results-text');
        this.nextRoundBtn = document.getElementById('next-round-btn');
        this.showStatsBtn = document.getElementById('show-stats-btn');
        this.statisticsDisplay = document.getElementById('statistics-display');
        this.statisticsContent = document.getElementById('statistics-content');
        this.backToGameBtn = document.getElementById('back-to-game-btn');

        // Load saved data from localStorage
        this.loadSavedData();

        // Set up event listeners - exactly like Flask version
        document.getElementById('fewer-btn')?.addEventListener('click', () => this.handleComparison('fewer'));
        document.getElementById('more-btn')?.addEventListener('click', () => this.handleComparison('more'));
        document.getElementById('submit-estimate')?.addEventListener('click', () => this.handleEstimateSubmit());
        document.getElementById('estimation-number')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleEstimateSubmit();
            }
        });
        document.getElementById('next-round-btn')?.addEventListener('click', () => this.startNewRound());
        document.getElementById('show-stats-btn')?.addEventListener('click', () => this.showStatistics());
        document.getElementById('inline-stats-btn')?.addEventListener('click', () => this.showStatistics());
        document.getElementById('back-to-game-btn')?.addEventListener('click', () => this.backToGame());
        document.getElementById('reset-data-btn')?.addEventListener('click', () => this.resetAllData());

        // Set up help tooltip
        this.setupHelpTooltip();

        console.log('Client-side Anchoring Bias App initialized - exact Flask replication');
        this.startNewRound();
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

    loadSavedData() {
        try {
            const savedData = localStorage.getItem('anchoringBiasData');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.roundData = data.roundData || [];
                this.currentRound = data.currentRound || 0;
                console.log(`Loaded ${this.roundData.length} saved rounds`);
            }
        } catch (error) {
            console.error('Error loading saved data:', error);
            // Reset to defaults if loading fails - exactly like Flask
            this.roundData = [];
            this.currentRound = 0;
        }
    }

    saveData() {
        try {
            const dataToSave = {
                roundData: this.roundData,
                currentRound: this.currentRound,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('anchoringBiasData', JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    async startNewRound() {
        this.gameState = 'loading';
        this.userComparison = null;
        this.userEstimate = null;

        // Increment round counter - exactly like Flask
        this.currentRound++;
        this.updateRoundCounter();

        // Reset UI completely - exactly like Flask
        this.hideAllQuestionElements();
        this.anchorText.classList.remove('visible');
        this.loadingMessage.style.display = 'block';
        this.nextRoundBtn.style.display = 'none';
        this.showStatsBtn.style.display = 'none';

        // Reset estimation input state - exactly like Flask
        const estimateInput = document.getElementById('estimation-number');
        const submitButton = document.getElementById('submit-estimate');
        const correctAnswerDisplay = document.getElementById('correct-answer-display');
        estimateInput.readOnly = false;
        estimateInput.value = '';
        submitButton.textContent = 'Vastaa';
        correctAnswerDisplay.textContent = '';

        // Hide the inline statistics button
        const inlineStatsBtn = document.getElementById('inline-stats-btn');
        if (inlineStatsBtn) {
            inlineStatsBtn.style.display = 'none';
        }

        // Clear canvas - exactly like Flask
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        try {
            let imageData;

            // Check if we have a buffered image - exactly like Flask
            if (this.bufferedImage) {
                // Use buffered image
                this.currentShapeCount = this.bufferedImage.shapeCount;
                this.currentImageData = this.bufferedImage.imageData;

                console.log(`Using buffered image with ${this.bufferedImage.shapeCount} ${this.bufferedImage.metadata.shapeType}s`);

                // Clear the buffer
                this.bufferedImage = null;
            } else {
                // No buffered image, generate normally
                imageData = await this.fetchNewImage();

                if (imageData) {
                    // Store the correct answer and image data
                    this.currentShapeCount = imageData.numShapes;
                    this.currentImageData = imageData.image;

                    console.log(`Generated image with ${imageData.numShapes} shapes`);
                }
            }

            // Generate anchor number - EXACTLY like Flask: only [75, 100, 125, 150, 175]
            this.generateAnchorNumber();

            // Show anchor first, then image after delay - EXACTLY like Flask
            this.showAnchorFirst();

            console.log(`Anchor: ${this.anchorNumber}`);

        } catch (error) {
            console.error('Error generating image:', error);
            this.showError('Virhe kuvan generoinnissa: ' + error.message);
        }
    }

    generateAnchorNumber() {
        // Use only specific anchor values - EXACTLY like Flask
        const anchorOptions = [75, 100, 125, 150, 175];

        // Select random anchor from the options
        this.anchorNumber = anchorOptions[Math.floor(Math.random() * anchorOptions.length)];
    }

    async fetchNewImage() {
        // Fixed shape count range 50-200 - EXACTLY like Flask
        const minShapes = 50;
        const maxShapes = 200;

        let attempts = 0;
        const maxAttempts = 10;
        const forbiddenValues = [75, 100, 125, 150, 175]; // EXACTLY like Flask

        while (attempts < maxAttempts) {
            // Sample number of shapes - EXACTLY like Flask log-uniform
            const numShapes = this.shapeGenerator.sampleLogUniform(minShapes, maxShapes);

            // Check if the generated count is one of the forbidden values
            if (!forbiddenValues.includes(numShapes)) {
                // Generate image with random parameters - EXACTLY like Flask
                const shapeTypes = ["circle", "square", "triangle", "star", "heart"];
                const colors = ["red", "blue", "green", "purple", "black"];

                const shapeType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
                const color = colors[Math.floor(Math.random() * colors.length)];
                const distribution = Math.random() < 0.5 ? "uniform" : "gaussian_mixture";
                const numGaussians = Math.floor(Math.random() * 5) + 1;

                const imageData = await this.shapeGenerator.generateImage({
                    numShapes: numShapes,
                    shapeType: shapeType,
                    color: color,
                    distribution: distribution,
                    numGaussians: numGaussians
                });

                if (imageData.success) {
                    return imageData;
                } else {
                    throw new Error(imageData.error || 'Generation failed');
                }
            }

            // If it's a forbidden value, try again
            attempts++;
            console.log(`Generated forbidden value ${numShapes}, retrying... (attempt ${attempts})`);
        }

        // If we've exhausted attempts, throw an error
        throw new Error('Could not generate image with valid shape count after multiple attempts');
    }

    displayBase64Image(base64Data) {
        return new Promise((resolve) => {
            const img = new Image();

            img.onload = () => {
                // Clear canvas
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

                // Calculate scaling to fit canvas while maintaining aspect ratio
                const scale = Math.min(this.canvas.width / img.width, this.canvas.height / img.height);
                const scaledWidth = img.width * scale;
                const scaledHeight = img.height * scale;

                // Center the image
                const x = (this.canvas.width - scaledWidth) / 2;
                const y = (this.canvas.height - scaledHeight) / 2;

                // Draw the image
                this.ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
                resolve();
            };

            // Set the source to the base64 data
            img.src = base64Data;
        });
    }

    updateRoundCounter() {
        // Show the number of completed rounds + 1 (current round being played)
        this.roundNumberElement.textContent = this.roundData.length + 1;
        this.roundCounter.classList.add('visible');
    }

    showAnchorFirst() {
        this.gameState = 'showing';
        this.loadingMessage.style.display = 'none';

        // Update and show anchor first - EXACTLY like Flask
        this.anchorNumberElement.textContent = this.anchorNumber;
        this.anchorText.classList.add('visible');

        // No instruction text needed
        this.questionText.style.display = 'none';

        // Wait 1000ms before showing the image - EXACTLY like Flask
        setTimeout(() => {
            this.showImageWithAnchor();
        }, 1000);
    }

    async showImageWithAnchor() {
        // Now display the image that was prepared earlier - EXACTLY like Flask
        if (this.currentImageData) {
            await this.displayBase64Image(this.currentImageData);
        }

        // Set up the timer to hide it after imageDisplayTime - EXACTLY like Flask
        setTimeout(() => {
            this.hideImageAndStartQuestions();
        }, this.imageDisplayTime);
    }

    hideImageAndStartQuestions() {
        // Hide the image by clearing canvas - EXACTLY like Flask
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Add text to canvas indicating image is hidden - EXACTLY like Flask
        this.ctx.fillStyle = '#666';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Kuva piilotettu', this.canvas.width / 2, this.canvas.height / 2);

        // Start comparison question - EXACTLY like Flask
        this.startComparisonQuestion();
    }

    startComparisonQuestion() {
        this.gameState = 'comparison';

        this.questionText.style.display = 'none';
        this.comparisonButtons.style.display = 'flex';
    }

    handleComparison(comparison) {
        this.userComparison = comparison;

        // Hide comparison buttons and start estimation question - EXACTLY like Flask
        this.comparisonButtons.style.display = 'none';
        this.startEstimationQuestion();
    }

    startEstimationQuestion() {
        this.gameState = 'estimation';

        this.questionText.style.display = 'none';
        this.estimationInput.style.display = 'flex';

        // Focus on input - EXACTLY like Flask
        document.getElementById('estimation-number').focus();
    }

    handleEstimateSubmit() {
        const estimateInput = document.getElementById('estimation-number');
        const submitButton = document.getElementById('submit-estimate');
        const correctAnswerDisplay = document.getElementById('correct-answer-display');

        if (this.gameState === 'estimation') {
            // First click - validate and show answer - EXACTLY like Flask
            const estimate = parseInt(estimateInput.value);

            if (isNaN(estimate) || estimate < 1) {
                alert('Anna kelvollinen arvio (vähintään 1)');
                return;
            }

            this.userEstimate = estimate;

            // Make input readonly and change button text - EXACTLY like Flask
            estimateInput.readOnly = true;
            submitButton.textContent = 'Seuraava';

            // Show correct answer - EXACTLY like Flask
            correctAnswerDisplay.textContent = `Oikea: ${this.currentShapeCount}`;

            this.storeRoundData();

            // For 10+ rounds, show the statistics button below the input line - EXACTLY like Flask
            if (this.roundData.length >= 10) {
                const inlineStatsBtn = document.getElementById('inline-stats-btn');
                if (inlineStatsBtn) {
                    inlineStatsBtn.style.display = 'block';
                }
            }

            // Change state to answered
            this.gameState = 'answered';

        } else if (this.gameState === 'answered') {
            // Second click - proceed to next round - EXACTLY like Flask
            // Reset the input for next round
            estimateInput.readOnly = false;
            estimateInput.value = '';
            submitButton.textContent = 'Vastaa';
            correctAnswerDisplay.textContent = '';

            // Hide the statistics button
            this.showStatsBtn.style.display = 'none';

            // Store round data and start new round
            this.continueToNextRound();
        }
    }

    storeRoundData() {
        const roundData = {
            actualCount: this.currentShapeCount,
            anchorNumber: this.anchorNumber,
            userComparison: this.userComparison,
            userEstimate: this.userEstimate,
            timestamp: new Date().toISOString()
        };
        this.roundData.push(roundData);

        // Save data to localStorage - EXACTLY like Flask
        this.saveData();
    }

    continueToNextRound() {
        // Always start new round immediately - EXACTLY like Flask
        this.startNewRound();

        // Start buffering next image
        this.startBuffering();
    }

    async startBuffering() {
        // Don't start buffering if already buffering or if we already have a buffer - EXACTLY like Flask
        if (this.isBuffering || this.bufferedImage) {
            return;
        }

        this.isBuffering = true;

        try {
            const imageData = await this.fetchNewImage();

            if (imageData) {
                // Store in buffer - EXACTLY like Flask
                this.bufferedImage = {
                    imageData: imageData.image,
                    shapeCount: imageData.numShapes,
                    metadata: {
                        shapeType: imageData.shapeType,
                        color: imageData.color,
                        distribution: imageData.distribution
                    }
                };

                console.log(`Buffered next image with ${imageData.numShapes} ${imageData.shapeType}s`);
            }
        } catch (error) {
            console.error('Error buffering next image:', error);
            // Don't show error to user for buffering failures
        } finally {
            this.isBuffering = false;
        }
    }

    showStatistics() {
        this.gameState = 'statistics';

        // Hide game elements - EXACTLY like Flask
        this.hideAllQuestionElements();
        this.anchorText.classList.remove('visible');
        this.loadingMessage.style.display = 'none';

        // Hide the image canvas for cleaner layout
        this.canvas.style.display = 'none';

        // Hide the round counter on statistics page
        this.roundCounter.classList.remove('visible');

        // Hide the inline statistics button
        const inlineStatsBtn = document.getElementById('inline-stats-btn');
        if (inlineStatsBtn) {
            inlineStatsBtn.style.display = 'none';
        }

        // Calculate statistics - EXACTLY like Flask
        const stats = this.calculateStatistics();

        // Create statistics HTML with left-aligned text - EXACTLY like Flask
        let statsHtml = `
            <div style="text-align: left;">
                <h1>Tilastot</h1>
                <p><strong>Kierrosten määrä:</strong> ${stats.roundsPlayed}</p>
                <p><strong>Yli vai ali rajan - oikein vastattu:</strong> ${stats.comparisonAccuracy.aliCorrect+stats.comparisonAccuracy.yliCorrect}/${stats.comparisonAccuracy.aliTotal+stats.comparisonAccuracy.yliTotal}</p>
                <p><strong>Rajan suuntaiset arviot:</strong> ${stats.directionalBias}% kierroksista</p>
                <p><strong>Yliarvioiden osuus:</strong> ${stats.overestimationRate}% kierroksista</p>
                <p><strong>Keskimääräinen suhteellinen virhe:</strong> ${stats.averageScore}</p>
            </div>

            <table style="margin: 20px auto;">
                <thead>
                    <tr>
                        <th>Kierros</th>
                        <th>Totuus</th>
                        <th>Raja</th>
                        <th>Arvio</th>
                    </tr>
                </thead>
                <tbody>
        `;

        this.roundData.forEach((round, index) => {
            statsHtml += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${round.actualCount}</td>
                    <td>${round.anchorNumber}</td>
                    <td>${round.userEstimate}</td>
                </tr>
            `;
        });

        statsHtml += `
                </tbody>
            </table>
        `;

        this.statisticsContent.innerHTML = statsHtml;
        this.statisticsDisplay.style.display = 'block';
    }

    calculateStatistics() {
        if (this.roundData.length === 0) {
            return {
                roundsPlayed: 0,
                overestimationRate: 0,
                directionalBias: 0,
                averageScore: 0,
                averageAbsoluteError: 0,
                comparisonAccuracy: { aliCorrect: 0, aliTotal: 0, yliCorrect: 0, yliTotal: 0 }
            };
        }

        let overestimations = 0;
        let directionalBiases = 0;
        let scores = [];
        let absoluteErrors = [];
        let aliCorrect = 0, aliTotal = 0, yliCorrect = 0, yliTotal = 0;

        this.roundData.forEach(round => {
            // Count overestimations
            if (round.userEstimate > round.actualCount) {
                overestimations++;
            }

            // Count directional bias (both guess and anchor on same side of truth)
            const guessAboveTruth = round.userEstimate > round.actualCount;
            const anchorAboveTruth = round.anchorNumber > round.actualCount;
            if (guessAboveTruth === anchorAboveTruth) {
                directionalBiases++;
            }

            // Calculate comparison accuracy - EXACTLY like Flask
            const actualMoreThanAnchor = round.actualCount > round.anchorNumber;
            if (round.userComparison === 'more') {
                yliTotal++;
                if (actualMoreThanAnchor) {
                    yliCorrect++;
                }
            } else if (round.userComparison === 'fewer') {
                aliTotal++;
                if (!actualMoreThanAnchor) {
                    aliCorrect++;
                }
            }

            // Calculate score using max(truth/guess, guess/truth) - EXACTLY like Flask
            const ratio1 = round.actualCount / round.userEstimate;
            const ratio2 = round.userEstimate / round.actualCount;
            const score = Math.max(ratio1, ratio2);
            scores.push(score);

            // Calculate absolute error
            const absoluteError = Math.abs(round.userEstimate - round.actualCount);
            absoluteErrors.push(absoluteError);
        });

        // Calculate averages - EXACTLY like Flask
        const overestimationRate = Math.round((overestimations / this.roundData.length) * 100);
        const directionalBias = Math.round((directionalBiases / this.roundData.length) * 100);

        // Calculate geometric mean of scores - EXACTLY like Flask
        const geometricMean = Math.pow(scores.reduce((product, score) => product * score, 1), 1 / scores.length);
        const averageAbsoluteError = (absoluteErrors.reduce((sum, error) => sum + error, 0) / absoluteErrors.length);

        // Format the geometric mean score to 2 decimal places
        const formattedScore = geometricMean.toFixed(2);

        return {
            roundsPlayed: this.roundData.length,
            overestimationRate,
            directionalBias,
            averageScore: formattedScore,
            averageAbsoluteError: Math.round(averageAbsoluteError),
            comparisonAccuracy: { aliCorrect, aliTotal, yliCorrect, yliTotal }
        };
    }

    backToGame() {
        // Start a new round immediately instead of showing previous round info - EXACTLY like Flask
        this.statisticsDisplay.style.display = 'none';

        // Show the canvas again
        this.canvas.style.display = 'block';

        // Restore round counter visibility
        this.roundCounter.classList.add('visible');

        this.startNewRound();
    }

    resetAllData() {
        // Show confirmation dialog
        const confirmed = confirm('Haluatko varmasti nollata kaikki tiedot? Tätä toimintoa ei voi perua.');

        if (confirmed) {
            // Clear all data - EXACTLY like Flask
            this.roundData = [];
            this.currentRound = 0;

            // Clear buffered image
            this.bufferedImage = null;
            this.isBuffering = false;

            // Clear localStorage
            localStorage.removeItem('anchoringBiasData');

            // Reset UI state completely
            this.hideAllQuestionElements();
            this.statisticsDisplay.style.display = 'none';

            // Ensure canvas is visible
            this.canvas.style.display = 'block';

            // Reset round counter visibility
            this.roundCounter.classList.add('visible');

            // Reset game state
            this.gameState = 'loading';
            this.userComparison = null;
            this.userEstimate = null;

            // Start fresh
            this.startNewRound();

            console.log('All data has been reset');
        }
    }

    hideAllQuestionElements() {
        this.questionText.style.display = 'none';
        this.comparisonButtons.style.display = 'none';
        this.estimationInput.style.display = 'none';
        this.resultsDisplay.style.display = 'none';
        this.statisticsDisplay.style.display = 'none';
    }

    showError(message) {
        this.loadingMessage.innerHTML = `
            <div style="color: #d32f2f; text-align: center;">
                <h3>Virhe</h3>
                <p>${message}</p>
                <p style="margin-top: 15px;">
                    <a href="/ankkurointivinouma/" style="color: #1976d2;">← Takaisin</a>
                </p>
            </div>
        `;
        this.loadingMessage.style.display = 'block';
    }
}

// Auto-initialize when DOM is loaded - EXACTLY like Flask version behavior
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('shape-canvas') && !window.anchoringBiasApp) {
        window.anchoringBiasApp = new ClientAnchoringBiasApp();
        console.log('Client Anchoring Bias App initialized');
    }
});