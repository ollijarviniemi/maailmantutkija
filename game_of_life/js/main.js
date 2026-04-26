/**
 * Game of Life Benchmark - Main Entry Point
 */

import { LifeJS } from './life-js.js';
import { LifeWebGPU } from './life-webgpu.js';
import { LifeWebGPUOptimized } from './life-webgpu-optimized.js';

// State
let simulation = null;
let isWebGPU = false;
let running = false;
let animationId = null;

// DOM Elements
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const gridSizeSelect = document.getElementById('gridSize');
const implementationSelect = document.getElementById('implementation');
const renderCheckbox = document.getElementById('renderEnabled');
const initBtn = document.getElementById('init');
const playPauseBtn = document.getElementById('playPause');
const stepBtn = document.getElementById('step');
const benchmarkBtn = document.getElementById('benchmark');

const timestepSpan = document.getElementById('timestep');
const simRateSpan = document.getElementById('simRate');
const renderRateSpan = document.getElementById('renderRate');
const liveCellsSpan = document.getElementById('liveCells');
const resultsDiv = document.getElementById('results');

// Timing
let lastFrameTime = 0;
let frameCount = 0;
let simStepCount = 0;
let lastStatsTime = 0;

/**
 * Initialize simulation with current settings
 */
async function initialize() {
    const size = parseInt(gridSizeSelect.value);
    const impl = implementationSelect.value;

    // Stop any running simulation
    stop();

    // Clean up previous simulation
    if (simulation && simulation.destroy) {
        simulation.destroy();
    }

    resultsDiv.textContent = `Initializing ${impl.toUpperCase()} with ${size}x${size} grid...`;

    try {
        if (impl === 'webgpu') {
            simulation = new LifeWebGPU();
            await simulation.init(size, size);
            isWebGPU = true;
        } else if (impl === 'webgpu-opt') {
            simulation = new LifeWebGPUOptimized();
            await simulation.init(size, size);
            isWebGPU = true;
        } else {
            simulation = new LifeJS(size, size);
            isWebGPU = false;
        }

        simulation.randomize(0.3);

        // Setup canvas
        canvas.width = size;
        canvas.height = size;

        // Initial render
        await render();

        updateStats();
        resultsDiv.textContent = `Initialized ${impl.toUpperCase()} ${size}x${size}. Ready.`;
    } catch (error) {
        resultsDiv.textContent = `Error: ${error.message}`;
        console.error(error);
    }
}

/**
 * Render current state to canvas
 */
async function render() {
    if (!simulation) return;

    const state = isWebGPU ? await simulation.getState() : simulation.getState();
    const width = simulation.width;
    const height = simulation.height;

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < state.length; i++) {
        const idx = i * 4;
        if (state[i]) {
            // Live cell - bright green
            data[idx] = 100;
            data[idx + 1] = 255;
            data[idx + 2] = 100;
        } else {
            // Dead cell - dark
            data[idx] = 10;
            data[idx + 1] = 10;
            data[idx + 2] = 20;
        }
        data[idx + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
}

/**
 * Update statistics display
 */
async function updateStats() {
    if (!simulation) return;

    timestepSpan.textContent = simulation.timestep;

    if (isWebGPU) {
        liveCellsSpan.textContent = await simulation.countLive();
    } else {
        liveCellsSpan.textContent = simulation.countLive();
    }
}

/**
 * Animation loop
 */
async function loop(timestamp) {
    if (!running) return;

    // Calculate time delta
    const delta = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    // Run simulation steps
    const stepsPerFrame = 1;
    if (isWebGPU) {
        for (let i = 0; i < stepsPerFrame; i++) {
            simulation.step();
        }
    } else {
        for (let i = 0; i < stepsPerFrame; i++) {
            simulation.step();
        }
    }
    simStepCount += stepsPerFrame;

    // Render if enabled
    if (renderCheckbox.checked) {
        await render();
        frameCount++;
    }

    // Update stats every 500ms
    if (timestamp - lastStatsTime > 500) {
        const elapsed = (timestamp - lastStatsTime) / 1000;
        simRateSpan.textContent = Math.round(simStepCount / elapsed);
        renderRateSpan.textContent = Math.round(frameCount / elapsed);

        simStepCount = 0;
        frameCount = 0;
        lastStatsTime = timestamp;

        await updateStats();
    }

    animationId = requestAnimationFrame(loop);
}

/**
 * Start simulation
 */
function start() {
    if (!simulation || running) return;

    running = true;
    playPauseBtn.textContent = 'Pause';
    lastFrameTime = performance.now();
    lastStatsTime = lastFrameTime;
    simStepCount = 0;
    frameCount = 0;
    animationId = requestAnimationFrame(loop);
}

/**
 * Stop simulation
 */
function stop() {
    running = false;
    playPauseBtn.textContent = 'Play';
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

/**
 * Single step
 */
async function singleStep() {
    if (!simulation) return;
    stop();

    if (isWebGPU) {
        simulation.step();
    } else {
        simulation.step();
    }

    await render();
    await updateStats();
}

/**
 * Run benchmark
 */
async function runBenchmark() {
    if (!simulation) {
        resultsDiv.textContent = 'Please initialize first.';
        return;
    }

    stop();
    benchmarkBtn.disabled = true;

    const steps = 1000;
    const size = simulation.width;
    const impl = implementationSelect.value === 'js' ? 'JavaScript' :
                 implementationSelect.value === 'webgpu' ? 'WebGPU (original)' : 'WebGPU (optimized)';

    resultsDiv.textContent = `Running ${impl} benchmark: ${steps} steps on ${size}x${size} grid...`;

    // Wait a frame to update UI
    await new Promise(r => requestAnimationFrame(r));

    let time;
    if (isWebGPU) {
        time = await simulation.runSteps(steps);
    } else {
        time = simulation.runSteps(steps);
    }

    const stepsPerSec = Math.round(steps / (time / 1000));
    const cellUpdatesPerSec = stepsPerSec * size * size;

    const result = [
        `Implementation: ${impl}`,
        `Grid size: ${size}x${size} (${(size * size).toLocaleString()} cells)`,
        `Steps: ${steps}`,
        `Time: ${time.toFixed(1)} ms`,
        `Steps/sec: ${stepsPerSec.toLocaleString()}`,
        `Cell updates/sec: ${cellUpdatesPerSec.toLocaleString()}`,
        ``,
    ].join('\n');

    resultsDiv.textContent = resultsDiv.textContent.includes('Implementation')
        ? resultsDiv.textContent + '\n' + result
        : result;

    await render();
    await updateStats();

    benchmarkBtn.disabled = false;
}

// Event listeners
initBtn.addEventListener('click', initialize);
playPauseBtn.addEventListener('click', () => running ? stop() : start());
stepBtn.addEventListener('click', singleStep);
benchmarkBtn.addEventListener('click', runBenchmark);

// Check WebGPU support
async function checkWebGPU() {
    const webgpuOption = implementationSelect.querySelector('option[value="webgpu"]');
    const webgpuOptOption = implementationSelect.querySelector('option[value="webgpu-opt"]');

    if (!navigator.gpu) {
        webgpuOption.disabled = true;
        webgpuOptOption.disabled = true;
        webgpuOption.textContent = 'WebGPU original (not available)';
        webgpuOptOption.textContent = 'WebGPU optimized (not available)';
        resultsDiv.textContent = `WebGPU not available. navigator.gpu is undefined.
Possible reasons:
- Browser doesn't support WebGPU
- Need HTTPS (try: python3 -m http.server with --bind or use localhost)
- Firefox: Check about:config for dom.webgpu.enabled
- Chrome: Should work on localhost`;
        return;
    }

    try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            webgpuOption.disabled = true;
            webgpuOptOption.disabled = true;
            webgpuOption.textContent = 'WebGPU original (no adapter)';
            webgpuOptOption.textContent = 'WebGPU optimized (no adapter)';
            resultsDiv.textContent = 'WebGPU: navigator.gpu exists but no adapter available. GPU may not support WebGPU.';
            return;
        }

        // Try to get adapter info (API varies between browsers)
        let infoStr = 'unknown adapter';
        try {
            if (adapter.requestAdapterInfo) {
                const info = await adapter.requestAdapterInfo();
                infoStr = `${info.vendor || ''} ${info.architecture || ''} ${info.device || ''}`.trim() || 'adapter found';
            } else if (adapter.info) {
                const info = adapter.info;
                infoStr = `${info.vendor || ''} ${info.architecture || ''} ${info.device || ''}`.trim() || 'adapter found';
            }
        } catch (infoErr) {
            infoStr = 'adapter found (info unavailable)';
        }

        resultsDiv.textContent = `WebGPU available! ${infoStr}`;
        console.log('WebGPU adapter:', adapter);
    } catch (e) {
        webgpuOption.disabled = true;
        webgpuOptOption.disabled = true;
        webgpuOption.textContent = 'WebGPU original (error)';
        webgpuOptOption.textContent = 'WebGPU optimized (error)';
        resultsDiv.textContent = `WebGPU error: ${e.message}\n${e.stack || ''}`;
        console.error('WebGPU error:', e);
    }
}

// Initialize on load
checkWebGPU().then(() => initialize());
