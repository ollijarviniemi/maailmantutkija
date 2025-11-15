class ShapeEstimationApp {
    constructor() {
        this.currentShapeCount = 0;
        this.imagesShown = 0;
        this.gameStarted = false;
        // Determine backend URL based on environment
        const currentHost = window.location.hostname;
        if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
            this.backendUrl = 'http://localhost:5000';
        } else {
            this.backendUrl = 'https://maailmantutkija-backend.up.railway.app';
        }
        
        this.initializeApp();
    }
    
    initializeApp() {
        // Set up event listeners
        document.getElementById('start-game').addEventListener('click', () => this.startGame());
        document.getElementById('new-image').addEventListener('click', () => this.generateNewImage());
        document.getElementById('show-answer').addEventListener('click', () => this.showAnswer());
        
        // Validate input ranges
        document.getElementById('min-shapes').addEventListener('change', () => this.validateInputs());
        document.getElementById('max-shapes').addEventListener('change', () => this.validateInputs());
        
        // Check if backend is available
        this.checkBackendHealth();
    }
    
    async checkBackendHealth() {
        try {
            const response = await fetch(`${this.backendUrl}/api/health`);
            if (response.ok) {
                console.log('Backend is available');
            } else {
                this.showBackendError();
            }
        } catch (error) {
            console.log('Backend not available, showing instructions');
            this.showBackendError();
        }
    }
    
    showBackendError() {
        const controlsDiv = document.getElementById('controls');
        controlsDiv.innerHTML = `
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <h3>Backend palvelin ei ole käynnissä</h3>
                <p>Interaktiivinen sovellus vaatii Python-palvelimen käynnistämisen. Käynnistä palvelin seuraavasti:</p>
                <ol>
                    <li>Avaa terminaali ja siirry hakemistoon: <code>cd website_project</code></li>
                    <li>Asenna riippuvuudet: <code>pip install flask flask-cors matplotlib pillow numpy</code></li>
                    <li>Käynnistä palvelin: <code>python3 shape_app.py</code></li>
                    <li>Päivitä tämä sivu</li>
                </ol>
                <p>Vaihtoehtoisesti voit käyttää PDF-tiedostoja yllä.</p>
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
    
    startGame() {
        this.gameStarted = true;
        this.imagesShown = 0;
        
        // Show game area and hide start button
        document.getElementById('game-area').style.display = 'block';
        document.getElementById('start-game').style.display = 'none';
        document.getElementById('new-image').style.display = 'inline-block';
        document.getElementById('show-answer').style.display = 'inline-block';
        
        this.generateNewImage();
    }
    
    async generateNewImage() {
        // Hide answer area
        document.getElementById('answer-area').style.display = 'none';
        
        // Show loading message
        const canvas = document.getElementById('shape-canvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#333';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Generoidaan kuvaa...', canvas.width / 2, canvas.height / 2);
        
        try {
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
                // Store the correct answer
                this.currentShapeCount = data.num_shapes;
                
                // Display the image
                this.displayBase64Image(data.image);
                
                // Update stats
                this.imagesShown++;
                document.getElementById('images-shown').textContent = this.imagesShown;
                
                console.log(`Generated image with ${data.num_shapes} ${data.shape_type}s (${data.color}, ${data.distribution})`);
            } else {
                throw new Error(data.error || 'Unknown error occurred');
            }
            
        } catch (error) {
            console.error('Error generating image:', error);
            this.showError('Virhe kuvan generoinnissa: ' + error.message);
        }
    }
    
    displayBase64Image(base64Data) {
        const canvas = document.getElementById('shape-canvas');
        const ctx = canvas.getContext('2d');
        
        // Create an image object
        const img = new Image();
        
        img.onload = function() {
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Calculate scaling to fit canvas while maintaining aspect ratio
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            
            // Center the image
            const x = (canvas.width - scaledWidth) / 2;
            const y = (canvas.height - scaledHeight) / 2;
            
            // Draw the image
            ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
        };
        
        // Set the source to the base64 data
        img.src = 'data:image/png;base64,' + base64Data;
    }
    
    showAnswer() {
        // Show the answer area
        document.getElementById('correct-answer').textContent = this.currentShapeCount;
        document.getElementById('answer-area').style.display = 'block';
    }
    
    showError(message) {
        const canvas = document.getElementById('shape-canvas');
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f8d7da';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#721c24';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        
        // Word wrap the error message
        const words = message.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > canvas.width - 40 && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }
        
        // Draw the lines
        const lineHeight = 20;
        const startY = (canvas.height - lines.length * lineHeight) / 2;
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], canvas.width / 2, startY + i * lineHeight);
        }
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', function() {
    new ShapeEstimationApp();
});
