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

            // Generate anchor number first
            this.generateAnchorNumber();

            // Check if we have a buffered image that doesn't equal the anchor
            if (this.bufferedImage && this.bufferedImage.shapeCount !== this.anchorNumber) {
                // Use buffered image
                this.currentShapeCount = this.bufferedImage.shapeCount;
                this.currentImageData = this.bufferedImage.imageData;

                console.log(`Using buffered image with ${this.bufferedImage.shapeCount} ${this.bufferedImage.metadata.shapeType}s`);

                // Clear the buffer
                this.bufferedImage = null;
            } else {
                // No valid buffered image, generate normally
                if (this.bufferedImage) {
                    console.log(`Discarding buffered image (shape count ${this.bufferedImage.shapeCount} equals anchor ${this.anchorNumber})`);
                    this.bufferedImage = null;
                }

                imageData = await this.fetchNewImage();

                if (imageData) {
                    // Store the correct answer and image data
                    this.currentShapeCount = imageData.numShapes;
                    this.currentImageData = imageData.image;

                    console.log(`Generated image with ${imageData.numShapes} shapes`);
                }
            }

            // Show anchor first, then image after delay - EXACTLY like Flask
            this.showAnchorFirst();

            console.log(`Anchor: ${this.anchorNumber}`);

        } catch (error) {
            console.error('Error generating image:', error);
            this.showError('Virhe kuvan generoinnissa: ' + error.message);
        }
    }

    generateAnchorNumber() {
        // Sample anchor from [50, 200] with P(anchor = a) ∝ 1/a
        this.anchorNumber = this.shapeGenerator.sampleLogUniform(50, 200);
    }

    async fetchNewImage() {
        // Fixed shape count range 50-200
        const minShapes = 50;
        const maxShapes = 200;

        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            // Sample number of shapes - log-uniform distribution
            const numShapes = this.shapeGenerator.sampleLogUniform(minShapes, maxShapes);

            // Check if the generated count equals the anchor (forbidden)
            if (numShapes !== this.anchorNumber) {
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

            // If it equals the anchor, try again
            attempts++;
            console.log(`Generated shape count ${numShapes} equals anchor ${this.anchorNumber}, retrying... (attempt ${attempts})`);
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
                <p><strong>Yliarvioiden osuus:</strong> ${stats.overestimationRate}% kierroksista</p>
                <p><strong>Keskimääräinen suhteellinen virhe:</strong> ${stats.averageScore}</p>
        `;

        // Add simplified anchoring analysis
        if (stats.regression && stats.beta2Profile) {
            const reg = stats.regression;
            const profile = stats.beta2Profile;
            const effect = Math.round(100 * profile.beta2_mle);
            const lowerEffect = Math.round(100 * profile.lower_bound);
            const upperEffect = Math.round(100 * profile.upper_bound);

            // Log regression results to console
            console.log('=== Linear Regression Results (MLE) ===');
            console.log('β₀ (intercept):', reg.beta0.toFixed(3));
            console.log('β₁ (truth coefficient):', reg.beta1.toFixed(3));
            console.log('β₂ (anchor coefficient):', reg.beta2.toFixed(3));
            console.log('σ² (error variance):', reg.sigma2.toFixed(2));
            console.log('σ (error std dev):', Math.sqrt(reg.sigma2).toFixed(2));
            console.log('');
            console.log('Effect of increasing anchor by 100:', effect);
            console.log('1:10 likelihood interval:', [lowerEffect, upperEffect]);
            console.log('P(effect > 5):', (profile.prob_substantial_effect * 100).toFixed(1) + '%');
            console.log('===================================');

            statsHtml += `
                <style>
                    .inline-help-icon {
                        display: inline-block;
                        position: relative;
                        width: 20px;
                        height: 20px;
                        border: 2px solid #666;
                        border-radius: 50%;
                        font-size: 14px;
                        font-weight: bold;
                        color: #666;
                        cursor: pointer;
                        background-color: white;
                        text-align: center;
                        line-height: 18px;
                        margin-left: 8px;
                        vertical-align: middle;
                    }
                    .inline-help-icon:hover {
                        background-color: #f5f5f5;
                        border-color: #333;
                        color: #333;
                    }
                    .inline-help-tooltip {
                        position: absolute;
                        left: 0;
                        top: 30px;
                        background-color: #333;
                        color: white;
                        padding: 12px;
                        border-radius: 6px;
                        font-size: 13px;
                        line-height: 1.5;
                        white-space: normal;
                        width: 400px;
                        max-width: 90vw;
                        display: none;
                        z-index: 1000;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                        text-align: left;
                    }
                    .inline-help-icon:hover .inline-help-tooltip {
                        display: block;
                    }
                    .inline-help-tooltip::before {
                        content: '';
                        position: absolute;
                        bottom: 100%;
                        left: 10px;
                        width: 0;
                        height: 0;
                        border-left: 6px solid transparent;
                        border-right: 6px solid transparent;
                        border-bottom: 6px solid #333;
                    }
                </style>
                <h2 style="margin-top: 30px;">
                    Ankkuroinnin vaikutus
                    <span class="inline-help-icon">
                        ?
                        <span class="inline-help-tooltip">
                            Ankkuroinnin vaikutus on määritetty pyrkimällä ennustaa pelaajan veikkaus oikean vastauksen ja näytetyn rajan eli ankkurin perusteella. Ankkurin vaikutuksen huomaa siitä, että ennustukset ovat tarkempia, kun näytetyn ankkurin suuruuden ottaa huomioon. Tarkalleen menetelmänä on sovittaa "lineaarinen regressio": veikkaus = x + y×oikea + z×ankkuri.<br><br>
                            Ilmoitettu vaikutus on 100×z, eli se, kuinka paljon pelaajan veikkaus kasvaa (tai ennustetaan kasvavan) ankkurin kasvaessa sadalla.<br><br>
                            Jos pelaaja on pelannut vain muutaman kierroksen, jäljelle jää vielä paljon epävarmuutta siitä, mikä tapa ennustaa on paras. Arvioissa on siis epävarmuutta.<br><br>
                            Ilmoitus ankkurointivinoumasta näytetään, jos on todennäköistä (yli 90%), että vaikutus on yli 5.
                        </span>
                    </span>
                </h2>
                <p>Rajan kasvattaminen sadalla keskimäärin kasvatti arviotasi: ${effect}.</p>
                <p style="font-size: 14px; color: #666;">
                    Arvio rajan vaikutuksesta on epävarma. Virheväli: [${lowerEffect}, ${upperEffect}]. Pelaamalla lisää saa varmemman arvion.
                </p>
            `;

            // Add notice if substantial anchoring effect detected
            if (profile.prob_substantial_effect > 0.9) {
                statsHtml += `
                    <p style="margin-top: 10px; font-style: italic;">
                        Ankkurointivinoumaa on havaittavissa!
                    </p>
                `;
            }
        }

        statsHtml += `
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

    /**
     * Compute MLE linear regression: prediction = β₀ + β₁*truth + β₂*anchor + ε
     * where ε ~ N(0, σ²)
     * Returns MLE estimates for all parameters
     */
    computeMLERegression() {
        const n = this.roundData.length;

        if (n < 4) {
            return null; // Need at least 4 data points for 3 parameters
        }

        // Extract data
        const y = this.roundData.map(r => r.userEstimate);
        const truth = this.roundData.map(r => r.actualCount);
        const anchor = this.roundData.map(r => r.anchorNumber);

        // Design matrix X = [1, truth, anchor]
        const X = [];
        for (let i = 0; i < n; i++) {
            X.push([1, truth[i], anchor[i]]);
        }

        // MLE for β: β̂ = (X'X)⁻¹X'y
        const XtX = this.matrixMultiply(this.transpose(X), X);
        const Xty = this.matrixVectorMultiply(this.transpose(X), y);

        const XtX_inv = this.matrixInverse3x3(XtX);
        const beta_hat = this.matrixVectorMultiply(XtX_inv, Xty);

        // Compute fitted values and residuals
        const y_pred = this.matrixVectorMultiply(X, beta_hat);
        let RSS = 0;
        for (let i = 0; i < n; i++) {
            RSS += (y[i] - y_pred[i]) ** 2;
        }

        // MLE for σ²: σ̂² = RSS / n
        const sigma2_hat = RSS / n;

        // Log-likelihood at MLE
        const log_lik_mle = -0.5 * n * Math.log(2 * Math.PI) -
                            0.5 * n * Math.log(sigma2_hat) -
                            0.5 * RSS / sigma2_hat;

        return {
            beta0: beta_hat[0],
            beta1: beta_hat[1],
            beta2: beta_hat[2],
            sigma2: sigma2_hat,
            log_likelihood: log_lik_mle,
            RSS: RSS,
            n: n
        };
    }

    // Matrix operations helpers
    transpose(matrix) {
        return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
    }

    matrixMultiply(A, B) {
        const result = [];
        for (let i = 0; i < A.length; i++) {
            result[i] = [];
            for (let j = 0; j < B[0].length; j++) {
                let sum = 0;
                for (let k = 0; k < A[0].length; k++) {
                    sum += A[i][k] * B[k][j];
                }
                result[i][j] = sum;
            }
        }
        return result;
    }

    matrixAdd(A, B) {
        const result = [];
        for (let i = 0; i < A.length; i++) {
            result[i] = [];
            for (let j = 0; j < A[0].length; j++) {
                result[i][j] = A[i][j] + B[i][j];
            }
        }
        return result;
    }

    matrixVectorMultiply(matrix, vector) {
        return matrix.map(row =>
            row.reduce((sum, val, i) => sum + val * vector[i], 0)
        );
    }

    matrixInverse3x3(m) {
        // Compute inverse of 3x3 matrix using cofactor method
        const det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
                  - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
                  + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

        if (Math.abs(det) < 1e-10) {
            throw new Error('Matrix is singular');
        }

        const inv = [
            [
                (m[1][1] * m[2][2] - m[1][2] * m[2][1]) / det,
                (m[0][2] * m[2][1] - m[0][1] * m[2][2]) / det,
                (m[0][1] * m[1][2] - m[0][2] * m[1][1]) / det
            ],
            [
                (m[1][2] * m[2][0] - m[1][0] * m[2][2]) / det,
                (m[0][0] * m[2][2] - m[0][2] * m[2][0]) / det,
                (m[0][2] * m[1][0] - m[0][0] * m[1][2]) / det
            ],
            [
                (m[1][0] * m[2][1] - m[1][1] * m[2][0]) / det,
                (m[0][1] * m[2][0] - m[0][0] * m[2][1]) / det,
                (m[0][0] * m[1][1] - m[0][1] * m[1][0]) / det
            ]
        ];
        return inv;
    }

    scaleMatrix(matrix, scalar) {
        return matrix.map(row => row.map(val => val * scalar));
    }

    /**
     * Compute MLE for fixed value of β₂ by profiling over other parameters
     *
     * For fixed β₂, we have: y - β₂*anchor = β₀ + β₁*truth + ε
     * We compute MLE for β₀, β₁, and σ², then compute log-likelihood
     */
    computeLikelihoodFixedBeta2(beta2_fixed) {
        const n = this.roundData.length;

        // Extract data
        const y = this.roundData.map(r => r.userEstimate);
        const truth = this.roundData.map(r => r.actualCount);
        const anchor = this.roundData.map(r => r.anchorNumber);

        // Adjusted response: y_adj = y - β₂*anchor
        const y_adj = y.map((val, i) => val - beta2_fixed * anchor[i]);

        // Design matrix for reduced model: X_red = [1, truth]
        const X_red = [];
        for (let i = 0; i < n; i++) {
            X_red.push([1, truth[i]]);
        }

        // MLE for β₀ and β₁: [β₀, β₁]' = (X'X)⁻¹X'y_adj
        const XtX = this.matrixMultiply(this.transpose(X_red), X_red);
        const Xty = this.matrixVectorMultiply(this.transpose(X_red), y_adj);

        const XtX_inv = this.matrixInverse2x2(XtX);
        const beta_red = this.matrixVectorMultiply(XtX_inv, Xty);

        // Compute RSS
        const y_pred = this.matrixVectorMultiply(X_red, beta_red);
        let RSS = 0;
        for (let i = 0; i < n; i++) {
            RSS += (y_adj[i] - y_pred[i]) ** 2;
        }

        // MLE for σ²: σ̂² = RSS / n
        const sigma2_hat = RSS / n;

        // Log-likelihood
        const log_lik = -0.5 * n * Math.log(2 * Math.PI) -
                        0.5 * n * Math.log(sigma2_hat) -
                        0.5 * RSS / sigma2_hat;

        return {
            beta0: beta_red[0],
            beta1: beta_red[1],
            beta2: beta2_fixed,
            sigma2: sigma2_hat,
            log_likelihood: log_lik
        };
    }

    matrixInverse2x2(m) {
        // Compute inverse of 2x2 matrix
        const det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
        if (Math.abs(det) < 1e-10) {
            throw new Error('Matrix is singular');
        }
        return [
            [m[1][1] / det, -m[0][1] / det],
            [-m[1][0] / det, m[0][0] / det]
        ];
    }

    /**
     * Compute profile likelihood for β₂
     * Returns MLE and likelihood-based confidence bounds (1:10 ratio)
     */
    computeBeta2ProfileLikelihood() {
        // Grid of β₂ values to test
        const beta2_grid = [];
        for (let b = -0.3; b <= 0.3; b += 0.01) {
            beta2_grid.push(b);
        }

        // Compute profile log-likelihood for each β₂
        const profile = beta2_grid.map(b2 => {
            const fit = this.computeLikelihoodFixedBeta2(b2);
            return {
                beta2: b2,
                log_lik: fit.log_likelihood,
                lik_ratio: 0,  // Will compute after finding max
                posterior: 0,  // Will compute with prior
                log_posterior: 0  // Will compute with prior
            };
        });

        // Find MLE (maximum log-likelihood)
        const mle_idx = profile.reduce((maxIdx, curr, idx, arr) =>
            curr.log_lik > arr[maxIdx].log_lik ? idx : maxIdx, 0);
        const max_log_lik = profile[mle_idx].log_lik;
        const beta2_mle = profile[mle_idx].beta2;

        // Compute likelihood ratios
        profile.forEach(p => {
            p.lik_ratio = Math.exp(p.log_lik - max_log_lik);
        });

        // Compute posterior with reasonable prior: N(0, 0.15²)
        // Wider SD to accommodate observed range: β₂ ∈ [0.01, 0.20]
        const prior_sd = 0.15;
        profile.forEach(p => {
            const prior_log = -0.5 * Math.log(2 * Math.PI * prior_sd * prior_sd) -
                             0.5 * (p.beta2 * p.beta2) / (prior_sd * prior_sd);
            p.log_posterior = p.log_lik + prior_log;
        });

        // Normalize posterior
        const max_log_post = Math.max(...profile.map(p => p.log_posterior));
        const posterior_unnorm = profile.map(p => Math.exp(p.log_posterior - max_log_post));
        const total_post = posterior_unnorm.reduce((sum, p) => sum + p, 0);
        profile.forEach((p, i) => {
            p.posterior = posterior_unnorm[i] / total_post;
        });

        // Compute P(beta_2 > 0.05) = P(100*beta_2 > 5)
        const threshold_beta2 = 0.05;
        const prob_above_threshold = profile
            .filter(p => p.beta2 > threshold_beta2)
            .reduce((sum, p) => sum + p.posterior, 0);

        // Find bounds where likelihood ratio = 1:10 (log-likelihood drops by log(10))
        const threshold = Math.exp(-Math.log(10));  // 0.1
        let lower_bound = beta2_grid[0];
        let upper_bound = beta2_grid[beta2_grid.length - 1];

        // Find lower bound (scanning from MLE downward)
        for (let i = mle_idx; i >= 0; i--) {
            if (profile[i].lik_ratio < threshold) {
                // Interpolate between i and i+1
                if (i < beta2_grid.length - 1) {
                    const alpha = (threshold - profile[i].lik_ratio) /
                                  (profile[i+1].lik_ratio - profile[i].lik_ratio);
                    lower_bound = profile[i].beta2 + alpha * (profile[i+1].beta2 - profile[i].beta2);
                } else {
                    lower_bound = profile[i].beta2;
                }
                break;
            }
        }

        // Find upper bound (scanning from MLE upward)
        for (let i = mle_idx; i < profile.length; i++) {
            if (profile[i].lik_ratio < threshold) {
                // Interpolate between i-1 and i
                if (i > 0) {
                    const alpha = (threshold - profile[i].lik_ratio) /
                                  (profile[i-1].lik_ratio - profile[i].lik_ratio);
                    upper_bound = profile[i].beta2 + alpha * (profile[i-1].beta2 - profile[i].beta2);
                } else {
                    upper_bound = profile[i].beta2;
                }
                break;
            }
        }

        return {
            beta2_mle: beta2_mle,
            lower_bound: lower_bound,
            upper_bound: upper_bound,
            profile: profile,
            prob_substantial_effect: prob_above_threshold
        };
    }

    calculateStatistics() {
        if (this.roundData.length === 0) {
            return {
                roundsPlayed: 0,
                overestimationRate: 0,
                directionalBias: 0,
                averageScore: 0,
                averageAbsoluteError: 0,
                comparisonAccuracy: { aliCorrect: 0, aliTotal: 0, yliCorrect: 0, yliTotal: 0 },
                regression: null
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

        // Compute MLE regression
        const regression = this.computeMLERegression();

        // Compute profile likelihood for β₂
        const beta2Profile = this.computeBeta2ProfileLikelihood();

        return {
            roundsPlayed: this.roundData.length,
            overestimationRate,
            directionalBias,
            averageScore: formattedScore,
            averageAbsoluteError: Math.round(averageAbsoluteError),
            comparisonAccuracy: { aliCorrect, aliTotal, yliCorrect, yliTotal },
            regression,
            beta2Profile
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

// Auto-initialize when DOM is loaded or immediately if already loaded
function initializeAnchoringBiasApp() {
    if (document.getElementById('shape-canvas') && !window.anchoringBiasApp) {
        window.anchoringBiasApp = new ClientAnchoringBiasApp();
        console.log('Client Anchoring Bias App initialized');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAnchoringBiasApp);
} else {
    // DOM already loaded (script loaded dynamically after page load)
    initializeAnchoringBiasApp();
}