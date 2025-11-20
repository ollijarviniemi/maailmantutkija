/**
 * Rule Discovery Game Application - Modular Version
 * Main entry point for the application
 */

import { RuleDiscoveryApp } from './rule-discovery/core/app-manager.js?v7';

// Initialize app when DOM is ready or immediately if already loaded
function initializeRuleDiscoveryAppV2() {
    try {
        const app = new RuleDiscoveryApp();
        window.ruleDiscoveryApp = app;
    } catch (error) {
        console.error('Error initializing Rule Discovery App:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeRuleDiscoveryAppV2);
} else {
    // DOM already loaded (script loaded dynamically after page load)
    initializeRuleDiscoveryAppV2();
}
