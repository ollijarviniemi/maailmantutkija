/**
 * Main Entry Point
 *
 * Wires together simulation, rendering, and UI controls.
 */

import { Simulation } from './core/simulation.js';
import { Renderer } from './render/renderer.js';
import { getLevel, getLevelNames, testLevels } from './levels/test-levels.js';

// Global state
let simulation = null;
let renderer = null;
let currentLevelName = 'bouncing-ball';
let testLevel = null;

/**
 * Initialize the application
 */
function init() {
    const canvas = document.getElementById('canvas');
    const playPauseBtn = document.getElementById('playPause');
    const stepBtn = document.getElementById('step');
    const resetBtn = document.getElementById('reset');
    const timestepSpan = document.getElementById('timestep');
    const levelSelect = document.getElementById('levelSelect');
    const selectedInfo = document.getElementById('selectedInfo');

    // Check for test level from editor
    const urlParams = new URLSearchParams(window.location.search);
    const isTestMode = urlParams.get('test') === '1';

    if (isTestMode) {
        try {
            testLevel = JSON.parse(sessionStorage.getItem('testLevel'));
        } catch (e) {
            console.error('Failed to load test level:', e);
        }
    }

    // Populate level selector
    levelSelect.innerHTML = '';
    if (testLevel) {
        const option = document.createElement('option');
        option.value = '__test__';
        option.textContent = '** Editor Test **';
        levelSelect.appendChild(option);
        currentLevelName = '__test__';
    }
    for (const name of getLevelNames()) {
        const level = testLevels[name];
        const option = document.createElement('option');
        option.value = name;
        option.textContent = level.name;
        levelSelect.appendChild(option);
    }
    levelSelect.value = currentLevelName;

    // Load initial level
    loadLevel(currentLevelName, canvas, testLevel);

    // Set up callbacks
    simulation.onStep = (t) => {
        timestepSpan.textContent = `t = ${t}`;
    };

    simulation.onRender = () => {
        renderer.render();
    };

    // Initial render
    renderer.render();

    // Play/Pause button
    playPauseBtn.addEventListener('click', () => {
        simulation.toggle();
        updatePlayPauseButton(playPauseBtn);
    });

    // Step button
    stepBtn.addEventListener('click', () => {
        simulation.pause();
        updatePlayPauseButton(playPauseBtn);
        simulation.step();
        renderer.render();
        timestepSpan.textContent = `t = ${simulation.timestep}`;
    });

    // Reset button
    resetBtn.addEventListener('click', () => {
        simulation.reset(getLevel(currentLevelName));
        updatePlayPauseButton(playPauseBtn);
    });

    // Level selector
    levelSelect.addEventListener('change', () => {
        currentLevelName = levelSelect.value;
        loadLevel(currentLevelName, canvas, testLevel);
        updatePlayPauseButton(playPauseBtn);
        timestepSpan.textContent = `t = ${simulation.timestep}`;
        renderer.render();
    });

    // Canvas click for cell info
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        const { x, y } = renderer.getCellAt(canvasX, canvasY);
        selectedInfo.textContent = renderer.getCellInfo(x, y);
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (e.key === ' ') {
            e.preventDefault();
            simulation.toggle();
            updatePlayPauseButton(playPauseBtn);
        } else if (e.key === 's' || e.key === 'ArrowRight') {
            simulation.pause();
            updatePlayPauseButton(playPauseBtn);
            simulation.step();
            renderer.render();
            timestepSpan.textContent = `t = ${simulation.timestep}`;
        } else if (e.key === 'r') {
            simulation.reset(getLevel(currentLevelName));
            updatePlayPauseButton(playPauseBtn);
        }
    });
}

/**
 * Load a level by name (or test level from editor)
 */
function loadLevel(name, canvas, testLevel = null) {
    // Use test level if provided, otherwise get from registry
    const level = (name === '__test__' && testLevel) ? testLevel : getLevel(name);

    // Create new simulation with level dimensions
    simulation = new Simulation(level.width, level.height);
    simulation.loadLevel(level);

    // Create renderer
    renderer = new Renderer(canvas, simulation);

    // Re-attach callbacks if they were set
    const timestepSpan = document.getElementById('timestep');
    simulation.onStep = (t) => {
        timestepSpan.textContent = `t = ${t}`;
    };
    simulation.onRender = () => {
        renderer.render();
    };
}

/**
 * Update play/pause button text
 */
function updatePlayPauseButton(btn) {
    if (simulation.playing) {
        btn.innerHTML = '&#10074;&#10074; Pause';
    } else {
        btn.innerHTML = '&#9654; Play';
    }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
