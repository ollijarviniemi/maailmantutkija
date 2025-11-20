class QuantityEstimationTimeApp {
    constructor() {
        this.currentShapeCount = 0;
        this.selectedTime = 3; // Will be set from pre-generated rounds
        this.userEstimate = null;
        this.gameState = 'setup'; // 'setup', 'loading', 'showing', 'timing', 'estimation', 'results', 'statistics'
        
        // Determine backend URL based on current host
        const currentHost = window.location.hostname;
        if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
            this.backendUrl = 'http://localhost:5000';
        } else {
            // Use the same host as the current page but with port 5000
            this.backendUrl = `http://${currentHost}:5000`;
        }
        
        this.currentRound = 0;
        this.timerInterval = null;
        this.currentCountdown = 0;
        
        // Data collection for analysis
        this.roundData = [];
        
        // Buffer system for pre-generating next image
        this.bufferedImage = null;
        this.isBuffering = false;
        
        // Variance reduction system: pre-generated balanced rounds
        this.roundQueue = [];
        this.currentRoundIndex = 0;
        
        this.initializeApp();
    }
    
    initializeApp() {
        // Get DOM elements
        this.canvas = document.getElementById('shape-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.loadingMessage = document.getElementById('loading-message');
        this.timerText = document.getElementById('timer-text');
        this.timerCountdown = document.getElementById('timer-countdown');
        this.roundCounter = document.getElementById('round-counter');
        this.roundNumberElement = document.getElementById('round-number');
        this.questionContainer = document.getElementById('question-container');
        this.questionText = document.getElementById('question-text');
        this.estimationInput = document.getElementById('estimation-input');
        this.resultsDisplay = document.getElementById('results-display');
        this.resultsText = document.getElementById('results-text');
        this.nextRoundBtn = document.getElementById('next-round-btn');
        this.showStatsBtn = document.getElementById('show-stats-btn');
        this.statisticsDisplay = document.getElementById('statistics-display');
        this.statisticsContent = document.getElementById('statistics-content');
        this.backToGameBtn = document.getElementById('back-to-game-btn');
        this.startRoundBtn = document.getElementById('start-round-btn');
        
        // Load saved data from localStorage
        this.loadSavedData();
        
        // Set up event listeners
        document.getElementById('start-round-btn').addEventListener('click', () => this.startNewRound());
        document.getElementById('submit-estimate').addEventListener('click', () => this.handleEstimateSubmit());
        document.getElementById('estimation-number').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleEstimateSubmit();
            }
        });
        document.getElementById('next-round-btn').addEventListener('click', () => this.startNewRound());
        document.getElementById('show-stats-btn').addEventListener('click', () => this.showStatistics());
        document.getElementById('inline-stats-btn').addEventListener('click', () => this.showStatistics());
        document.getElementById('back-to-game-btn').addEventListener('click', () => this.backToGame());
        document.getElementById('reset-data-btn').addEventListener('click', () => this.resetAllData());
        document.getElementById('min-shapes').addEventListener('change', () => this.validateInputs());
        document.getElementById('max-shapes').addEventListener('change', () => this.validateInputs());
        
        // Set up help tooltip
        const helpIcon = document.getElementById('help-icon');
        const helpTooltip = document.getElementById('help-tooltip');
        
        helpIcon.addEventListener('mouseenter', () => {
            helpTooltip.style.display = 'block';
        });
        
        helpIcon.addEventListener('mouseleave', () => {
            helpTooltip.style.display = 'none';
        });
        
        // Check backend
        this.checkBackend();
    }
    
    loadSavedData() {
        try {
            const savedData = localStorage.getItem('quantityEstimationTimeData');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.roundData = data.roundData || [];
                this.currentRound = data.currentRound || 0;
                this.roundQueue = data.roundQueue || [];
                this.currentRoundIndex = data.currentRoundIndex || 0;
                console.log(`Loaded ${this.roundData.length} saved rounds`);
            }
        } catch (error) {
            console.error('Error loading saved data:', error);
            this.roundData = [];
            this.currentRound = 0;
            this.roundQueue = [];
            this.currentRoundIndex = 0;
        }
    }
    
    saveData() {
        try {
            const dataToSave = {
                roundData: this.roundData,
                currentRound: this.currentRound,
                roundQueue: this.roundQueue,
                currentRoundIndex: this.currentRoundIndex,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('quantityEstimationTimeData', JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }
    
    async checkBackend() {
        try {
            const response = await fetch(`${this.backendUrl}/api/health`);
            if (response.ok) {
                console.log('Backend is available');
            } else {
                this.showBackendError();
            }
        } catch (error) {
            console.log('Backend not available');
            this.showBackendError();
        }
    }
    
    showBackendError() {
        this.loadingMessage.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <h3>Palvelin ei ole käynnissä</h3>
                <p>Käynnistä palvelin komennolla:</p>
                <code style="background: #f5f5f5; padding: 5px 10px; border-radius: 4px;">python3 shape_app.py</code>
                <p style="margin-top: 15px;">
                    <a href="/lisamietinnan-hyoty/" style="color: #1976d2;">← Takaisin</a>
                </p>
            </div>
        `;
    }
    
    validateInputs() {
        const minShapes = parseInt(document.getElementById('min-shapes').value);
        const maxShapes = parseInt(document.getElementById('max-shapes').value);
        
        if (minShapes > maxShapes) {
            document.getElementById('max-shapes').value = minShapes;
        }
    }
    
    // Variance reduction functions
    sampleLogUniform(minVal, maxVal) {
        // Sample from log-uniform distribution (weights proportional to 1/n)
        const possibleValues = [];
        const weights = [];
        
        for (let n = minVal; n <= maxVal; n++) {
            possibleValues.push(n);
            weights.push(1 / n);
        }
        
        // Normalize weights
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        const normalizedWeights = weights.map(w => w / totalWeight);
        
        // Sample using cumulative distribution
        const random = Math.random();
        let cumulativeWeight = 0;
        
        for (let i = 0; i < possibleValues.length; i++) {
            cumulativeWeight += normalizedWeights[i];
            if (random <= cumulativeWeight) {
                return possibleValues[i];
            }
        }
        
        // Fallback (should not happen)
        return possibleValues[possibleValues.length - 1];
    }
    
    generateBalancedRounds() {
        // Generate 9 rounds: 3 times × 3 difficulties = 9 combinations
        const times = [1, 3, 10];
        const difficulties = [
            { name: 'easy', min: 20, max: 42 },
            { name: 'medium', min: 43, max: 92 },
            { name: 'hard', min: 93, max: 200 }
        ];
        
        const rounds = [];
        
        // Create one round for each time-difficulty combination
        for (const time of times) {
            for (const difficulty of difficulties) {
                const shapeCount = this.sampleLogUniform(difficulty.min, difficulty.max);
                rounds.push({
                    time: time,
                    shapeCount: shapeCount,
                    difficulty: difficulty.name
                });
            }
        }
        
        // Randomize the order of rounds
        for (let i = rounds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rounds[i], rounds[j]] = [rounds[j], rounds[i]];
        }
        
        console.log('Generated balanced rounds:', rounds);
        return rounds;
    }
    
    getNextRoundParameters() {
        // Check if we need to generate new rounds
        if (this.roundQueue.length === 0 || this.currentRoundIndex >= this.roundQueue.length) {
            this.roundQueue = this.generateBalancedRounds();
            this.currentRoundIndex = 0;
            console.log('Generated new batch of 9 balanced rounds');
        }
        
        // Get the next round parameters
        const roundParams = this.roundQueue[this.currentRoundIndex];
        this.currentRoundIndex++;
        
        // Save the updated state
        this.saveData();
        
        return roundParams;
    }
    
    async startNewRound() {
        this.gameState = 'loading';
        this.userEstimate = null;
        
        // Get balanced round parameters using variance reduction
        const roundParams = this.getNextRoundParameters();
        this.selectedTime = roundParams.time;
        const targetShapeCount = roundParams.shapeCount;
        
        console.log(`Variance reduction: ${this.selectedTime}s, ${targetShapeCount} shapes (${roundParams.difficulty})`);
        
        // Increment round counter
        this.currentRound++;
        this.updateRoundCounter();
        
        // Reset UI completely
        this.hideAllQuestionElements();
        this.timerText.classList.remove('visible');
        this.loadingMessage.style.display = 'block';
        this.nextRoundBtn.style.display = 'none';
        this.showStatsBtn.style.display = 'none';
        this.startRoundBtn.style.display = 'none';
        
        // Reset estimation input state
        const estimateInput = document.getElementById('estimation-number');
        const submitButton = document.getElementById('submit-estimate');
        const correctAnswerDisplay = document.getElementById('correct-answer-display');
        const scoreDisplay = document.getElementById('score-display');
        estimateInput.readOnly = false;
        estimateInput.value = '';
        submitButton.textContent = 'Vastaa';
        correctAnswerDisplay.textContent = '';
        scoreDisplay.textContent = '';
        
        // Hide the inline statistics button
        const inlineStatsBtn = document.getElementById('inline-stats-btn');
        if (inlineStatsBtn) {
            inlineStatsBtn.style.display = 'none';
        }
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        try {
            let imageData;
            
            // Check if we have a buffered image
            if (this.bufferedImage) {
                // Use buffered image immediately
                this.currentShapeCount = this.bufferedImage.shapeCount;
                
                // Display the buffered image
                await this.displayBase64Image(this.bufferedImage.imageData);
                
                console.log(`Using buffered image with ${this.bufferedImage.shapeCount} ${this.bufferedImage.metadata.shape_type}s`);
                
                // Clear the buffer
                this.bufferedImage = null;
            } else {
                // No buffered image, generate with specific target count
                imageData = await this.fetchImageWithCount(targetShapeCount);
                
                if (imageData) {
                    // Store the correct answer
                    this.currentShapeCount = imageData.num_shapes;
                    
                    // Display the image
                    await this.displayBase64Image(imageData.image);
                    
                    console.log(`Generated image with ${imageData.num_shapes} ${imageData.shape_type}s (target: ${targetShapeCount})`);
                }
            }
            
            // Show image with timer
            this.showImageWithTimer();
            
            // Start countdown timer
            this.startCountdownTimer();
            
        } catch (error) {
            console.error('Error generating image:', error);
            this.showError('Virhe kuvan generoinnissa: ' + error.message);
        }
    }
    
    async fetchNewImage() {
        // Use the original endpoint but with fixed range for quantity estimation time app (20-200 shapes)
        const response = await fetch(`${this.backendUrl}/api/generate-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                min_shapes: 20,
                max_shapes: 200
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            return data;
        } else {
            throw new Error(data.error || 'Unknown error occurred');
        }
    }
    
    async fetchImageWithCount(targetCount) {
        // Use the new endpoint for generating images with specific shape counts
        const response = await fetch(`${this.backendUrl}/api/generate-image-with-count`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                num_shapes: targetCount
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            return data;
        } else {
            throw new Error(data.error || 'Unknown error occurred');
        }
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
            img.src = 'data:image/png;base64,' + base64Data;
        });
    }
    
    updateRoundCounter() {
        // Show the number of completed rounds + 1 (current round being played)
        this.roundNumberElement.textContent = this.roundData.length + 1;
        this.roundCounter.classList.add('visible');
    }
    
    showImageWithTimer() {
        this.gameState = 'showing';
        this.loadingMessage.style.display = 'none';
        
        // Show timer
        this.timerCountdown.textContent = this.selectedTime;
        this.timerText.classList.add('visible');
        
        // Hide question text
        this.questionText.style.display = 'none';
    }
    
    startCountdownTimer() {
        this.currentCountdown = this.selectedTime;
        this.timerCountdown.textContent = this.currentCountdown;
        
        this.timerInterval = setInterval(() => {
            this.currentCountdown--;
            this.timerCountdown.textContent = this.currentCountdown;
            
            if (this.currentCountdown <= 0) {
                clearInterval(this.timerInterval);
                this.hideImageAndStartEstimation();
            }
        }, 1000);
    }
    
    hideImageAndStartEstimation() {
        // Hide the image by clearing canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add text to canvas indicating image is hidden
        this.ctx.fillStyle = '#666';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Kuva piilotettu', this.canvas.width / 2, this.canvas.height / 2);
        
        // Hide timer
        this.timerText.classList.remove('visible');
        
        // Start estimation question
        this.startEstimationQuestion();
    }
    
    startEstimationQuestion() {
        this.gameState = 'estimation';
        
        this.questionText.style.display = 'none';
        this.estimationInput.style.display = 'flex';
        
        // Focus on input
        document.getElementById('estimation-number').focus();
    }
    
    handleEstimateSubmit() {
        const estimateInput = document.getElementById('estimation-number');
        const submitButton = document.getElementById('submit-estimate');
        const correctAnswerDisplay = document.getElementById('correct-answer-display');
        const scoreDisplay = document.getElementById('score-display');

        if (this.gameState === 'estimation') {
            // First click - validate and show answer
            const estimate = parseInt(estimateInput.value);
            
            if (isNaN(estimate) || estimate < 1) {
                alert('Anna kelvollinen arvio (vähintään 1)');
                return;
            }
            
            this.userEstimate = estimate;
            
            // Make input readonly and change button text
            estimateInput.readOnly = true;
            submitButton.textContent = 'Seuraava';
            
            // Show correct answer
            correctAnswerDisplay.textContent = `Oikea: ${this.currentShapeCount}`;

            this.storeRoundData();

            // For 10+ rounds, show the statistics button below the input line
            if (this.roundData.length >= 10) {
                const inlineStatsBtn = document.getElementById('inline-stats-btn');
                if (inlineStatsBtn) {
                    inlineStatsBtn.style.display = 'block';
                }
            }
            
            // Change state to answered
            this.gameState = 'answered';
            
        } else if (this.gameState === 'answered') {
            // Second click - proceed to next round
            // Reset the input for next round
            estimateInput.readOnly = false;
            estimateInput.value = '';
            submitButton.textContent = 'Vastaa';
            correctAnswerDisplay.textContent = '';
            scoreDisplay.textContent = '';
            
            // Hide the statistics button
            this.showStatsBtn.style.display = 'none';
            
            // Continue to next round
            this.continueToNextRound();
        }
    }
    
    calculateScore(estimate, truth) {
        // Use relative distance: max(truth/estimate, estimate/truth)
        // Lower is better, 1.0 is perfect
        const ratio1 = truth / estimate;
        const ratio2 = estimate / truth;
        return Math.max(ratio1, ratio2);
    }
    
    storeRoundData() {
        const roundData = {
            actualCount: this.currentShapeCount,
            selectedTime: this.selectedTime,
            userEstimate: this.userEstimate,
            score: this.calculateScore(this.userEstimate, this.currentShapeCount),
            absoluteError: Math.abs(this.userEstimate - this.currentShapeCount),
            timestamp: new Date().toISOString()
        };
        this.roundData.push(roundData);
        
        // Save data to localStorage
        this.saveData();
    }

    continueToNextRound() {
        console.log('Round completed');
        
        // Always start new round immediately
        this.startNewRound();
        
        // Start buffering next image
        this.startBuffering();
    }
    
    async startBuffering() {
        // Don't start buffering if already buffering or if we already have a buffer
        if (this.isBuffering || this.bufferedImage) {
            return;
        }
        
        this.isBuffering = true;
        
        try {
            const imageData = await this.fetchNewImage();
            
            if (imageData) {
                // Store in buffer
                this.bufferedImage = {
                    imageData: imageData.image,
                    shapeCount: imageData.num_shapes,
                    metadata: {
                        shape_type: imageData.shape_type,
                        color: imageData.color,
                        distribution: imageData.distribution
                    }
                };
                
                console.log(`Buffered next image with ${imageData.num_shapes} ${imageData.shape_type}s`);
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
        
        // Hide game elements
        this.hideAllQuestionElements();
        this.timerText.classList.remove('visible');
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
        
        // Calculate statistics
        const stats = this.calculateStatistics();
        
        // Create statistics HTML with left-aligned text
        let statsHtml = `
            <div style="text-align: left;">
                <h1>Tilastot</h1>
                <p><strong>Kierrosten määrä:</strong> ${stats.roundsPlayed}</p>
                <br>
                <h3>Tulokset katseluajan mukaan:</h3>
                <table style="margin: 10px auto; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5;">Aika</th>
                            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5;">Kierrokset</th>
                            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5;">Abs.</th>
                            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5;">Suht.</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">1 sekuntia</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['1'].rounds}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['1'].avgAbsError || 'N/A'}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['1'].avgScore}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">3 sekuntia</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['3'].rounds}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['3'].avgAbsError || 'N/A'}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['3'].avgScore}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">10 sekuntia</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['10'].rounds}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['10'].avgAbsError || 'N/A'}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['10'].avgScore}</td>
                        </tr>
                        <tr style="font-weight: bold; background-color: #f9f9f9;">
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">Kaikki</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.roundsPlayed}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.averageAbsoluteError}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.averageRelativeScore}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <table style="margin: 20px auto;">
                <thead>
                    <tr>
                        <th>Kierros</th>
                        <th>Aika</th>
                        <th>Totuus</th>
                        <th>Arvio</th>
                        <th>Tulos</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        this.roundData.forEach((round, index) => {
            statsHtml += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${round.selectedTime}s</td>
                    <td>${round.actualCount}</td>
                    <td>${round.userEstimate}</td>
                    <td>${round.score.toFixed(2)}</td>
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
                averageRelativeScore: 0,
                averageAbsoluteError: 0,
                byTime: {
                    '1': { rounds: 0, avgScore: 'N/A' },
                    '3': { rounds: 0, avgScore: 'N/A' },
                    '10': { rounds: 0, avgScore: 'N/A' }
                }
            };
        }
        
        let totalRelativeScore = 0;
        let totalAbsoluteError = 0;
        
        // Group by time
        const byTime = {
            '1': { scores: [], absErrors: [], rounds: 0 },
            '3': { scores: [], absErrors: [], rounds: 0 },
            '10': { scores: [], absErrors: [], rounds: 0 }
        };
        
        this.roundData.forEach(round => {
            totalRelativeScore += round.score;
            totalAbsoluteError += round.absoluteError;
            
            const timeKey = round.selectedTime.toString();
            if (byTime[timeKey]) {
                byTime[timeKey].scores.push(round.score);
                byTime[timeKey].absErrors.push(round.absoluteError);
                byTime[timeKey].rounds++;
            }
        });
        
        // Calculate averages
        const averageRelativeScore = (totalRelativeScore / this.roundData.length).toFixed(2);
        const averageAbsoluteError = Math.round(totalAbsoluteError / this.roundData.length);
        
        // Calculate averages by time
        const timeStats = {};
        Object.keys(byTime).forEach(time => {
            const data = byTime[time];
            if (data.rounds > 0) {
                const avgScore = (data.scores.reduce((sum, score) => sum + score, 0) / data.rounds).toFixed(2);
                const avgAbsError = Math.round(data.absErrors.reduce((sum, error) => sum + error, 0) / data.rounds);
                timeStats[time] = { rounds: data.rounds, avgScore: avgScore, avgAbsError: avgAbsError };
            } else {
                timeStats[time] = { rounds: 0, avgScore: 'N/A', avgAbsError: 'N/A' };
            }
        });
        
        return {
            roundsPlayed: this.roundData.length,
            averageRelativeScore,
            averageAbsoluteError,
            byTime: timeStats
        };
    }
    
    backToGame() {
        // Start a new round immediately instead of showing previous round info
        this.statisticsDisplay.style.display = 'none';
        
        // Show the canvas again
        this.canvas.style.display = 'block';
        
        // Restore round counter visibility
        this.roundCounter.classList.add('visible');
        
        // Show start button again
        this.startRoundBtn.style.display = 'block';
        
        this.gameState = 'setup';
    }
    
    resetAllData() {
        // Show confirmation dialog
        const confirmed = confirm('Haluatko varmasti nollata kaikki tiedot? Tätä toimintoa ei voi perua.');
        
        if (confirmed) {
            // Clear all data
            this.roundData = [];
            this.currentRound = 0;
            
            // Clear variance reduction system
            this.roundQueue = [];
            this.currentRoundIndex = 0;
            
            // Clear buffered image
            this.bufferedImage = null;
            this.isBuffering = false;
            
            // Clear localStorage
            localStorage.removeItem('quantityEstimationTimeData');
            
            // Reset UI state completely
            this.hideAllQuestionElements();
            this.statisticsDisplay.style.display = 'none';
            
            // Ensure canvas is visible
            this.canvas.style.display = 'block';
            
            // Reset round counter visibility
            this.roundCounter.classList.remove('visible');
            
            // Reset game state
            this.gameState = 'setup';
            this.userEstimate = null;
            
            // Show start button
            this.startRoundBtn.style.display = 'block';
            
            console.log('All data has been reset');
        }
    }
    
    hideAllQuestionElements() {
        this.questionText.style.display = 'none';
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
                    <a href="/lisamietinnan-hyoty/" style="color: #1976d2;">← Takaisin</a>
                </p>
            </div>
        `;
        this.loadingMessage.style.display = 'block';
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', function() {
    new QuantityEstimationTimeApp();
});
