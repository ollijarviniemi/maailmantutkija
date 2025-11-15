class MemoryGameApp {
    constructor() {
        this.currentDigitSequence = [];
        this.currentDigitCount = 6; // Will be set from pre-generated rounds
        this.selectedTime = 3; // Will be set from pre-generated rounds
        this.userResponse = [];
        this.gameState = 'setup'; // 'setup', 'showing', 'timing', 'input', 'results', 'statistics'
        
        this.currentRound = 0;
        this.timerInterval = null;
        this.currentCountdown = 0;
        
        // Data collection for analysis
        this.roundData = [];
        
        // Variance reduction system: pre-generated balanced rounds
        this.roundQueue = [];
        this.currentRoundIndex = 0;
        
        this.initializeApp();
    }
    
    initializeApp() {
        // Get DOM elements
        this.digitsDisplay = document.getElementById('digits-display');
        this.digitsHiddenMessage = document.getElementById('digits-hidden-message');
        this.roundCounter = document.getElementById('round-counter');
        this.roundNumberElement = document.getElementById('round-number');
        this.questionContainer = document.getElementById('question-container');
        this.questionText = document.getElementById('question-text');
        this.inputBoxesContainer = document.getElementById('input-boxes-container');
        this.submitResponseBtn = document.getElementById('submit-response-btn');
        this.nextRoundBtn = document.getElementById('next-round-btn');
        this.statisticsDisplay = document.getElementById('statistics-display');
        this.statisticsContent = document.getElementById('statistics-content');
        this.backToGameBtn = document.getElementById('back-to-game-btn');
        this.startRoundBtn = document.getElementById('start-round-btn');
        
        // Get all digit input boxes
        this.digitInputs = document.querySelectorAll('.digit-input');
        
        // Load saved data from localStorage
        this.loadSavedData();
        
        // Set up event listeners
        this.startRoundBtn.addEventListener('click', () => this.startNewRound());
        this.submitResponseBtn.addEventListener('click', () => this.handleResponse());
        this.nextRoundBtn.addEventListener('click', () => this.startNewRound());
        document.getElementById('inline-stats-btn').addEventListener('click', () => this.showStatistics());
        this.backToGameBtn.addEventListener('click', () => this.backToGame());
        document.getElementById('reset-data-btn').addEventListener('click', () => this.resetAllData());
        
        // Add global Enter key listener for moving to next round after results
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.gameState === 'results') {
                this.startNewRound();
            }
        });
        
        // Set up input box event listeners
        this.setupInputBoxListeners();
        
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
    
    setupInputBoxListeners() {
        this.digitInputs.forEach((input, index) => {
            // Only allow digits
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                if (!/^\d$/.test(value)) {
                    e.target.value = '';
                    return;
                }
                
                // Auto-advance to next box
                if (value && index < this.digitInputs.length - 1) {
                    const nextIndex = index + 1;
                    if (nextIndex < this.currentDigitCount) {
                        this.digitInputs[nextIndex].focus();
                    }
                }
                
                this.checkInputComplete();
            });
            
            // Handle backspace and Enter key
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    this.digitInputs[index - 1].focus();
                } else if (e.key === 'Enter') {
                    // Check if all required inputs are filled and submit if so
                    let allFilled = true;
                    for (let i = 0; i < this.currentDigitCount; i++) {
                        if (!this.digitInputs[i].value) {
                            allFilled = false;
                            break;
                        }
                    }
                    if (allFilled && this.gameState === 'input') {
                        e.preventDefault();
                        e.stopPropagation();
                        this.handleResponse();
                    }
                }
            });
            
            // Prevent non-digit characters
            input.addEventListener('keypress', (e) => {
                if (!/\d/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                }
            });
        });
    }
    
    checkInputComplete() {
        // Check if all required inputs are filled
        let allFilled = true;
        for (let i = 0; i < this.currentDigitCount; i++) {
            if (!this.digitInputs[i].value) {
                allFilled = false;
                break;
            }
        }
        
        this.submitResponseBtn.style.display = allFilled ? 'block' : 'none';
    }
    
    loadSavedData() {
        try {
            const savedData = localStorage.getItem('memoryGameData');
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
            localStorage.setItem('memoryGameData', JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }
    
    // Variance reduction functions
    generateBalancedRounds() {
        // Generate 9 rounds: 3 digit counts × 3 times = 9 combinations
        const times = [3, 6, 15];
        const digitCounts = [6, 8, 10];
        const rounds = [];
        
        // Create one round for each time-digitCount combination
        for (const time of times) {
            for (const digitCount of digitCounts) {
                rounds.push({
                    time: time,
                    digitCount: digitCount
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
    
    startNewRound() {
        this.gameState = 'showing';
        this.userResponse = [];
        
        // Get balanced round parameters using variance reduction
        const roundParams = this.getNextRoundParameters();
        this.selectedTime = roundParams.time;
        this.currentDigitCount = roundParams.digitCount;
        
        console.log(`Variance reduction: ${this.selectedTime}s, ${this.currentDigitCount} digits`);
        
        // Generate digit sequence
        this.currentDigitSequence = this.generateDigitSequence(this.currentDigitCount);
        
        // Increment round counter
        this.currentRound++;
        this.updateRoundCounter();
        
        // Reset UI completely
        this.hideAllQuestionElements();
        this.digitsDisplay.classList.remove('visible');
        this.digitsHiddenMessage.style.display = 'none';
        this.nextRoundBtn.style.display = 'none';
        this.startRoundBtn.style.display = 'none';
        this.submitResponseBtn.style.display = 'none';
        
        // Hide the inline statistics button
        const inlineStatsBtn = document.getElementById('inline-stats-btn');
        if (inlineStatsBtn) {
            inlineStatsBtn.style.display = 'none';
        }
        
        // Reset input boxes
        this.resetInputBoxes();
        
        // Show digits and start timer
        this.showDigits();
        this.startDisplayTimer();
    }
    
    generateDigitSequence(count) {
        const digits = [];
        for (let i = 0; i < count; i++) {
            digits.push(Math.floor(Math.random() * 10));
        }
        return digits;
    }
    
    resetInputBoxes() {
        this.digitInputs.forEach((input, index) => {
            input.value = '';
            // Remove color coding classes from previous round
            input.classList.remove('digit-correct', 'digit-incorrect');
            if (index < this.currentDigitCount) {
                input.disabled = false;
                input.style.display = 'inline-block';
            } else {
                input.disabled = true;
                input.style.display = 'none'; // Hide unused input boxes
            }
        });
    }
    
    updateRoundCounter() {
        // Show the number of completed rounds + 1 (current round being played)
        this.roundNumberElement.textContent = this.roundData.length + 1;
        this.roundCounter.classList.add('visible');
    }
    
    showDigits() {
        // Display the digit sequence
        this.digitsDisplay.textContent = this.currentDigitSequence.join(' ');
        this.digitsDisplay.classList.add('visible');

        // Show input boxes but keep them disabled (grayed out)
        this.inputBoxesContainer.style.display = 'flex';
        for (let i = 0; i < this.currentDigitCount; i++) {
            this.digitInputs[i].disabled = true;
        }

        // Hide question text during digit display
        this.questionText.style.display = 'none';
    }
    
    startDisplayTimer() {
        this.timerInterval = setTimeout(() => {
            this.hideDigitsAndStartInput();
        }, this.selectedTime * 1000);
    }
    
    hideDigitsAndStartInput() {
        // Hide digits
        this.digitsDisplay.classList.remove('visible');
        this.digitsHiddenMessage.style.display = 'block';

        // Add 500ms delay before unlocking input boxes
        setTimeout(() => {
            this.startInputPhase();
        }, 500);
    }
    
    startInputPhase() {
        this.gameState = 'input';

        // Show question text
        this.questionText.style.display = 'block';

        // Input boxes are already visible, just enable them
        for (let i = 0; i < this.currentDigitCount; i++) {
            this.digitInputs[i].disabled = false;
        }

        // Focus on first input
        this.digitInputs[0].focus();
    }
    
    handleResponse() {
        // Collect user input
        this.userResponse = [];
        for (let i = 0; i < this.currentDigitCount; i++) {
            this.userResponse.push(parseInt(this.digitInputs[i].value));
        }
        
        this.gameState = 'results';
        
        // Hide submit button (question text already hidden)
        this.submitResponseBtn.style.display = 'none';
        
        // Show results
        this.showResults();
        
        // Store round data
        this.storeRoundData();
        
        // Show next round button
        this.nextRoundBtn.style.display = 'block';
        
        // Show inline stats button for 10+ rounds
        if (this.roundData.length >= 10) {
            const inlineStatsBtn = document.getElementById('inline-stats-btn');
            if (inlineStatsBtn) {
                inlineStatsBtn.style.display = 'block';
            }
        }
    }
    
    showResults() {
        // Show original sequence in the same place it appeared during the game
        this.digitsDisplay.textContent = this.currentDigitSequence.join(' ');
        this.digitsDisplay.classList.add('visible');
        this.digitsHiddenMessage.style.display = 'none';
        
        // Color-code the existing input boxes without moving them
        for (let i = 0; i < this.currentDigitCount; i++) {
            const inputBox = this.digitInputs[i];
            inputBox.disabled = true; // Make them read-only
            
            // Add color coding
            if (this.userResponse[i] === this.currentDigitSequence[i]) {
                inputBox.classList.add('digit-correct');
            } else {
                inputBox.classList.add('digit-incorrect');
            }
        }
    }
    
    storeRoundData() {
        // Calculate accuracy
        let correctCount = 0;
        for (let i = 0; i < this.currentDigitCount; i++) {
            if (this.userResponse[i] === this.currentDigitSequence[i]) {
                correctCount++;
            }
        }
        
        const accuracy = correctCount / this.currentDigitCount;
        
        const roundData = {
            digitCount: this.currentDigitCount,
            selectedTime: this.selectedTime,
            originalSequence: [...this.currentDigitSequence],
            userResponse: [...this.userResponse],
            correctCount: correctCount,
            accuracy: accuracy,
            timestamp: new Date().toISOString()
        };
        
        this.roundData.push(roundData);
        
        // Save data to localStorage
        this.saveData();
    }
    
    showStatistics() {
        this.gameState = 'statistics';

        // Hide game elements
        this.hideAllQuestionElements();
        this.digitsDisplay.classList.remove('visible');
        this.digitsHiddenMessage.style.display = 'none';

        // Hide the round counter on statistics page
        this.roundCounter.classList.remove('visible');

        // Hide the inline statistics button
        const inlineStatsBtn = document.getElementById('inline-stats-btn');
        if (inlineStatsBtn) {
            inlineStatsBtn.style.display = 'none';
        }

        // Hide the next round button on statistics page
        this.nextRoundBtn.style.display = 'none';

        // Hide the back button container to prevent overlap
        const backButtonContainer = document.getElementById('back-button-container');
        if (backButtonContainer) {
            backButtonContainer.style.display = 'none';
        }
        
        // Calculate statistics
        const stats = this.calculateStatistics();
        
        // Create statistics HTML with left-aligned text
        let statsHtml = `
            <div style="text-align: left;">
                <h1>Tilastot</h1>
                <br>
                <h3>Tulokset katseluajan mukaan:</h3>
                <table style="margin: 10px auto; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5;">Aika</th>
                            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5;">Kierrokset</th>
                            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5;">Kaikki oikein</th>
                            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5;">Osuus numeroista oikein</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">3 sekuntia</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['3'].rounds}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['3'].perfectRate}%</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['3'].digitAccuracy}%</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">6 sekuntia</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['6'].rounds}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['6'].perfectRate}%</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['6'].digitAccuracy}%</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">15 sekuntia</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['15'].rounds}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['15'].perfectRate}%</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['15'].digitAccuracy}%</td>
                        </tr>
                    </tbody>
                </table>
                
                <h3>Tulokset numeroiden määrän mukaan:</h3>
                <table style="margin: 10px auto; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5;">Numeroita</th>
                            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5;">Kierrokset</th>
                            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5;">Kaikki oikein</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">6 numeroa</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byDigitCount['6'].rounds}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byDigitCount['6'].perfectRate}%</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">8 numeroa</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byDigitCount['8'].rounds}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byDigitCount['8'].perfectRate}%</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">10 numeroa</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byDigitCount['10'].rounds}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byDigitCount['10'].perfectRate}%</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <h3>Kaikki kierrokset:</h3>
            <table style="margin: 20px auto;">
                <thead>
                    <tr>
                        <th>Kierros</th>
                        <th>Aika</th>
                        <th>Numeroita</th>
                        <th>Oikein</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        this.roundData.forEach((round, index) => {
            statsHtml += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${round.selectedTime}s</td>
                    <td>${round.digitCount}</td>
                    <td>${round.correctCount}</td>
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
                overallAccuracy: 0,
                byTime: {
                    '3': { rounds: 0, accuracy: 0 },
                    '6': { rounds: 0, accuracy: 0 },
                    '15': { rounds: 0, accuracy: 0 }
                },
                byDigitCount: {
                    '6': { rounds: 0, accuracy: 0 },
                    '8': { rounds: 0, accuracy: 0 },
                    '10': { rounds: 0, accuracy: 0 }
                }
            };
        }
        
        let totalAccuracy = 0;
        let totalPerfectRounds = 0;
        
        // Group by time
        const byTime = {
            '3': { rounds: 0, totalAccuracy: 0, perfectRounds: 0 },
            '6': { rounds: 0, totalAccuracy: 0, perfectRounds: 0 },
            '15': { rounds: 0, totalAccuracy: 0, perfectRounds: 0 }
        };
        
        // Group by digit count
        const byDigitCount = {
            '6': { rounds: 0, perfectRounds: 0 },
            '8': { rounds: 0, perfectRounds: 0 },
            '10': { rounds: 0, perfectRounds: 0 }
        };
        
        this.roundData.forEach(round => {
            totalAccuracy += round.accuracy;
            const isPerfect = round.accuracy === 1.0; // All digits correct
            if (isPerfect) totalPerfectRounds++;
            
            const timeKey = round.selectedTime.toString();
            if (byTime[timeKey]) {
                byTime[timeKey].rounds++;
                byTime[timeKey].totalAccuracy += round.accuracy;
                if (isPerfect) byTime[timeKey].perfectRounds++;
            }
            
            const digitKey = round.digitCount.toString();
            if (byDigitCount[digitKey]) {
                byDigitCount[digitKey].rounds++;
                if (isPerfect) byDigitCount[digitKey].perfectRounds++;
            }
        });
        
        // Calculate percentages
        const overallPerfectRate = this.roundData.length > 0 ? (totalPerfectRounds / this.roundData.length * 100).toFixed(1) : 0;
        const overallDigitAccuracy = this.roundData.length > 0 ? (totalAccuracy / this.roundData.length * 100).toFixed(1) : 0;
        
        const timeStats = {};
        Object.keys(byTime).forEach(time => {
            const data = byTime[time];
            const perfectRate = data.rounds > 0 ? (data.perfectRounds / data.rounds * 100).toFixed(1) : 0;
            const digitAccuracy = data.rounds > 0 ? (data.totalAccuracy / data.rounds * 100).toFixed(1) : 0;
            timeStats[time] = { 
                rounds: data.rounds, 
                perfectRate: perfectRate,
                digitAccuracy: digitAccuracy
            };
        });
        
        const digitStats = {};
        Object.keys(byDigitCount).forEach(digits => {
            const data = byDigitCount[digits];
            const perfectRate = data.rounds > 0 ? (data.perfectRounds / data.rounds * 100).toFixed(1) : 0;
            digitStats[digits] = { 
                rounds: data.rounds, 
                perfectRate: perfectRate
            };
        });
        
        return {
            roundsPlayed: this.roundData.length,
            overallPerfectRate,
            overallDigitAccuracy,
            byTime: timeStats,
            byDigitCount: digitStats
        };
    }
    
    backToGame() {
        // Start a new round immediately instead of showing previous round info
        this.statisticsDisplay.style.display = 'none';

        // Restore round counter visibility
        this.roundCounter.classList.add('visible');

        // Show start button again
        this.startRoundBtn.style.display = 'block';

        // Restore the back button container
        const backButtonContainer = document.getElementById('back-button-container');
        if (backButtonContainer) {
            backButtonContainer.style.display = 'block';
        }

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
            
            // Clear localStorage
            localStorage.removeItem('memoryGameData');
            
            // Reset UI state completely
            this.hideAllQuestionElements();
            this.statisticsDisplay.style.display = 'none';
            this.digitsDisplay.classList.remove('visible');
            this.digitsHiddenMessage.style.display = 'none';
            
            // Reset round counter visibility
            this.roundCounter.classList.remove('visible');
            
            // Reset game state
            this.gameState = 'setup';
            this.userResponse = [];
            
            // Show start button
            this.startRoundBtn.style.display = 'block';

            // Restore the back button container
            const backButtonContainer = document.getElementById('back-button-container');
            if (backButtonContainer) {
                backButtonContainer.style.display = 'block';
            }

            console.log('All data has been reset');
        }
    }
    
    hideAllQuestionElements() {
        this.questionText.style.display = 'none';
        this.inputBoxesContainer.style.display = 'none';
        this.submitResponseBtn.style.display = 'none';
        this.statisticsDisplay.style.display = 'none';
    }
}

// Initialize the app when the page loads or immediately if already loaded
function initializeMemoryGameApp() {
    console.log('Initializing MemoryGameApp...');
    try {
        const app = new MemoryGameApp();
        console.log('MemoryGameApp initialized successfully');
    } catch (error) {
        console.error('Error initializing MemoryGameApp:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMemoryGameApp);
} else {
    // DOM already loaded (script loaded dynamically after page load)
    initializeMemoryGameApp();
}