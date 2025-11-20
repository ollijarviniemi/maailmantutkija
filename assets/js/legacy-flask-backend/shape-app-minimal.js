class MinimalShapeApp {
    constructor() {
        this.currentShapeCount = 0;
        this.gameState = 'loading'; // 'loading', 'showing', 'answered'
        // Determine backend URL based on environment
        const currentHost = window.location.hostname;
        if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
            this.backendUrl = 'http://localhost:5000';
        } else {
            this.backendUrl = 'https://maailmantutkija-backend.up.railway.app';
        }
        
        // Buffer system for pre-generating next image
        this.bufferedImage = null; // {imageData: string, shapeCount: number, metadata: object}
        this.isBuffering = false;
        
        this.initializeApp();
    }
    
    initializeApp() {
        // Get DOM elements
        this.canvas = document.getElementById('shape-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.loadingMessage = document.getElementById('loading-message');
        this.answerDisplay = document.getElementById('answer-display');
        this.correctAnswerSpan = document.getElementById('correct-answer');
        
        // Set up event listeners
        this.canvas.addEventListener('click', () => this.handleCanvasClick());
        document.getElementById('min-shapes').addEventListener('change', () => this.validateInputs());
        document.getElementById('max-shapes').addEventListener('change', () => this.validateInputs());
        
        // Check backend and start
        this.checkBackendAndStart();
    }
    
    async checkBackendAndStart() {
        try {
            const response = await fetch(`${this.backendUrl}/api/health`);
            if (response.ok) {
                console.log('Backend is available');
                this.generateNewImage();
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
                    <a href="/maarien-arvioiminen/muodot/" style="color: #1976d2;">← Takaisin PDF-tiedostoihin</a>
                </p>
            </div>
        `;
    }
    
    validateInputs() {
        const minInput = document.getElementById('min-shapes');
        const maxInput = document.getElementById('max-shapes');
        let minShapes = parseInt(minInput.value);
        let maxShapes = parseInt(maxInput.value);
        
        // Enforce maximum limit of 1000
        if (minShapes > 1000) {
            minShapes = 1000;
            minInput.value = 1000;
        }
        if (maxShapes > 1000) {
            maxShapes = 1000;
            maxInput.value = 1000;
        }
        
        // Enforce minimum limit of 1
        if (minShapes < 1) {
            minShapes = 1;
            minInput.value = 1;
        }
        if (maxShapes < 1) {
            maxShapes = 1;
            maxInput.value = 1;
        }
        
        // Ensure min <= max
        if (minShapes > maxShapes) {
            maxInput.value = minShapes;
        }
        
        // Clear buffer when parameters change since it might not match new range
        this.bufferedImage = null;
        
        // If we're in showing state and inputs changed, generate new image
        if (this.gameState === 'showing') {
            this.generateNewImage();
        }
    }
    
    async generateNewImage() {
        this.gameState = 'loading';
        // Hide answer immediately by disabling transition
        const answerText = document.getElementById('answer-text');
        answerText.style.transition = 'none'; // Disable transition
        answerText.classList.remove('visible');
        answerText.style.opacity = '0'; // Force immediate hide
        
        // Force a reflow to ensure the changes take effect immediately
        answerText.offsetHeight;
        
        // Re-enable transition for future animations
        answerText.style.transition = '';
        
        // Check if we have a buffered image
        if (this.bufferedImage) {
            // Use buffered image immediately
            this.currentShapeCount = this.bufferedImage.shapeCount;
            
            // Display the buffered image
            await this.displayBase64Image(this.bufferedImage.imageData);
            
            // Update answer text AFTER image is displayed and answer is hidden
            if (this.bufferedImage.shapeCount > 1) {
                this.correctAnswerSpan.textContent = this.bufferedImage.shapeCount + " muotoa";
            } else {
                this.correctAnswerSpan.textContent = "1 muoto";
            }
            
            // Clear the buffer to free memory
            this.bufferedImage = null;
            
            // Hide loading message and show image
            this.loadingMessage.style.display = 'none';
            this.gameState = 'showing';
            
            console.log(`Displayed buffered image with ${this.currentShapeCount} shapes`);
            
            // Start buffering the next image
            this.startBuffering();
        } else {
            // No buffered image, generate normally
            this.loadingMessage.style.display = 'block';
            
            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#f8f9fa';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            try {
                const imageData = await this.fetchNewImage();
                
                if (imageData) {
                    // Store the correct answer
                    this.currentShapeCount = imageData.num_shapes;
                    if (imageData.num_shapes > 1) {
                        this.correctAnswerSpan.textContent = imageData.num_shapes + " muotoa";
                    } else {
                        this.correctAnswerSpan.textContent = "1 muoto";
                    }
                    
                    // Display the image
                    await this.displayBase64Image(imageData.image);
                    
                    // Hide loading message and show image
                    this.loadingMessage.style.display = 'none';
                    this.gameState = 'showing';
                    
                    console.log(`Generated image with ${imageData.num_shapes} ${imageData.shape_type}s (${imageData.color}, ${imageData.distribution})`);
                    
                    // Start buffering the next image
                    this.startBuffering();
                }
                
            } catch (error) {
                console.error('Error generating image:', error);
                this.showError('Virhe kuvan generoinnissa: ' + error.message);
            }
        }
    }
    
    async fetchNewImage() {
        // Get shape count range
        const minShapes = parseInt(document.getElementById('min-shapes').value);
        const maxShapes = parseInt(document.getElementById('max-shapes').value);
        
        // Make request to backend
        const response = await fetch(`${this.backendUrl}/api/generate-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                min_shapes: minShapes,
                max_shapes: maxShapes
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
                
                console.log(`Buffered next image with ${imageData.num_shapes} ${imageData.shape_type}s (${imageData.color}, ${imageData.distribution})`);
            }
        } catch (error) {
            console.error('Error buffering next image:', error);
            // Don't show error to user for buffering failures
        } finally {
            this.isBuffering = false;
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
    
    handleCanvasClick() {
        if (this.gameState === 'showing') {
            // Show answer with smooth transition
            const answerText = document.getElementById('answer-text');
            answerText.style.opacity = ''; // Reset inline opacity to allow CSS class to work
            answerText.classList.add('visible');
            this.gameState = 'answered';
        } else if (this.gameState === 'answered') {
            // Hide answer and generate new image
            const answerText = document.getElementById('answer-text');
            answerText.classList.remove('visible');
            this.generateNewImage();
        }
        // Do nothing if loading
    }
    
    showError(message) {
        this.loadingMessage.innerHTML = `
            <div style="color: #d32f2f; text-align: center;">
                <h3>Virhe</h3>
                <p>${message}</p>
                <p style="margin-top: 15px;">
                    <a href="/maarien-arvioiminen/muodot/" style="color: #1976d2;">← Takaisin PDF-tiedostoihin</a>
                </p>
            </div>
        `;
        this.loadingMessage.style.display = 'block';
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', function() {
    new MinimalShapeApp();
});
