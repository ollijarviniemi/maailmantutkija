class YellowStarFinderApp {
    constructor() {
        this.currentShapeCount = 0;
        this.selectedTime = 1; // Will be set from pre-generated rounds
        this.hasTarget = false;
        this.userResponse = null;
        this.gameState = 'setup'; // 'setup', 'loading', 'showing', 'timing', 'question', 'results', 'statistics'
        
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
        
        // Store current round image data for showing with circles
        this.currentImageData = null;
        
        // Variance reduction system: pre-generated balanced rounds
        this.roundQueue = [];
        this.currentRoundIndex = 0;
        
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
        
        // Load saved data from localStorage
        this.loadSavedData();
        
        // Set up event listeners
        const startBtn = document.getElementById('start-round-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startNewRound());
        }
        document.getElementById('yes-btn').addEventListener('click', () => this.handleResponse(true));
        document.getElementById('no-btn').addEventListener('click', () => this.handleResponse(false));
        document.getElementById('next-round-btn').addEventListener('click', () => this.startNewRound());
        document.getElementById('show-stats-btn').addEventListener('click', () => this.showStatistics());
        document.getElementById('inline-stats-btn').addEventListener('click', () => this.showStatistics());
        document.getElementById('back-to-game-btn').addEventListener('click', () => this.backToGame());
        document.getElementById('reset-data-btn').addEventListener('click', () => this.resetAllData());
        
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
    
    createReferenceImage() {
        // Draw a yellow star on the reference canvas matching the backend exactly
        this.referenceCtx.clearRect(0, 0, this.referenceCanvas.width, this.referenceCanvas.height);
        this.referenceCtx.fillStyle = 'white';
        this.referenceCtx.fillRect(0, 0, this.referenceCanvas.width, this.referenceCanvas.height);
        
        // Draw a yellow star in the center using the same parameters as backend
        const centerX = this.referenceCanvas.width / 2;
        const centerY = this.referenceCanvas.height / 2;
        const baseRadius = 25; // Larger size for visibility
        
        // Use the exact same color as the backend (#DAA520 = goldenrod)
        this.referenceCtx.fillStyle = '#DAA520';
        this.referenceCtx.strokeStyle = '#DAA520';
        this.referenceCtx.lineWidth = 0; // No stroke, just fill like backend
        
        this.drawBackendStar(this.referenceCtx, centerX, centerY, baseRadius);
    }
    
    drawBackendStar(ctx, x, y, baseRadius) {
        // Match the exact backend star drawing algorithm
        // From backend: radius *= 0.7, then outer_radius = radius, inner_radius = radius * 0.4
        const radius = baseRadius * 0.7;
        const outerRadius = radius;
        const innerRadius = radius * 0.4;
        
        // Calculate the vertices of the star (10 points alternating between outer and inner)
        const numPoints = 5;
        const vertices = [];
        
        for (let i = 0; i < numPoints * 2; i++) {
            // Match backend angle calculation: (i + 0.5) * Math.PI / numPoints
            // Subtract π/2 to rotate the star so it points upward, then add 54 degrees (3π/10 radians)
            const angle = (i + 0.5) * Math.PI / numPoints - Math.PI / 2 + 3 * Math.PI / 10;
            // Alternate between outer and inner radius
            const r = i % 2 === 0 ? outerRadius : innerRadius;
            vertices.push([
                x + r * Math.cos(angle),
                y + r * Math.sin(angle)
            ]);
        }
        
        // Draw the star polygon
        ctx.beginPath();
        ctx.moveTo(vertices[0][0], vertices[0][1]);
        for (let i = 1; i < vertices.length; i++) {
            ctx.lineTo(vertices[i][0], vertices[i][1]);
        }
        ctx.closePath();
        ctx.fill();
    }
    
    drawStar(ctx, x, y, size) {
        // Keep the old method for backward compatibility, but use the backend method for reference
        this.drawBackendStar(ctx, x, y, size);
    }
    
    loadSavedData() {
        try {
            const savedData = localStorage.getItem('yellowStarFinderTimeData');
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
            localStorage.setItem('yellowStarFinderTimeData', JSON.stringify(dataToSave));
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
    
    // Variance reduction functions
    generateBalancedRounds() {
        // Generate 18 rounds: 6 of each time mode (3s, 6s, 15s), with 4 that have a star and 2 that don't
        const times = [3, 6, 15];
        const rounds = [];
        
        // Create rounds for each time duration
        for (const time of times) {
            // 4 rounds with star
            for (let i = 0; i < 4; i++) {
                rounds.push({ time: time, hasTarget: true });
            }
            // 2 rounds without star
            for (let i = 0; i < 2; i++) {
                rounds.push({ time: time, hasTarget: false });
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
            console.log('Generated new batch of 18 balanced rounds');
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
        this.userResponse = null;
        
        // Get balanced round parameters using variance reduction
        const roundParams = this.getNextRoundParameters();
        this.selectedTime = roundParams.time;
        const targetHasStar = roundParams.hasTarget;
        
        console.log(`Variance reduction: ${this.selectedTime}s, target has star: ${targetHasStar}`);
        
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
            
            // Check if we have a buffered image with the right target state
            if (this.bufferedImage && this.bufferedImage.hasTarget === targetHasStar) {
                // Use buffered image immediately
                this.hasTarget = this.bufferedImage.hasTarget;
                this.currentImageData = this.bufferedImage;
                
                // Display the buffered image
                await this.displayBase64Image(this.bufferedImage.imageData);
                
                console.log(`Using buffered image (target: ${this.bufferedImage.hasTarget})`);
                
                // Clear the buffer
                this.bufferedImage = null;
            } else {
                // No suitable buffered image, generate new one with specific target requirement
                imageData = await this.fetchImageWithTarget(targetHasStar);
                
                if (imageData) {
                    // Store the correct answer and image data
                    this.hasTarget = imageData.has_target;
                    this.currentImageData = {
                        imageData: imageData.image,
                        hasTarget: imageData.has_target,
                        starPositions: imageData.star_positions || []
                    };
                    
                    // Display the image
                    await this.displayBase64Image(imageData.image);
                    
                    console.log(`Generated new image (target: ${imageData.has_target})`);
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
        const startTime = performance.now();
        
        const response = await fetch(`${this.backendUrl}/api/generate-star-finder-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({})
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
    
    async fetchImageWithTarget(shouldHaveTarget) {
        // For now, use the regular endpoint and keep generating until we get the desired target state
        // This is not the most efficient, but works with the existing backend
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            const imageData = await this.fetchNewImage();
            if (imageData && imageData.has_target === shouldHaveTarget) {
                return imageData;
            }
            attempts++;
        }
        
        // If we can't get the exact target state after maxAttempts, just return the last image
        // This maintains the 67% probability but may not be perfectly balanced
        return await this.fetchNewImage();
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
                this.hideImageAndStartQuestion();
            }
        }, 1000);
    }
    
    hideImageAndStartQuestion() {
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
        
        // Start question
        this.startQuestion();
    }
    
    startQuestion() {
        this.gameState = 'question';
        
        this.questionText.style.display = 'block';
        this.responseButtons.style.display = 'flex';
    }
    
    handleResponse(response) {
        this.userResponse = response;
        this.gameState = 'results';
        
        // Hide question elements
        this.questionText.style.display = 'none';
        this.responseButtons.style.display = 'none';
        
        // Show results
        this.showResults();
        
        // Store round data
        this.storeRoundData();
        
        // Show next round button
        this.nextRoundBtn.style.display = 'block';
        
        // Show inline stats button for 10+ rounds (only one button)
        if (this.roundData.length >= 10) {
            const inlineStatsBtn = document.getElementById('inline-stats-btn');
            if (inlineStatsBtn) {
                inlineStatsBtn.style.display = 'block';
            }
        }
        
        // Start buffering next image
        this.startBuffering();
    }
    
    async showResults() {
        const isCorrect = this.userResponse === this.hasTarget;
        
        let resultMessage = '';
        if (this.hasTarget) {
            resultMessage = this.userResponse ? 
                'Oikein! Kuvassa oli kultainen tähti.' : 
                'Väärin. Kuvassa oli kultainen tähti.';
        } else {
            resultMessage = this.userResponse ? 
                'Väärin. Kuvassa ei ollut kultaista tähteä.' : 
                'Oikein! Kuvassa ei ollut kultaista tähteä.';
        }
        
        this.resultsText.textContent = resultMessage;
        this.resultsDisplay.style.display = 'block';
        
        // Show the image again with red circles around yellow stars
        if (this.currentImageData) {
            await this.displayImageWithAnnotations();
        }
    }
    
    async displayImageWithAnnotations() {
        // First, redisplay the original image
        await this.displayBase64Image(this.currentImageData.imageData);
        
        // If there was a target (yellow star), draw red circles around yellow stars
        if (this.hasTarget) {
            // Since we don't have exact star positions from the backend,
            // we'll need to implement a simple detection method
            // For now, let's add a placeholder circle in a likely location
            this.drawRedCirclesAroundYellowStars();
        }
    }
    
    drawRedCirclesAroundYellowStars() {
        // Use exact star positions from backend instead of pixel detection
        if (!this.currentImageData || !this.currentImageData.starPositions) {
            console.log('No star position data available');
            return;
        }
        
        this.ctx.strokeStyle = '#FF0000'; // Red color
        this.ctx.lineWidth = 8;
        
        // Draw circles around each yellow star using exact coordinates
        this.currentImageData.starPositions.forEach(star => {
            // Convert backend coordinates to canvas coordinates
            // Backend uses 800x600 image dimensions, canvas might be scaled
            const scaleX = this.canvas.width / 800;  // Backend image width
            const scaleY = this.canvas.height / 600; // Backend image height
            
            const canvasX = star.x * scaleX;
            // Fix Y-axis flip: matplotlib has origin at bottom-left, canvas has origin at top-left
            const canvasY = (600 - star.y) * scaleY;
            const canvasRadius = star.radius * Math.min(scaleX, scaleY) * 3; // Slightly larger circle
            
            console.log(`Drawing red circle at (${canvasX}, ${canvasY}) with radius ${canvasRadius} (backend: ${star.x}, ${star.y})`);
            
            this.ctx.beginPath();
            this.ctx.arc(canvasX, canvasY, canvasRadius, 0, 2 * Math.PI);
            this.ctx.stroke();
        });
    }
    
    clusterYellowPixels(pixels, maxDistance) {
        const clusters = [];
        const used = new Set();
        
        pixels.forEach((pixel, index) => {
            if (used.has(index)) return;
            
            const cluster = [pixel];
            used.add(index);
            
            // Find nearby pixels
            pixels.forEach((otherPixel, otherIndex) => {
                if (used.has(otherIndex)) return;
                
                const distance = Math.sqrt(
                    Math.pow(pixel.x - otherPixel.x, 2) + 
                    Math.pow(pixel.y - otherPixel.y, 2)
                );
                
                if (distance <= maxDistance) {
                    cluster.push(otherPixel);
                    used.add(otherIndex);
                }
            });
            
            clusters.push(cluster);
        });
        
        return clusters;
    }
    
    storeRoundData() {
        const isCorrect = this.userResponse === this.hasTarget;
        
        const roundData = {
            selectedTime: this.selectedTime,
            hasTarget: this.hasTarget,
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
        
        this.isBuffering = true;
        
        try {
            const imageData = await this.fetchNewImage();
            
            if (imageData) {
                // Store in buffer with star positions
                this.bufferedImage = {
                    imageData: imageData.image,
                    hasTarget: imageData.has_target,
                    starPositions: imageData.star_positions || []
                };
                
                console.log(`Buffered next image (target: ${imageData.has_target})`);
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
        
        // Hide the reference star illustration on statistics page
        const referenceContainer = document.getElementById('reference-container');
        if (referenceContainer) {
            referenceContainer.style.display = 'none';
        }
        
        // Hide the round counter on statistics page
        this.roundCounter.classList.remove('visible');
        
        // Hide the inline statistics button
        const inlineStatsBtn = document.getElementById('inline-stats-btn');
        if (inlineStatsBtn) {
            inlineStatsBtn.style.display = 'none';
        }
        
        // Hide the next round button on statistics page
        this.nextRoundBtn.style.display = 'none';
        
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
                            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5;">Oikein</th>
                            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5;">Tarkkuus</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">3 sekuntia</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['3'].rounds}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['3'].correct}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['3'].accuracy}%</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">6 sekuntia</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['6'].rounds}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['6'].correct}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['6'].accuracy}%</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">15 sekuntia</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['15'].rounds}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['15'].correct}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.byTime['15'].accuracy}%</td>
                        </tr>
                        <tr style="font-weight: bold; background-color: #f9f9f9;">
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">Kaikki</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.roundsPlayed}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.totalCorrect}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.overallAccuracy}%</td>
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
                        <th>Tähti</th>
                        <th>Vastaus</th>
                        <th>Tulos</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        this.roundData.forEach((round, index) => {
            const targetText = round.hasTarget ? 'Kyllä' : 'Ei';
            const responseText = round.userResponse ? 'Kyllä' : 'Ei';
            const resultText = round.isCorrect ? 'Oikein' : 'Väärin';
            
            statsHtml += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${round.selectedTime}s</td>
                    <td>${targetText}</td>
                    <td>${responseText}</td>
                    <td style="color: ${round.isCorrect ? '#155724' : '#721c24'}">${resultText}</td>
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
                totalCorrect: 0,
                overallAccuracy: 0,
                byTime: {
                    '3': { rounds: 0, correct: 0, accuracy: 0 },
                    '6': { rounds: 0, correct: 0, accuracy: 0 },
                    '15': { rounds: 0, correct: 0, accuracy: 0 }
                }
            };
        }
        
        let totalCorrect = 0;
        
        // Group by time
        const byTime = {
            '3': { rounds: 0, correct: 0 },
            '6': { rounds: 0, correct: 0 },
            '15': { rounds: 0, correct: 0 }
        };
        
        this.roundData.forEach(round => {
            if (round.isCorrect) {
                totalCorrect++;
            }
            
            const timeKey = round.selectedTime.toString();
            if (byTime[timeKey]) {
                byTime[timeKey].rounds++;
                if (round.isCorrect) {
                    byTime[timeKey].correct++;
                }
            }
        });
        
        // Calculate percentages
        const overallAccuracy = Math.round((totalCorrect / this.roundData.length) * 100);
        
        const timeStats = {};
        Object.keys(byTime).forEach(time => {
            const data = byTime[time];
            const accuracy = data.rounds > 0 ? Math.round((data.correct / data.rounds) * 100) : 0;
            timeStats[time] = { 
                rounds: data.rounds, 
                correct: data.correct, 
                accuracy: accuracy 
            };
        });
        
        return {
            roundsPlayed: this.roundData.length,
            totalCorrect,
            overallAccuracy,
            byTime: timeStats
        };
    }
    
    backToGame() {
        // Start a new round immediately instead of showing previous round info
        this.statisticsDisplay.style.display = 'none';
        
        // Show the canvas again
        this.canvas.style.display = 'block';
        
        // Show the reference star illustration again
        const referenceContainer = document.getElementById('reference-container');
        if (referenceContainer) {
            referenceContainer.style.display = 'block';
        }
        
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
            localStorage.removeItem('yellowStarFinderTimeData');
            
            // Reset UI state completely
            this.hideAllQuestionElements();
            this.statisticsDisplay.style.display = 'none';
            
            // Ensure canvas is visible
            this.canvas.style.display = 'block';
            
            // Reset round counter visibility
            this.roundCounter.classList.remove('visible');
            
            // Reset game state
            this.gameState = 'setup';
            this.userResponse = null;
            
            // Show start button
            this.startRoundBtn.style.display = 'block';
            
            console.log('All data has been reset');
        }
    }
    
    hideAllQuestionElements() {
        this.questionText.style.display = 'none';
        this.responseButtons.style.display = 'none';
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
    console.log('DOM loaded, initializing YellowStarFinderApp...');
    try {
        const app = new YellowStarFinderApp();
        console.log('YellowStarFinderApp initialized successfully');
    } catch (error) {
        console.error('Error initializing YellowStarFinderApp:', error);
    }
});
