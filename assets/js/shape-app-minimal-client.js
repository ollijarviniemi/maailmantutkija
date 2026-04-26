/**
 * Client-side Minimal Shape App
 * Replaces Flask backend with client-side shape generation
 */

class ClientMinimalShapeApp {
    constructor() {
        this.currentShapeCount = 0;
        this.gameState = 'loading';

        // Buffer system for pre-generating next image
        this.bufferedImage = null;
        this.isBuffering = false;

        // Initialize the client-side generator
        this.shapeGenerator = new ClientShapeGenerator(800, 600);

        this.initializeApp();
    }

    initializeApp() {
        // Get DOM elements
        this.canvas = document.getElementById('shape-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.loadingMessage = document.getElementById('loading-message');
        this.answerDisplay = document.getElementById('answer-display');
        this.answerText = document.getElementById('answer-text'); // Use answer-text like original
        this.correctAnswerSpan = document.getElementById('correct-answer');


        // Set up event listeners
        this.canvas.addEventListener('click', () => this.handleCanvasClick());
        document.getElementById('min-shapes')?.addEventListener('change', () => this.validateInputs());
        document.getElementById('max-shapes')?.addEventListener('change', () => this.validateInputs());

        // Start generating immediately (no backend check needed)
        console.log('Client-side Minimal Shape App initialized');
        this.generateNewImage();
    }

    validateInputs() {
        const minInput = document.getElementById('min-shapes');
        const maxInput = document.getElementById('max-shapes');

        if (!minInput || !maxInput) return;

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

        // Clear buffer when parameters change
        this.bufferedImage = null;

        // If we're in showing state and inputs changed, generate new image
        if (this.gameState === 'showing') {
            this.generateNewImage();
        }
    }

    async generateNewImage() {
        this.gameState = 'loading';
        this.showLoadingMessage();

        try {
            let imageData;

            if (this.bufferedImage) {
                // Use buffered image for better performance
                imageData = this.bufferedImage;
                this.bufferedImage = null;
                this.bufferNextImage(); // Start buffering the next one
            } else {
                imageData = await this.generateWithCurrentSettings();
            }

            if (imageData.success) {
                this.currentShapeCount = imageData.numShapes;

                // Store the shape count but don't update the visible text yet - wait until after fadeout
                this.pendingAnswerText = imageData.numShapes > 1 ? imageData.numShapes + " muotoa" : "1 muoto";

                // Display the generated image
                const img = new Image();
                img.onload = () => {
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
                    this.showImage();
                };
                img.src = imageData.image;

                // Start buffering next image if not already doing so
                if (!this.bufferedImage && !this.isBuffering) {
                    this.bufferNextImage();
                }
            } else {
                throw new Error(imageData.error || 'Generation failed');
            }
        } catch (error) {
            console.error('Client-side generation error:', error);
            this.showError(`Image generation failed: ${error.message}`);
        }
    }

    async generateWithCurrentSettings() {
        // Get current settings from inputs
        const minInput = document.getElementById('min-shapes');
        const maxInput = document.getElementById('max-shapes');

        const minShapes = parseInt(minInput?.value || '10');
        const maxShapes = parseInt(maxInput?.value || '100');

        // Sample number of shapes from the specified range
        const numShapes = this.shapeGenerator.sampleLogUniform(minShapes, maxShapes);

        // Random parameters like Flask backend
        const shapeTypes = ["circle", "square", "triangle", "star", "heart"];
        const colors = ["red", "blue", "green", "purple", "black"];

        const shapeType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const distribution = Math.random() < 0.5 ? "uniform" : "gaussian_mixture";
        const numGaussians = Math.floor(Math.random() * 5) + 1;

        return await this.shapeGenerator.generateImage({
            numShapes: numShapes,
            shapeType: shapeType,
            color: color,
            distribution: distribution,
            numGaussians: numGaussians
        });
    }

    async bufferNextImage() {
        if (this.isBuffering) return;

        this.isBuffering = true;
        try {
            this.bufferedImage = await this.generateWithCurrentSettings();
        } catch (error) {
            console.warn('Background buffering failed:', error);
            this.bufferedImage = null;
        }
        this.isBuffering = false;
    }

    showLoadingMessage() {
        if (this.loadingMessage) {
            this.loadingMessage.style.display = 'block';
            this.loadingMessage.textContent = 'Generoidaan kuvaa...';
        }
        if (this.canvas) this.canvas.style.opacity = '0.3';
        // Don't hide answerDisplay - it should stay in DOM, answer text visibility controlled by CSS opacity
        // Make sure answer text is hidden by removing visible class
        if (this.answerText) {
            this.answerText.classList.remove('visible');
        }
    }

    showImage() {
        this.gameState = 'showing';
        if (this.loadingMessage) this.loadingMessage.style.display = 'none';
        if (this.canvas) this.canvas.style.opacity = '1';
        // Don't hide answerDisplay - let CSS opacity handle visibility via 'visible' class

        // Update answer text AFTER fade-out is complete (CSS transition is 0.3s)
        setTimeout(() => {
            if (this.correctAnswerSpan && this.pendingAnswerText) {
                this.correctAnswerSpan.textContent = this.pendingAnswerText;
            }
        }, 400); // Wait 400ms to ensure fade-out is complete
    }

    handleCanvasClick() {
        if (this.gameState === 'showing') {
            // Show answer with smooth transition like original
            if (this.answerText) {
                this.answerText.style.opacity = ''; // Reset inline opacity to allow CSS class to work
                this.answerText.classList.add('visible');
            }
            this.gameState = 'answered';
        } else if (this.gameState === 'answered') {
            // Hide answer and generate new image like original
            if (this.answerText) {
                this.answerText.classList.remove('visible');
            }
            this.generateNewImage();
        }
        // Do nothing if loading
    }


    showError(message) {
        if (this.loadingMessage) {
            this.loadingMessage.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <h3>Virhe</h3>
                    <p>${message}</p>
                    <p style="margin-top: 15px;">
                        <button onclick="location.reload()" style="padding: 8px 16px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Yritä uudelleen
                        </button>
                    </p>
                </div>
            `;
        }
    }
}

// Auto-initialize when DOM is loaded or immediately if already loaded
function initializeMinimalShapeApp() {
    if (document.getElementById('shape-canvas') && !window.minimalShapeApp) {
        window.minimalShapeApp = new ClientMinimalShapeApp();
        console.log('Client Minimal Shape App initialized');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMinimalShapeApp);
} else {
    // DOM already loaded (script loaded dynamically after page load)
    initializeMinimalShapeApp();
}