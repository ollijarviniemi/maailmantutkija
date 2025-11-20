/**
 * Client-side Precise Reaction App
 * Exact replication of Flask backend behavior using client-side generation
 * CRITICAL: Maintains exact game logic - stops immediately on wrong answer
 */

class ClientPreciseReactionGenerator extends ClientShapeGenerator {
    constructor(width = 800, height = 600) {
        super(width, height);

        // Extended shape types for precise reaction
        this.extendedShapeTypes = ["circle", "square", "triangle", "pentagon", "hexagon", "plus", "star", "ring"];
        this.reactionColors = ["black", "blue", "red", "green", "orange", "purple"];

        // Color mapping for precise reaction
        this.colorMap = {
            'black': '#000000',
            'blue': '#0000FF',
            'red': '#FF0000',
            'green': '#008000',
            'orange': '#FFA500',
            'purple': '#800080'
        };
    }

    /**
     * Draw extended shapes (pentagon, hexagon, ring)
     */
    drawExtendedShape(ctx, shapeType, center, radius, color) {
        if (["circle", "square", "triangle", "star", "heart", "plus"].includes(shapeType)) {
            // Use existing shape drawing
            this.drawShape(ctx, shapeType, center, radius, color);
        } else if (shapeType === "pentagon") {
            this.drawPentagon(ctx, center, radius, color);
        } else if (shapeType === "hexagon") {
            this.drawHexagon(ctx, center, radius, color);
        } else if (shapeType === "ring") {
            this.drawRing(ctx, center, radius, color);
        }
    }

    drawPentagon(ctx, center, radius, color) {
        radius *= 0.7; // Match Python scaling
        const numSides = 5;
        const angles = [];

        // Generate angles starting from top (match Python)
        for (let i = 0; i < numSides; i++) {
            angles.push(i * 2 * Math.PI / numSides - Math.PI/2);
        }

        ctx.fillStyle = this.colorMap[color] || color;
        ctx.beginPath();

        const vertices = angles.map(angle => [
            center[0] + radius * Math.cos(angle),
            center[1] + radius * Math.sin(angle)
        ]);

        ctx.moveTo(vertices[0][0], vertices[0][1]);
        for (let i = 1; i < vertices.length; i++) {
            ctx.lineTo(vertices[i][0], vertices[i][1]);
        }
        ctx.closePath();
        ctx.fill();
    }

    drawHexagon(ctx, center, radius, color) {
        radius *= 0.7; // Match Python scaling
        const numSides = 6;
        const angles = [];

        // Generate angles
        for (let i = 0; i < numSides; i++) {
            angles.push(i * 2 * Math.PI / numSides - Math.PI/2);
        }

        ctx.fillStyle = this.colorMap[color] || color;
        ctx.beginPath();

        const vertices = angles.map(angle => [
            center[0] + radius * Math.cos(angle),
            center[1] + radius * Math.sin(angle)
        ]);

        ctx.moveTo(vertices[0][0], vertices[0][1]);
        for (let i = 1; i < vertices.length; i++) {
            ctx.lineTo(vertices[i][0], vertices[i][1]);
        }
        ctx.closePath();
        ctx.fill();
    }

    drawRing(ctx, center, radius, color) {
        radius *= 0.8; // Match Python scaling
        ctx.fillStyle = this.colorMap[color] || color;

        // Draw outer circle
        ctx.beginPath();
        ctx.arc(center[0], center[1], radius, 0, 2 * Math.PI);
        ctx.fill();

        // Draw inner circle (white)
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(center[0], center[1], radius * 0.5, 0, 2 * Math.PI);
        ctx.fill();
    }

    /**
     * Generate precise reaction image with single large centered shape
     */
    generatePreciseReactionImage(roundNumber) {
        // Get round data from sequence
        const roundSequence = this.generatePreciseReactionSequence();

        if (roundNumber < 1 || roundNumber > roundSequence.length) {
            throw new Error(`Round number must be between 1 and ${roundSequence.length}`);
        }

        const roundData = roundSequence[roundNumber - 1]; // Convert to 0-based index

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');

        // White background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw single large shape in center
        const center = [400, 300]; // Center of 800x600 image
        const radius = 120; // Large radius for single shape

        this.drawExtendedShape(ctx, roundData.shape, center, radius, roundData.color);

        return {
            success: true,
            image: canvas.toDataURL('image/png').split(',')[1], // Return base64 without prefix like Flask
            shape: roundData.shape,
            color: roundData.color,
            correct_answer: roundData.correct_answer,
            round_number: roundNumber
        };
    }

    /**
     * Generate the complete 300-round sequence based on fixed patterns
     * Exact port from Python Flask backend
     */
    generatePreciseReactionSequence() {
        const TOTAL_ROUNDS = 300;

        // B rounds: rounds where the answer is "B" (1-indexed)
        const B_ROUNDS = [2, 3, 6, 8, 13, 14, 21, 23, 24, 28, 32, 36, 43, 51, 68, 69, 71, 75, 76, 77, 78, 79, 86, 95, 99, 101, 108, 120, 136, 137, 138, 139, 148, 151, 152, 154, 174, 183, 186, 195, 202, 205, 206, 207, 208, 210, 212, 220, 224, 225, 231, 233, 256, 257, 258, 260, 266, 267, 281, 297];

        // Blue star rounds: rounds with blue stars - answer is "A" (1-indexed)
        const BLUE_STAR_ROUNDS = [4, 10, 18, 26, 34, 52, 54, 80, 88, 134, 175, 177, 190, 194, 211, 264, 278];

        const rounds = [];

        // Available shapes and colors
        const shapes = ["circle", "square", "triangle", "pentagon", "hexagon", "plus", "star", "ring"];
        const colors = ["black", "blue", "red", "green", "orange", "purple"];
        const nonBlueColors = colors.filter(c => c !== "blue");
        const nonStarShapes = shapes.filter(s => s !== "star");

        // Helper function to create round
        const createRound = (shape, color) => {
            // Rule: "B" if (blue AND not star) OR (star AND not blue)
            // Rule: "A" if (blue AND star) OR (not blue AND not star)
            const isBlue = color === "blue";
            const isStar = shape === "star";

            let correctAnswer;
            if ((isBlue && !isStar) || (isStar && !isBlue)) {
                correctAnswer = "B";
            } else {
                correctAnswer = "A";
            }

            return { shape, color, correct_answer: correctAnswer };
        };

        // Generate all rounds based on the pattern
        for (let roundNum = 1; roundNum <= TOTAL_ROUNDS; roundNum++) {
            if (BLUE_STAR_ROUNDS.includes(roundNum)) {
                // Blue star (A round) - rare special case
                rounds.push(createRound("star", "blue"));
            } else if (B_ROUNDS.includes(roundNum)) {
                if (roundNum === 2) {
                    rounds.push(createRound(nonStarShapes[Math.floor(Math.random() * nonStarShapes.length)], "blue"));
                } else if (roundNum === 3) {
                    rounds.push(createRound("star", nonBlueColors[Math.floor(Math.random() * nonBlueColors.length)]));
                } else {
                    // B round: randomly choose blue non-star OR non-blue star
                    if (Math.random() < 0.5) {
                        // Blue non-star (B round)
                        rounds.push(createRound(nonStarShapes[Math.floor(Math.random() * nonStarShapes.length)], "blue"));
                    } else {
                        // Non-blue star (B round)
                        rounds.push(createRound("star", nonBlueColors[Math.floor(Math.random() * nonBlueColors.length)]));
                    }
                }
            } else {
                // Regular A round: non-blue non-star
                rounds.push(createRound(
                    nonStarShapes[Math.floor(Math.random() * nonStarShapes.length)],
                    nonBlueColors[Math.floor(Math.random() * nonBlueColors.length)]
                ));
            }
        }

        return rounds;
    }
}

class PreciseReactionApp {
    constructor() {
        // Configuration - exactly matching Flask version
        this.TOTAL_ROUNDS = 300;

        this.currentShape = null;
        this.currentColor = null;
        this.correctAnswer = null;
        this.userResponse = null;
        this.gameState = 'setup'; // 'setup', 'loading', 'showing', 'question', 'results', 'game_over'

        this.currentRound = 0;

        // Data collection for analysis
        this.roundData = [];

        // Buffer system for pre-generating next image
        this.bufferedImage = null;
        this.isBuffering = false;

        // Initialize the client-side generator
        this.reactionGenerator = new ClientPreciseReactionGenerator(800, 600);

        this.initializeApp();
    }

    initializeApp() {
        // Get DOM elements - exact match to Flask version
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

        // Set up event listeners - exact match to Flask version
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
    }


    loadSavedData() {
        try {
            const savedData = localStorage.getItem('preciseReactionData');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.roundData = data.roundData || [];
                this.currentRound = data.currentRound || 0;
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
        try {
            const imageData = this.reactionGenerator.generatePreciseReactionImage(roundNumber);

            if (imageData.success) {
                return imageData;
            } else {
                throw new Error(imageData.error || 'Unknown error occurred');
            }
        } catch (error) {
            throw new Error(`Client-side generation failed: ${error.message}`);
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
            <div style="text-align: center; padding: 20px; font-size: 28px; color: #2e7d32; margin-bottom: 80px;">
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
                    <a href="/virheet-ja-aarimmainen-luotettavuus/" style="color: #1976d2;">← Takaisin</a>
                </p>
            </div>
        `;
        this.loadingMessage.style.display = 'block';
    }
}

// Initialize the app when the page loads - exact match to Flask version
function initializePreciseReactionApp() {
    try {
        new PreciseReactionApp();
    } catch (error) {
        console.error('Error initializing PreciseReactionApp:', error);
    }
}

// Handle both cases: DOM already loaded or still loading
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePreciseReactionApp);
} else {
    // DOM already loaded (script loaded dynamically after page load)
    initializePreciseReactionApp();
}