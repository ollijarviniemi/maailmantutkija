/**
 * Rule Discovery Game Application - Modular Version
 * Main entry point for the application
 */

import { RuleDiscoveryApp } from './rule-discovery/core/app-manager.js?v=300';

// Initialize app when DOM is ready or immediately if already loaded
function initializeRuleDiscoveryAppModular() {
    console.log('🚀🚀🚀 LOADING NEW MODULAR VERSION v100 🚀🚀🚀');
    console.log('Initializing Rule Discovery App (modular)...');
    try {
        const app = new RuleDiscoveryApp();
        window.ruleDiscoveryApp = app;
        console.log('✅ Rule Discovery App initialized successfully (MODULAR)');
    } catch (error) {
        console.error('❌ Error initializing app:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeRuleDiscoveryAppModular);
} else {
    // DOM already loaded (script loaded dynamically after page load)
    initializeRuleDiscoveryAppModular();
}
