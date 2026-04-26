/**
 * Centralized Mobile Compatibility System for Maailmantutkija
 *
 * This module provides a unified way to handle mobile detection and UI switching
 * across all interactive applications and pages.
 */

window.MobileCompatibility = (function() {
    'use strict';

    // Mobile detection function
    function isMobile() {
        return window.innerWidth <= 900 ||
               /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Create mobile message HTML
    function createMobileMessage(backUrl, customMessage) {
        const message = customMessage || "Pahoittelut, sovellukset toimivat vain tietokoneella!";
        const buttonText = "Takaisin Maailmantutkijaan";

        return `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 40px 20px; text-align: center;">
                <h2 style="margin-bottom: 30px; font-size: 24px; color: #333;">${message}</h2>
                <a href="${backUrl}" style="display: inline-block; padding: 15px 25px; background-color: #f5f5f5; color: #333; text-decoration: none; border-radius: 6px; font-size: 16px; border: 1px solid #ddd; transition: all 0.2s ease;">${buttonText}</a>
            </div>
        `;
    }

    // Initialize application with mobile/desktop switching
    function initializeApp(config) {
        const {
            mobileMessageId = 'mobile-message',
            desktopContainerId,
            backUrl,
            scripts = [],
            customMessage
        } = config;

        function switchUI() {
            const mobileDiv = document.getElementById(mobileMessageId);
            const desktopDiv = document.getElementById(desktopContainerId);

            if (!mobileDiv || !desktopDiv) {
                console.error('MobileCompatibility: Required elements not found');
                return;
            }

            if (isMobile()) {
                // Show mobile message
                mobileDiv.style.display = 'block';
                mobileDiv.innerHTML = createMobileMessage(backUrl, customMessage);
                desktopDiv.style.display = 'none';
            } else {
                // Show desktop app
                mobileDiv.style.display = 'none';
                desktopDiv.style.display = 'flex';

                // Load scripts only on desktop
                loadScripts(scripts);
            }
        }

        // Load scripts dynamically in sequence
        function loadScripts(scriptUrls) {
            let loadPromise = Promise.resolve();

            scriptUrls.forEach(url => {
                loadPromise = loadPromise.then(() => {
                    return new Promise((resolve, reject) => {
                        // Check if script already exists
                        const existingScript = document.querySelector(`script[src="${url}"]`);
                        if (existingScript) {
                            resolve();
                            return;
                        }

                        const script = document.createElement('script');
                        script.src = url;
                        script.onload = () => resolve();
                        script.onerror = () => reject(new Error(`Failed to load ${url}`));
                        document.head.appendChild(script);
                    });
                });
            });

            return loadPromise;
        }

        // Initialize on DOM load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', switchUI);
        } else {
            switchUI();
        }

        // Re-initialize on window resize
        window.addEventListener('resize', function() {
            clearTimeout(window.mobileResizeTimeout);
            window.mobileResizeTimeout = setTimeout(switchUI, 150);
        });
    }

    // Initialize Väitteet-style click behavior for mobile
    function initializeClickReveal(config) {
        const {
            statementSelector = '.statement-item',
            tooltipSelector = '.statement-tooltip'
        } = config;

        let currentlyOpen = null;

        function setupDesktopBehavior(statement) {
            const tooltip = statement.querySelector(tooltipSelector);
            if (!tooltip) return;

            statement.addEventListener("mouseenter", function() {
                tooltip.style.display = "block";

                // Position adjustment for screen bounds
                const rect = tooltip.getBoundingClientRect();
                const viewportWidth = window.innerWidth;

                if (rect.right > viewportWidth - 20) {
                    tooltip.style.left = "auto";
                    tooltip.style.right = "100%";
                    tooltip.style.marginLeft = "0";
                    tooltip.style.marginRight = "20px";
                } else {
                    tooltip.style.left = "100%";
                    tooltip.style.right = "auto";
                    tooltip.style.marginLeft = "20px";
                    tooltip.style.marginRight = "0";
                }
            });

            statement.addEventListener("mouseleave", function() {
                tooltip.style.display = "none";
            });
        }

        function setupMobileBehavior(statement) {
            const tooltip = statement.querySelector(tooltipSelector);
            if (!tooltip) return;

            // Create mobile answer element
            const mobileAnswer = document.createElement('div');
            mobileAnswer.className = 'mobile-answer';
            mobileAnswer.innerHTML = tooltip.innerHTML;
            mobileAnswer.style.cssText = `
                display: none;
                margin: 12px 0;
                padding: 12px 16px;
                background-color: ${tooltip.classList.contains('true') ? '#e8f5e8' : '#ffeaea'};
                border: 2px solid ${tooltip.classList.contains('true') ? '#4caf50' : '#f44336'};
                border-radius: 6px;
                color: ${tooltip.classList.contains('true') ? '#2e7d32' : '#c62828'};
                font-weight: 600;
                font-size: 0.85em;
                line-height: 1.4;
                white-space: pre-wrap;
                word-wrap: break-word;
            `;

            // Hide original tooltip on mobile
            tooltip.style.display = 'none';

            // Insert mobile answer after the statement
            statement.insertAdjacentElement('afterend', mobileAnswer);

            statement.addEventListener("click", function(e) {
                e.preventDefault();

                // Close any currently open answer
                if (currentlyOpen && currentlyOpen !== mobileAnswer) {
                    currentlyOpen.style.display = 'none';
                }

                // Toggle current answer
                if (mobileAnswer.style.display === 'block') {
                    mobileAnswer.style.display = 'none';
                    currentlyOpen = null;
                } else {
                    mobileAnswer.style.display = 'block';
                    currentlyOpen = mobileAnswer;
                }
            });
        }

        function initializeBehavior() {
            const statements = document.querySelectorAll(statementSelector);

            // Clear existing mobile answers
            document.querySelectorAll('.mobile-answer').forEach(el => el.remove());

            // Clear existing event listeners by cloning nodes
            statements.forEach(function(statement) {
                const newStatement = statement.cloneNode(true);
                statement.parentNode.replaceChild(newStatement, statement);
            });

            // Get updated node list and setup behavior
            const updatedStatements = document.querySelectorAll(statementSelector);
            updatedStatements.forEach(function(statement) {
                if (isMobile()) {
                    setupMobileBehavior(statement);
                } else {
                    setupDesktopBehavior(statement);
                }
            });
        }

        // Initialize behavior
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeBehavior);
        } else {
            initializeBehavior();
        }

        // Re-initialize on window resize
        window.addEventListener('resize', function() {
            clearTimeout(window.clickRevealResizeTimeout);
            window.clickRevealResizeTimeout = setTimeout(initializeBehavior, 150);
        });
    }

    // Public API
    return {
        isMobile: isMobile,
        initializeApp: initializeApp,
        initializeClickReveal: initializeClickReveal,
        createMobileMessage: createMobileMessage
    };
})();