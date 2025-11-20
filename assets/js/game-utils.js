// Game utility functions for Maailmantutkija interactive components

// Global game state
window.gameState = {
    apiBaseUrl: null,
    currentGame: null,
    relatedChapterUrl: null
};

// Initialize game utilities
function initGameUtils(config) {
    window.gameState.apiBaseUrl = config.apiBaseUrl;
    window.gameState.relatedChapterUrl = config.relatedChapterUrl;
}

// Navigation functions
function goBackToChapter() {
    if (window.gameState.relatedChapterUrl) {
        window.location.href = window.gameState.relatedChapterUrl;
    } else {
        window.history.back();
    }
}

function restartGame() {
    // This will be overridden by specific games
    window.location.reload();
}

// Utility function to show game status
function showGameStatus(message, type) {
    type = type || 'info';
    const container = document.getElementById('gameContainer');
    const statusDiv = document.createElement('div');
    statusDiv.className = 'game-' + type;
    statusDiv.textContent = message;
    
    // Remove any existing status messages
    const existingStatus = container.querySelector('.game-status, .game-score, .game-error');
    if (existingStatus) {
        existingStatus.remove();
    }
    
    container.appendChild(statusDiv);
}

// Utility function to show loading state
function showLoading(message) {
    message = message || 'Ladataan';
    const container = document.getElementById('gameContainer');
    container.innerHTML = '<div class="loading">' + message + '</div>';
}

// API utility function
async function apiCall(endpoint, options) {
    options = options || {};
    const url = window.gameState.apiBaseUrl + endpoint;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    try {
        const response = await fetch(url, Object.assign(defaultOptions, options));
        if (!response.ok) {
            throw new Error('HTTP error! status: ' + response.status);
        }
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Make utilities available globally
window.goBackToChapter = goBackToChapter;
window.restartGame = restartGame;
window.showGameStatus = showGameStatus;
window.showLoading = showLoading;
window.apiCall = apiCall;
window.initGameUtils = initGameUtils;
