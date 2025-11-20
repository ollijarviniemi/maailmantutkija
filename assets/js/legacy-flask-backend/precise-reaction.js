class PreciseReactionApp {
    constructor() {
        // Configuration - easily modifiable
        this.TOTAL_ROUNDS = 300;
        
        this.currentShape = null;
        this.currentColor = null;
        this.correctAnswer = null;
        this.userResponse = null;
        this.gameState = 'setup'; // 'setup', 'loading', 'showing', 'question', 'results'
        
        // Determine backend URL based on current host
        const currentHost = window.location.hostname;
        if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
            this.backendUrl = 'http://localhost:5000';
        } else {
            // Use the same host as the current page but with port 5000
            this.backendUrl = `http://${currentHost}:5000`;
        }
        
        this.currentRound = 0;
        
        // Data collection for analysis
        this.roundData = [];
        
        // Buffer system for pre-generating next image
        this.bufferedImage = null;
        this.isBuffering = false;
        
        this.initializeApp();
    }
    
    initializeApp() {
        // Get DOM elements
        this.canvas = document.getElementById('shape-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.loadingMessage = document.getElementById('loading-message');
        this.roundCounter = document.getElementById('round-counter');
        this.roundNumberElement = document.getElementById('round-number');
        this.questionContainer = document.getElementById('question-container');
        this.keyboardInstructions = document.getElementById('keyboard-instructions');
        this.feedbackIcon = document.getElementById('feedback-icon');
        this.gameOverDisplay = document.getElementById('game-over-display');
        this.gameOverText = document.getElementById('game-over-text');
        this.restartBtn = document.getElementById('restart-btn');
        this.resultsDisplay = document.getElementById('results-display');
        this.resultsText = document.getElementById('results-text');
        this.nextRoundBtn = document.getElementById('next-round-btn');
        this.startRoundBtn = document.getElementById('start-round-btn');
        
        // Load saved data from localStorage
        this.loadSavedData();
        
        // Set up event listeners
        const startBtn = document.getElementById('start-round-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                // If game is completed, restart first, then start new round
                if (this.roundData.length >= this.TOTAL_ROUNDS) {
                    this.restartGame();
                }
                this.startNewRound();
            });
        }
        this.restartBtn.addEventListener('click', () => this.restartGame());
        
        // Add keyboard event listener
        document.addEventListener('keydown', (event) => this.handleKeyPress(event));
        
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
            const savedData = localStorage.getItem('preciseReactionData');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.roundData = data.roundData || [];
                this.currentRound = data.currentRound || 0;
                console.log(`Loaded ${this.roundData.length} saved rounds`);
            }
        } catch (error) {
            console.error('Error loading saved data:', error);
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
            localStorage.setItem('preciseReactionData', JSON.stringify(dataToSave));
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
                <code style="background: #f5f5f5; padding: 5px 10px; border-radius: 4px;">cd website_project && ./start_website.sh</code>
                <p style="margin-top: 15px;">
                    <a href="/virheet-ja-aarimminen-luotettavuus/" style="color: #1976d2;">← Takaisin</a>
                </p>
            </div>
        `;
    }
    
    async startNewRound() {
        // Check if we've completed all rounds
        if (this.roundData.length >= this.TOTAL_ROUNDS) {
            this.showFinalResults();
            return;
        }
        
        this.gameState = 'loading';
        this.userResponse = null;
        
        // Increment round counter
        this.currentRound++;
        this.updateRoundCounter();
        
        // Reset UI completely
        this.hideAllQuestionElements();
        this.loadingMessage.style.display = 'block';
        this.nextRoundBtn.style.display = 'none';
        this.startRoundBtn.style.display = 'none';
        
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        try {
            // Use current round number (which is roundData.length + 1)
            const roundNumber = this.roundData.length + 1;
            
            // Check if we have a buffered image for this round
            if (this.bufferedImage && this.bufferedImage.round_number === roundNumber) {
                // Use buffered image immediately
                this.currentShape = this.bufferedImage.shape;
                this.currentColor = this.bufferedImage.color;
                this.correctAnswer = this.bufferedImage.correct_answer;
                
                // Display the buffered image
                await this.displayBase64Image(this.bufferedImage.image);
                
                console.log(`Using buffered image for round ${roundNumber}`);
                
                // Clear the buffer
                this.bufferedImage = null;
            } else {
                // Generate new image for this specific round
                const imageData = await this.fetchImageForRound(roundNumber);
                
                if (imageData) {
                    // Store the data
                    this.currentShape = imageData.shape;
                    this.currentColor = imageData.color;
                    this.correctAnswer = imageData.correct_answer;
                    
                    // Display the image
                    await this.displayBase64Image(imageData.image);
                    
                    console.log(`Generated new image for round ${roundNumber}: ${imageData.color} ${imageData.shape} (${imageData.correct_answer})`);
                }
            }
            
            // Show image and start question immediately for this task
            this.showImageAndStartQuestion();
            
        } catch (error) {
            console.error('Error generating image:', error);
            this.showError('Virhe kuvan generoinnissa: ' + error.message);
        }
    }
    
    async fetchImageForRound(roundNumber) {
        const startTime = performance.now();
        
        const response = await fetch(`${this.backendUrl}/api/generate-precise-reaction-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                round_number: roundNumber
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        const endTime = performance.now();
        const generationTime = endTime - startTime;
        console.log(`Image generation took ${generationTime.toFixed(2)}ms`);
        
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
        // Show the current round being played
        this.roundNumberElement.textContent = this.roundData.length + 1;
        this.roundCounter.classList.add('visible');
    }
    
    showImageAndStartQuestion() {
        this.gameState = 'question';
        this.loadingMessage.style.display = 'none';
        
        // Show keyboard instructions
        this.keyboardInstructions.style.display = 'block';
    }
    
    handleKeyPress(event) {
        // Handle Ctrl+R to restart game
        if (event.ctrlKey && event.key.toLowerCase() === 'r') {
            event.preventDefault();
            if (this.gameState !== 'setup') {
                this.restartGame();
            }
            return;
        }
        
        // Only handle key presses when in question state
        if (this.gameState !== 'question') return;
        
        const key = event.key.toLowerCase();
        if (key === 'a' || key === 'b') {
            this.handleResponse(key.toUpperCase());
        }
    }
    
    handleResponse(response) {
        this.userResponse = response;
        this.gameState = 'results';
        
        // Hide keyboard instructions
        this.keyboardInstructions.style.display = 'none';
        
        // Check if answer is correct
        const isCorrect = response === this.correctAnswer;
        
        if (isCorrect) {
            // Show green check mark
            this.showCorrectFeedback();
            
            // Immediately clear canvas to white to prevent flash
            this.showBlankCanvas();
            
            // Store round data
            this.storeRoundData();
            
            // Start buffering next image if not at final round
            if (this.roundData.length < this.TOTAL_ROUNDS) {
                this.startBuffering();
            }
            
            // Automatically continue to next round after brief delay
            setTimeout(() => {
                if (this.roundData.length >= this.TOTAL_ROUNDS) {
                    this.showFinalResults();
                } else {
                    // Canvas already cleared, just start next round
                    setTimeout(() => {
                        this.startNewRound();
                    }, 50);
                }
            }, 800); // Short delay to show the check mark
        } else {
            // Game over - wrong answer
            this.showGameOver();
        }
    }
    
    showCorrectFeedback() {
        // Show check mark briefly
        this.feedbackIcon.classList.add('show');
        setTimeout(() => {
            this.feedbackIcon.classList.remove('show');
        }, 600);
    }
    
    showBlankCanvas() {
        // Clear canvas to blank state
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Hide keyboard instructions during blank period
        this.keyboardInstructions.style.display = 'none';
    }
    
    showGameOver() {
        // Store the incorrect round data
        this.storeRoundData();
        
        const roundNumber = this.roundData.length;
        
        this.gameOverText.innerHTML = `
            Vastasit väärin kierroksella ${roundNumber}.
        `;
        
        this.gameOverDisplay.style.display = 'block';
        this.gameState = 'game_over';
    }
    
    restartGame() {
        // Reset all game data for fresh attempt
        this.roundData = [];
        this.currentRound = 0;
        this.bufferedImage = null;
        this.isBuffering = false;
        this.gameState = 'setup';
        this.userResponse = null;
        
        // Clear localStorage
        localStorage.removeItem('preciseReactionData');
        
        // Hide game over display
        this.gameOverDisplay.style.display = 'none';
        
        // Reset UI
        this.hideAllQuestionElements();
        this.roundCounter.classList.remove('visible');
        this.canvas.style.display = 'block';
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Show start button
        this.startRoundBtn.style.display = 'block';
        
        console.log('Game restarted');
    }
    
    
    storeRoundData() {
        const isCorrect = this.userResponse === this.correctAnswer;
        
        const roundData = {
            roundNumber: this.roundData.length + 1,
            shape: this.currentShape,
            color: this.currentColor,
            correctAnswer: this.correctAnswer,
            userResponse: this.userResponse,
            isCorrect: isCorrect,
            timestamp: new Date().toISOString()
        };
        
        this.roundData.push(roundData);
        
        // Save data to localStorage
        this.saveData();
    }
    
    async startBuffering() {
        // Don't start buffering if already buffering or if we already have a buffer
        if (this.isBuffering || this.bufferedImage) {
            return;
        }
        
        // Don't buffer if we're at final round
        if (this.roundData.length >= this.TOTAL_ROUNDS) {
            return;
        }
        
        this.isBuffering = true;
        
        try {
            const nextRoundNumber = this.roundData.length + 2; // Next round after current
            const imageData = await this.fetchImageForRound(nextRoundNumber);
            
            if (imageData) {
                // Store in buffer
                this.bufferedImage = {
                    round_number: nextRoundNumber,
                    image: imageData.image,
                    shape: imageData.shape,
                    color: imageData.color,
                    correct_answer: imageData.correct_answer
                };
                
                console.log(`Buffered next image for round ${nextRoundNumber}`);
            }
        } catch (error) {
            console.error('Error buffering next image:', error);
            // Don't show error to user for buffering failures
        } finally {
            this.isBuffering = false;
        }
    }
    
    showFinalResults() {
        this.resultsText.innerHTML = `
            <div style="text-align: center; padding: 20px; font-size: 28px; color: #2e7d32;">
                <h2>Onnittelut, kaikki ${this.TOTAL_ROUNDS} kierrosta suoritettu oikein!</h2>
            </div>
        `;
        this.resultsDisplay.style.display = 'block';
        
        // Hide next round button
        this.nextRoundBtn.style.display = 'none';
    }
    
    
    
    
    
    hideAllQuestionElements() {
        this.keyboardInstructions.style.display = 'none';
        this.resultsDisplay.style.display = 'none';
        this.gameOverDisplay.style.display = 'none';
    }
    
    showError(message) {
        this.loadingMessage.innerHTML = `
            <div style="color: #d32f2f; text-align: center;">
                <h3>Virhe</h3>
                <p>${message}</p>
                <p style="margin-top: 15px;">
                    <a href="/virheet-ja-aarimminen-luotettavuus/" style="color: #1976d2;">← Takaisin</a>
                </p>
            </div>
        `;
        this.loadingMessage.style.display = 'block';
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing PreciseReactionApp...');
    try {
        const app = new PreciseReactionApp();
        console.log('PreciseReactionApp initialized successfully');
    } catch (error) {
        console.error('Error initializing PreciseReactionApp:', error);
    }
});