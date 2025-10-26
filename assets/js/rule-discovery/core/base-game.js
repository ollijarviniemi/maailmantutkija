/**
 * Base Game Class
 * Abstract base class for all rule discovery games
 * Provides common functionality and interface
 */

export class BaseGame {
    constructor(appManager, gameType, currentRound) {
        this.app = appManager;
        this.gameType = gameType;
        this.currentRound = currentRound;
        this.history = [];
        this.isProcessingAnswer = false;  // Prevent double-click

        // Inject CSS to remove number input spinners (only once)
        if (!document.getElementById('remove-number-spinners')) {
            const style = document.createElement('style');
            style.id = 'remove-number-spinners';
            style.textContent = `
                input[type="number"]::-webkit-outer-spin-button,
                input[type="number"]::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                input[type="number"] {
                    -moz-appearance: textfield;
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Initialize and render the game UI
     * Must be implemented by subclasses
     */
    render() {
        throw new Error('render() must be implemented by subclass');
    }

    /**
     * Clean up game resources
     */
    cleanup() {
        // Override if needed
    }

    /**
     * Show feedback message
     */
    showFeedback(message, type) {
        this.app.showFeedback(message, type);
    }

    /**
     * Clear feedback message
     */
    clearFeedback() {
        this.app.clearFeedback();
    }

    /**
     * Complete the current round
     */
    completeRound(options) {
        this.app.completeRound(options);
    }

    /**
     * Get DOM elements for display and controls
     */
    getDisplayElements() {
        return {
            exampleDisplay: this.app.exampleDisplay,
            controlsDiv: this.app.controlsDiv,
            historyColumn: this.app.historyColumn,
            historyContent: this.app.historyContent
        };
    }
}
