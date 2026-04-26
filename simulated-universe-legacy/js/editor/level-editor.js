/**
 * Level Editor for Simulated Universe
 *
 * Features:
 * - Large grids (up to 500x500)
 * - Zoom in/out
 * - Area selection and copy-paste
 * - Arrow key navigation with painting
 * - Protected border walls
 */

import { Grid } from '../core/grid.js';
import { ParticleType, ParticleColors } from '../core/particles.js';
import { BodyManager } from '../core/body.js';

const STORAGE_KEY = 'simulatedUniverseLevels';

// Particle type mapping (no void - use erase instead)
const PARTICLE_TYPES = {
    'wall': ParticleType.WALL,
    'matter': ParticleType.MATTER,
    'attractor': ParticleType.ATTRACTOR
};

// Reference size for max zoom (40x30 cells should fit at max zoom)
const MAX_ZOOM_REFERENCE_WIDTH = 40;
const MAX_ZOOM_REFERENCE_HEIGHT = 30;

class LevelEditor {
    constructor() {
        // Grid state
        this.gridWidth = 40;
        this.gridHeight = 30;
        this.grid = new Grid(this.gridWidth, this.gridHeight);
        this.bodyManager = new BodyManager();

        // Editor state
        this.currentTool = 'select';
        this.currentParticleType = 'wall';
        this.selectedCells = new Set();  // Set of "x,y" strings
        this.selectedBody = null;
        this.cursorCell = { x: 1, y: 1 };  // Current cursor position for keyboard nav

        // Clipboard
        this.clipboard = null;  // { width, height, cells: [{dx, dy, type}] }

        // Canvas state - zoom is dynamic based on container size
        this.cellSize = 12;  // Will be recalculated
        this.minCellSize = 2;
        this.maxCellSize = 24;
        this.canvas = null;
        this.ctx = null;
        this.canvasContainer = null;

        // Mouse state
        this.isDragging = false;
        this.lastCell = null;
        this.selectionStart = null;  // For area selection (mouse)
        this.selectionAnchor = null; // For area selection (keyboard)

        // History (undo/redo)
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;

        // Initialize
        this.init();
    }

    init() {
        // Get DOM elements
        this.canvas = document.getElementById('editor-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvasContainer = document.getElementById('canvas-container');

        // Calculate zoom bounds and set initial zoom
        this.updateZoomBounds();
        this.cellSize = this.maxCellSize;  // Start at max zoom for 40x30 grid

        // Set up canvas size
        this.updateCanvasSize();

        // Fill with walls on edges
        this.fillBorderWalls();

        // Bind event listeners
        this.bindEvents();

        // Initial render
        this.saveState();
        this.render();
        this.updateZoomDisplay();
    }

    /**
     * Calculate min/max cell sizes based on container and grid dimensions
     * - Min zoom: entire grid fits in container
     * - Max zoom: 40x30 cells fit in container
     */
    updateZoomBounds() {
        // Get container dimensions (subtract some padding for scrollbars)
        const containerWidth = this.canvasContainer.clientWidth - 20;
        const containerHeight = this.canvasContainer.clientHeight - 40; // Account for status bar

        // Min cell size: whole grid fits
        const minByWidth = containerWidth / this.gridWidth;
        const minByHeight = containerHeight / this.gridHeight;
        this.minCellSize = Math.max(1, Math.floor(Math.min(minByWidth, minByHeight)));

        // Max cell size: 40x30 cells fit
        const maxByWidth = containerWidth / MAX_ZOOM_REFERENCE_WIDTH;
        const maxByHeight = containerHeight / MAX_ZOOM_REFERENCE_HEIGHT;
        this.maxCellSize = Math.max(this.minCellSize, Math.floor(Math.min(maxByWidth, maxByHeight)));

        // Clamp current cell size to valid range
        this.cellSize = Math.max(this.minCellSize, Math.min(this.maxCellSize, this.cellSize));
    }

    updateCanvasSize() {
        this.canvas.width = this.gridWidth * this.cellSize;
        this.canvas.height = this.gridHeight * this.cellSize;
    }

    fillBorderWalls() {
        for (let x = 0; x < this.gridWidth; x++) {
            this.grid.setType(x, 0, ParticleType.WALL);
            this.grid.setType(x, this.gridHeight - 1, ParticleType.WALL);
        }
        for (let y = 0; y < this.gridHeight; y++) {
            this.grid.setType(0, y, ParticleType.WALL);
            this.grid.setType(this.gridWidth - 1, y, ParticleType.WALL);
        }
    }

    isBorderCell(x, y) {
        return x === 0 || y === 0 || x === this.gridWidth - 1 || y === this.gridHeight - 1;
    }

    bindEvents() {
        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Intercept pinch-to-zoom on canvas container (ctrl+wheel)
        const canvasContainer = document.getElementById('canvas-container');
        canvasContainer.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                if (e.deltaY < 0) {
                    this.zoomIn();
                } else {
                    this.zoomOut();
                }
            }
        }, { passive: false });

        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setTool(btn.dataset.tool));
        });

        // Particle type buttons
        document.querySelectorAll('.particle-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setParticleType(btn.dataset.type));
        });

        // Header buttons
        document.getElementById('btn-new').addEventListener('click', () => this.newLevel());
        document.getElementById('btn-load').addEventListener('click', () => this.showLoadDialog());
        document.getElementById('btn-save').addEventListener('click', () => this.showSaveDialog());
        document.getElementById('btn-undo').addEventListener('click', () => this.undo());
        document.getElementById('btn-redo').addEventListener('click', () => this.redo());
        document.getElementById('btn-copy').addEventListener('click', () => this.copySelection());
        document.getElementById('btn-paste').addEventListener('click', () => this.paste());
        document.getElementById('btn-test').addEventListener('click', () => this.testLevel());

        // Zoom buttons
        document.getElementById('btn-zoom-in').addEventListener('click', () => this.zoomIn());
        document.getElementById('btn-zoom-out').addEventListener('click', () => this.zoomOut());

        // Grid resize
        document.getElementById('btn-resize').addEventListener('click', () => this.resizeGrid());

        // Dialog buttons
        document.getElementById('dialog-cancel').addEventListener('click', () => this.hideDialog());
        document.getElementById('dialog-ok').addEventListener('click', () => this.onDialogOk());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.onKeyDown(e));

        // Window resize - recalculate zoom bounds
        window.addEventListener('resize', () => {
            this.updateZoomBounds();
            this.updateZoomDisplay();
        });
    }

    // --- Zoom ---

    zoomIn() {
        if (this.cellSize < this.maxCellSize) {
            // Increase by ~20% or at least 1
            const step = Math.max(1, Math.floor(this.cellSize * 0.2));
            this.cellSize = Math.min(this.maxCellSize, this.cellSize + step);
            this.updateZoomDisplay();
            this.updateCanvasSize();
            this.render();
            this.scrollCursorIntoView();
        }
    }

    zoomOut() {
        if (this.cellSize > this.minCellSize) {
            // Decrease by ~20% or at least 1
            const step = Math.max(1, Math.floor(this.cellSize * 0.2));
            this.cellSize = Math.max(this.minCellSize, this.cellSize - step);
            this.updateZoomDisplay();
            this.updateCanvasSize();
            this.render();
            this.scrollCursorIntoView();
        }
    }

    updateZoomDisplay() {
        // Show percentage relative to max zoom (100% = max)
        const percent = Math.round((this.cellSize / this.maxCellSize) * 100);
        document.getElementById('zoom-level').textContent = `${percent}%`;
    }

    /**
     * Scroll the canvas container so the cursor cell is visible
     */
    scrollCursorIntoView() {
        const cellLeft = this.cursorCell.x * this.cellSize;
        const cellTop = this.cursorCell.y * this.cellSize;
        const cellRight = cellLeft + this.cellSize;
        const cellBottom = cellTop + this.cellSize;

        const container = this.canvasContainer;
        const viewLeft = container.scrollLeft;
        const viewTop = container.scrollTop;
        const viewRight = viewLeft + container.clientWidth;
        const viewBottom = viewTop + container.clientHeight - 30; // Account for status bar

        // Scroll horizontally if needed
        if (cellLeft < viewLeft) {
            container.scrollLeft = cellLeft;
        } else if (cellRight > viewRight) {
            container.scrollLeft = cellRight - container.clientWidth;
        }

        // Scroll vertically if needed
        if (cellTop < viewTop) {
            container.scrollTop = cellTop;
        } else if (cellBottom > viewBottom) {
            container.scrollTop = cellBottom - container.clientHeight + 30;
        }
    }

    // --- Mouse Handling ---

    getCellFromEvent(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX / this.cellSize);
        const y = Math.floor((e.clientY - rect.top) * scaleY / this.cellSize);
        return { x, y };
    }

    onMouseDown(e) {
        const cell = this.getCellFromEvent(e);
        if (!this.grid.inBounds(cell.x, cell.y)) return;

        this.isDragging = true;
        this.lastCell = cell;

        if (this.currentTool === 'select') {
            if (e.shiftKey) {
                // Shift+click: select area from cursor to clicked cell
                this.updateAreaSelection(this.cursorCell, cell);
                this.selectionAnchor = this.cursorCell;  // Remember anchor for shift+arrow
                this.selectionStart = this.cursorCell;   // For drag extension
                this.cursorCell = cell;  // Move cursor to clicked point
            } else {
                this.cursorCell = cell;
                this.selectionAnchor = null;
                this.handleSelect(cell, false);
            }
        } else if (this.currentTool === 'paint') {
            this.cursorCell = cell;
            this.handlePaint(cell);
        } else if (this.currentTool === 'erase') {
            this.cursorCell = cell;
            this.handleErase(cell);
        }

        this.updateStatusBar(cell);
        this.updatePropertiesPanel();
    }

    onMouseMove(e) {
        const cell = this.getCellFromEvent(e);
        this.updateStatusBar(cell);

        if (!this.isDragging) return;
        if (!this.grid.inBounds(cell.x, cell.y)) return;
        if (this.lastCell && cell.x === this.lastCell.x && cell.y === this.lastCell.y) return;

        this.lastCell = cell;
        this.cursorCell = cell;

        if (this.currentTool === 'select' && this.selectionStart) {
            // Update area selection
            this.updateAreaSelection(this.selectionStart, cell);
        } else if (this.currentTool === 'paint') {
            this.handlePaint(cell);
        } else if (this.currentTool === 'erase') {
            this.handleErase(cell);
        }
    }

    onMouseUp(e) {
        if (this.isDragging) {
            this.isDragging = false;
            this.selectionStart = null;
            if (this.currentTool === 'paint' || this.currentTool === 'erase') {
                this.saveState();
            }
        }
    }

    // --- Tool Handlers ---

    handleSelect(cell, addToSelection) {
        const key = `${cell.x},${cell.y}`;
        const cellData = this.grid.get(cell.x, cell.y);

        if (addToSelection) {
            if (this.selectedCells.has(key)) {
                this.selectedCells.delete(key);
            } else {
                this.selectedCells.add(key);
            }
        } else {
            this.selectedCells.clear();
            if (cellData.type !== ParticleType.VOID) {
                this.selectedCells.add(key);
            }
        }

        // Check if selection is a body
        this.selectedBody = null;
        if (cellData.bodyId !== -1) {
            this.selectedBody = this.bodyManager.getBody(cellData.bodyId);
        }

        this.updatePropertiesPanel();
        this.render();
    }

    updateAreaSelection(start, end) {
        this.selectedCells.clear();
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (this.grid.inBounds(x, y)) {
                    this.selectedCells.add(`${x},${y}`);
                }
            }
        }
        this.render();
    }

    handlePaint(cell) {
        // Don't allow painting on border
        if (this.isBorderCell(cell.x, cell.y)) return;

        const type = PARTICLE_TYPES[this.currentParticleType];
        this.grid.setType(cell.x, cell.y, type);

        // If painting matter/attractor, rebuild bodies
        if (type === ParticleType.MATTER || type === ParticleType.ATTRACTOR) {
            this.rebuildBodies();
        }

        this.render();
    }

    handleErase(cell) {
        // Don't allow erasing border
        if (this.isBorderCell(cell.x, cell.y)) return;

        this.grid.setType(cell.x, cell.y, ParticleType.VOID);
        this.rebuildBodies();
        this.render();
    }

    rebuildBodies() {
        // Auto-bond adjacent matter/attractor particles
        this.bodyManager.bonds.clear();

        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const cell = this.grid.get(x, y);
                if (cell.type !== ParticleType.MATTER && cell.type !== ParticleType.ATTRACTOR) {
                    continue;
                }

                // Check right neighbor
                if (x + 1 < this.gridWidth) {
                    const right = this.grid.get(x + 1, y);
                    if (right.type === ParticleType.MATTER || right.type === ParticleType.ATTRACTOR) {
                        this.bodyManager.addBond(x, y, x + 1, y);
                    }
                }

                // Check bottom neighbor
                if (y + 1 < this.gridHeight) {
                    const bottom = this.grid.get(x, y + 1);
                    if (bottom.type === ParticleType.MATTER || bottom.type === ParticleType.ATTRACTOR) {
                        this.bodyManager.addBond(x, y, x, y + 1);
                    }
                }
            }
        }

        this.bodyManager.rebuildBodies(this.grid);
    }

    // --- Copy/Paste ---

    copySelection() {
        if (this.selectedCells.size === 0) return;

        // Find bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const key of this.selectedCells) {
            const [x, y] = key.split(',').map(Number);
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }

        // Store relative positions and types
        this.clipboard = {
            width: maxX - minX + 1,
            height: maxY - minY + 1,
            cells: []
        };

        for (const key of this.selectedCells) {
            const [x, y] = key.split(',').map(Number);
            const cell = this.grid.get(x, y);
            this.clipboard.cells.push({
                dx: x - minX,
                dy: y - minY,
                type: cell.type
            });
        }

        document.getElementById('status-info').textContent = `Copied ${this.clipboard.cells.length} cells`;
    }

    paste() {
        if (!this.clipboard) return;

        // Paste at cursor position
        const baseX = this.cursorCell.x;
        const baseY = this.cursorCell.y;

        let pasted = 0;
        for (const { dx, dy, type } of this.clipboard.cells) {
            const x = baseX + dx;
            const y = baseY + dy;
            if (this.grid.inBounds(x, y) && !this.isBorderCell(x, y)) {
                this.grid.setType(x, y, type);
                pasted++;
            }
        }

        if (pasted > 0) {
            this.rebuildBodies();
            this.saveState();
            this.render();
            document.getElementById('status-info').textContent = `Pasted ${pasted} cells`;
        }
    }

    // --- Tool/Type Selection ---

    setTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
        document.getElementById('status-mode').textContent = `Mode: ${tool.charAt(0).toUpperCase() + tool.slice(1)}`;
    }

    setParticleType(type) {
        if (!PARTICLE_TYPES.hasOwnProperty(type)) return;
        this.currentParticleType = type;
        document.querySelectorAll('.particle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
    }

    // --- Grid Operations ---

    resizeGrid() {
        const newWidth = parseInt(document.getElementById('grid-width').value) || 40;
        const newHeight = parseInt(document.getElementById('grid-height').value) || 30;

        if (newWidth < 10 || newWidth > 500 || newHeight < 10 || newHeight > 500) {
            alert('Grid size must be between 10 and 500');
            return;
        }

        // Create new grid (starts empty)
        const newGrid = new Grid(newWidth, newHeight);

        // Copy existing interior data (not borders)
        for (let y = 1; y < Math.min(this.gridHeight - 1, newHeight - 1); y++) {
            for (let x = 1; x < Math.min(this.gridWidth - 1, newWidth - 1); x++) {
                const cell = this.grid.get(x, y);
                newGrid.set(x, y, cell.type, cell.hidden, cell.bodyId);
            }
        }

        this.gridWidth = newWidth;
        this.gridHeight = newHeight;
        this.grid = newGrid;

        // Fill border walls for new grid
        this.fillBorderWalls();
        this.rebuildBodies();

        // Recalculate zoom bounds for new grid size
        this.updateZoomBounds();
        this.updateCanvasSize();
        this.updateZoomDisplay();
        this.saveState();
        this.render();
    }

    newLevel() {
        if (!confirm('Create new level? Unsaved changes will be lost.')) return;

        this.gridWidth = 40;
        this.gridHeight = 30;
        this.grid = new Grid(this.gridWidth, this.gridHeight);
        this.bodyManager = new BodyManager();
        this.selectedCells.clear();
        this.selectedBody = null;
        this.cursorCell = { x: 1, y: 1 };

        document.getElementById('grid-width').value = 40;
        document.getElementById('grid-height').value = 30;

        this.fillBorderWalls();
        this.updateZoomBounds();
        this.cellSize = this.maxCellSize;  // Start at max zoom
        this.updateCanvasSize();
        this.updateZoomDisplay();
        this.history = [];
        this.historyIndex = -1;
        this.saveState();
        this.updatePropertiesPanel();
        this.render();
    }

    // --- History (Undo/Redo) ---

    saveState() {
        const state = {
            gridWidth: this.gridWidth,
            gridHeight: this.gridHeight,
            cells: [],
            bodies: []
        };

        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const cell = this.grid.get(x, y);
                if (cell.type !== ParticleType.VOID) {
                    state.cells.push({ x, y, type: cell.type });
                }
            }
        }

        for (const [id, body] of this.bodyManager.bodies) {
            state.bodies.push({
                particles: body.particles.map(p => ({ x: p.x, y: p.y })),
                vx: body.vx,
                vy: body.vy
            });
        }

        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(JSON.stringify(state));
        this.historyIndex++;

        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    restoreState(stateJson) {
        const state = JSON.parse(stateJson);

        if (state.gridWidth !== this.gridWidth || state.gridHeight !== this.gridHeight) {
            this.gridWidth = state.gridWidth;
            this.gridHeight = state.gridHeight;
            this.grid = new Grid(this.gridWidth, this.gridHeight);
            document.getElementById('grid-width').value = this.gridWidth;
            document.getElementById('grid-height').value = this.gridHeight;
            this.updateCanvasSize();
        } else {
            // Clear grid
            for (let y = 0; y < this.gridHeight; y++) {
                for (let x = 0; x < this.gridWidth; x++) {
                    this.grid.setType(x, y, ParticleType.VOID);
                }
            }
        }

        // Restore cells
        for (const cell of state.cells) {
            this.grid.setType(cell.x, cell.y, cell.type);
        }

        // Restore bodies
        this.bodyManager = new BodyManager();
        for (const bodyData of state.bodies) {
            const body = this.bodyManager.createBody(bodyData.particles, bodyData.vx, bodyData.vy);
            for (const p of bodyData.particles) {
                this.grid.setBodyId(p.x, p.y, body.id);
            }
            // Rebuild bonds
            for (let i = 0; i < bodyData.particles.length; i++) {
                for (let j = i + 1; j < bodyData.particles.length; j++) {
                    const p1 = bodyData.particles[i];
                    const p2 = bodyData.particles[j];
                    const dist = Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
                    if (dist === 1) {
                        this.bodyManager.addBond(p1.x, p1.y, p2.x, p2.y);
                    }
                }
            }
        }

        this.selectedCells.clear();
        this.selectedBody = null;
        this.updatePropertiesPanel();
        this.render();
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
        }
    }

    // --- Save/Load ---

    getSavedLevels() {
        const json = localStorage.getItem(STORAGE_KEY);
        return json ? JSON.parse(json) : [];
    }

    showSaveDialog() {
        document.getElementById('dialog-title').textContent = 'Save Level';
        document.getElementById('dialog-content').innerHTML = `
            <input type="text" id="level-name" placeholder="Level name">
        `;
        document.getElementById('dialog-overlay').classList.remove('hidden');
        this.dialogMode = 'save';
        document.getElementById('level-name').focus();
    }

    showLoadDialog() {
        const levels = this.getSavedLevels();
        let html = '<div class="level-list">';

        if (levels.length === 0) {
            html += '<p class="hint">No saved levels</p>';
        } else {
            for (let i = 0; i < levels.length; i++) {
                const level = levels[i];
                html += `
                    <div class="level-item" data-index="${i}">
                        <div class="level-name">${level.name}</div>
                        <div class="level-info">${level.gridWidth}x${level.gridHeight}</div>
                    </div>
                `;
            }
        }

        html += '</div>';
        document.getElementById('dialog-title').textContent = 'Load Level';
        document.getElementById('dialog-content').innerHTML = html;
        document.getElementById('dialog-overlay').classList.remove('hidden');
        this.dialogMode = 'load';
        this.selectedLevelIndex = -1;

        document.querySelectorAll('.level-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.level-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                this.selectedLevelIndex = parseInt(item.dataset.index);
            });
        });
    }

    hideDialog() {
        document.getElementById('dialog-overlay').classList.add('hidden');
    }

    onDialogOk() {
        if (this.dialogMode === 'save') {
            const name = document.getElementById('level-name').value.trim();
            if (!name) {
                alert('Please enter a level name');
                return;
            }
            this.saveLevel(name);
        } else if (this.dialogMode === 'load') {
            if (this.selectedLevelIndex >= 0) {
                this.loadLevel(this.selectedLevelIndex);
            }
        }
        this.hideDialog();
    }

    saveLevel(name) {
        const level = {
            name,
            gridWidth: this.gridWidth,
            gridHeight: this.gridHeight,
            grid: this.exportGridString(),
            bodies: []
        };

        for (const [id, body] of this.bodyManager.bodies) {
            level.bodies.push({
                particles: body.particles.map(p => ({ x: p.x, y: p.y })),
                vx: body.vx,
                vy: body.vy
            });
        }

        const levels = this.getSavedLevels();
        levels.push(level);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
    }

    loadLevel(index) {
        const levels = this.getSavedLevels();
        const level = levels[index];

        this.gridWidth = level.gridWidth;
        this.gridHeight = level.gridHeight;
        this.grid = new Grid(this.gridWidth, this.gridHeight);

        document.getElementById('grid-width').value = this.gridWidth;
        document.getElementById('grid-height').value = this.gridHeight;

        // Parse grid string
        if (level.grid) {
            const lines = level.grid.trim().split('\n');
            for (let y = 0; y < lines.length && y < this.gridHeight; y++) {
                const line = lines[y];
                for (let x = 0; x < line.length && x < this.gridWidth; x++) {
                    const char = line[x];
                    let type = ParticleType.VOID;
                    switch (char) {
                        case '#': type = ParticleType.WALL; break;
                        case 'M': type = ParticleType.MATTER; break;
                        case 'A': type = ParticleType.ATTRACTOR; break;
                    }
                    this.grid.setType(x, y, type);
                }
            }
        }

        // Load bodies
        this.bodyManager = new BodyManager();
        if (level.bodies) {
            for (const bodyData of level.bodies) {
                const body = this.bodyManager.createBody(bodyData.particles, bodyData.vx || 0, bodyData.vy || 0);
                for (const p of bodyData.particles) {
                    this.grid.setBodyId(p.x, p.y, body.id);
                }
            }
        }

        this.rebuildBodies();
        this.cursorCell = { x: 1, y: 1 };
        this.selectedCells.clear();
        this.selectionAnchor = null;
        this.updateZoomBounds();
        this.updateCanvasSize();
        this.updateZoomDisplay();
        this.history = [];
        this.historyIndex = -1;
        this.saveState();
        this.updatePropertiesPanel();
        this.render();
    }

    // --- Test Level ---

    testLevel() {
        const level = {
            name: 'Editor Test',
            width: this.gridWidth,
            height: this.gridHeight,
            grid: this.exportGridString(),
            bodies: []
        };

        for (const [id, body] of this.bodyManager.bodies) {
            level.bodies.push({
                particles: body.particles.map(p => ({ x: p.x, y: p.y })),
                vx: body.vx,
                vy: body.vy
            });
        }

        sessionStorage.setItem('testLevel', JSON.stringify(level));
        window.open('index.html?test=1', '_blank');
    }

    exportGridString() {
        let str = '';
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const type = this.grid.get(x, y).type;
                switch (type) {
                    case ParticleType.WALL: str += '#'; break;
                    case ParticleType.MATTER: str += 'M'; break;
                    case ParticleType.ATTRACTOR: str += 'A'; break;
                    default: str += '.';
                }
            }
            str += '\n';
        }
        return str.trim();
    }

    // --- Properties Panel ---

    updatePropertiesPanel() {
        const panel = document.getElementById('properties-content');
        const cell = this.grid.get(this.cursorCell.x, this.cursorCell.y);

        // Get type name
        const typeNames = {
            [ParticleType.VOID]: 'Void',
            [ParticleType.WALL]: 'Wall',
            [ParticleType.MATTER]: 'Matter',
            [ParticleType.ATTRACTOR]: 'Attractor'
        };
        const typeName = typeNames[cell.type] || 'Unknown';

        // Check for body under cursor
        let bodyAtCursor = null;
        if (cell.bodyId !== -1) {
            bodyAtCursor = this.bodyManager.getBody(cell.bodyId);
        }

        let html = `<p>Cell: (${this.cursorCell.x}, ${this.cursorCell.y})</p>`;
        html += `<p>Type: ${typeName}</p>`;

        if (bodyAtCursor) {
            html += `<hr style="border-color:#333;margin:8px 0">`;
            html += `<p><strong>Body</strong> (${bodyAtCursor.particles.length} cells)</p>`;
            html += `
                <label>Velocity X: <input type="number" id="prop-vx" value="${bodyAtCursor.vx}"></label>
                <label>Velocity Y: <input type="number" id="prop-vy" value="${bodyAtCursor.vy}"></label>
            `;
            panel.innerHTML = html;

            // Auto-apply on change
            const applyVelocity = () => {
                const newVx = parseInt(document.getElementById('prop-vx').value) || 0;
                const newVy = parseInt(document.getElementById('prop-vy').value) || 0;
                if (bodyAtCursor.vx !== newVx || bodyAtCursor.vy !== newVy) {
                    bodyAtCursor.vx = newVx;
                    bodyAtCursor.vy = newVy;
                    this.saveState();
                }
            };
            document.getElementById('prop-vx').addEventListener('input', applyVelocity);
            document.getElementById('prop-vy').addEventListener('input', applyVelocity);
        } else {
            panel.innerHTML = html;
        }
    }

    updateStatusBar(cell) {
        if (cell && this.grid.inBounds(cell.x, cell.y)) {
            document.getElementById('status-position').textContent = `Position: (${cell.x}, ${cell.y})`;
        }
    }

    // --- Keyboard Shortcuts ---

    onKeyDown(e) {
        // Don't handle if typing in input
        if (e.target.tagName === 'INPUT') return;

        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'z': e.preventDefault(); this.undo(); break;
                case 'y': e.preventDefault(); this.redo(); break;
                case 's': e.preventDefault(); this.showSaveDialog(); break;
                case 'o': e.preventDefault(); this.showLoadDialog(); break;
                case 'n': e.preventDefault(); this.newLevel(); break;
                case 't': e.preventDefault(); this.testLevel(); break;
                case 'c': e.preventDefault(); this.copySelection(); break;
                case 'v': e.preventDefault(); this.paste(); break;
            }
        } else {
            switch (e.key.toLowerCase()) {
                case 'v': this.setTool('select'); break;
                case 'p': this.setTool('paint'); break;
                case 'e': this.setTool('erase'); break;
                case '1':
                case '2':
                case '3':
                    {
                        const typeMap = { '1': 'wall', '2': 'matter', '3': 'attractor' };
                        const type = PARTICLE_TYPES[typeMap[e.key]];

                        // Always update selected particle type
                        this.setParticleType(typeMap[e.key]);

                        // If there's a selection, fill it
                        if (this.selectedCells.size > 0) {
                            for (const key of this.selectedCells) {
                                const [x, y] = key.split(',').map(Number);
                                if (!this.isBorderCell(x, y)) {
                                    this.grid.setType(x, y, type);
                                }
                            }
                            this.rebuildBodies();
                            this.saveState();
                            this.render();
                        } else if (!this.isBorderCell(this.cursorCell.x, this.cursorCell.y)) {
                            // No selection: fill cursor cell
                            this.grid.setType(this.cursorCell.x, this.cursorCell.y, type);
                            this.rebuildBodies();
                            this.saveState();
                            this.render();
                            this.updatePropertiesPanel();
                        }
                    }
                    break;
                case '+':
                case '=':
                    this.zoomIn();
                    break;
                case '-':
                    this.zoomOut();
                    break;
                case 'delete':
                case 'backspace':
                    e.preventDefault();
                    if (this.selectedCells.size > 0) {
                        // Delete selection
                        for (const key of this.selectedCells) {
                            const [x, y] = key.split(',').map(Number);
                            if (!this.isBorderCell(x, y)) {
                                this.grid.setType(x, y, ParticleType.VOID);
                            }
                        }
                        this.selectedCells.clear();
                        this.selectionAnchor = null;
                        this.rebuildBodies();
                        this.saveState();
                        this.render();
                    } else if (!this.isBorderCell(this.cursorCell.x, this.cursorCell.y)) {
                        // No selection: delete cursor cell
                        this.grid.setType(this.cursorCell.x, this.cursorCell.y, ParticleType.VOID);
                        this.rebuildBodies();
                        this.saveState();
                        this.render();
                        this.updatePropertiesPanel();
                    }
                    break;
                case 'arrowup':
                case 'arrowdown':
                case 'arrowleft':
                case 'arrowright':
                    e.preventDefault();
                    this.handleArrowKey(e.key, e.shiftKey);
                    break;
            }
        }
    }

    handleArrowKey(key, shiftKey) {
        let dx = 0, dy = 0;
        switch (key.toLowerCase()) {
            case 'arrowup': dy = -1; break;
            case 'arrowdown': dy = 1; break;
            case 'arrowleft': dx = -1; break;
            case 'arrowright': dx = 1; break;
        }

        const newX = this.cursorCell.x + dx;
        const newY = this.cursorCell.y + dy;

        if (!this.grid.inBounds(newX, newY)) return;

        // Shift+arrow: keyboard area selection
        if (shiftKey) {
            // Initialize selection anchor if not set
            if (!this.selectionAnchor) {
                this.selectionAnchor = { x: this.cursorCell.x, y: this.cursorCell.y };
            }
            this.cursorCell = { x: newX, y: newY };
            this.updateAreaSelection(this.selectionAnchor, this.cursorCell);
        } else {
            // Clear selection anchor when moving without shift
            this.selectionAnchor = null;
            this.cursorCell = { x: newX, y: newY };

            // If in paint mode and not on border, paint the cell
            if (this.currentTool === 'paint' && !this.isBorderCell(newX, newY)) {
                const type = PARTICLE_TYPES[this.currentParticleType];
                this.grid.setType(newX, newY, type);
                if (type === ParticleType.MATTER || type === ParticleType.ATTRACTOR) {
                    this.rebuildBodies();
                }
                this.saveState();
            } else if (this.currentTool === 'erase' && !this.isBorderCell(newX, newY)) {
                this.grid.setType(newX, newY, ParticleType.VOID);
                this.rebuildBodies();
                this.saveState();
            }
        }

        this.render();
        this.updateStatusBar(this.cursorCell);
        this.updatePropertiesPanel();
        this.scrollCursorIntoView();
    }

    // --- Rendering ---

    render() {
        const ctx = this.ctx;
        const size = this.cellSize;

        // Clear
        ctx.fillStyle = ParticleColors[ParticleType.VOID];
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw cells
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const cell = this.grid.get(x, y);
                if (cell.type !== ParticleType.VOID) {
                    ctx.fillStyle = ParticleColors[cell.type];
                    ctx.fillRect(x * size, y * size, size, size);
                }
            }
        }

        // Draw grid lines (subtle)
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= this.gridWidth; x++) {
            ctx.beginPath();
            ctx.moveTo(x * size, 0);
            ctx.lineTo(x * size, this.gridHeight * size);
            ctx.stroke();
        }
        for (let y = 0; y <= this.gridHeight; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * size);
            ctx.lineTo(this.gridWidth * size, y * size);
            ctx.stroke();
        }

        // Draw bonds
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        for (const [[x1, y1], [x2, y2]] of this.bodyManager.getAllBonds()) {
            const cx1 = (x1 + 0.5) * size;
            const cy1 = (y1 + 0.5) * size;
            const cx2 = (x2 + 0.5) * size;
            const cy2 = (y2 + 0.5) * size;

            ctx.beginPath();
            ctx.moveTo(cx1, cy1);
            ctx.lineTo(cx2, cy2);
            ctx.stroke();
        }

        // Draw selection
        if (this.selectedCells.size > 0) {
            ctx.strokeStyle = '#7ec8e3';
            ctx.lineWidth = 2;
            for (const key of this.selectedCells) {
                const [x, y] = key.split(',').map(Number);
                ctx.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2);
            }
        }

        // Draw cursor
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]);
        ctx.strokeRect(
            this.cursorCell.x * size + 1,
            this.cursorCell.y * size + 1,
            size - 2,
            size - 2
        );
        ctx.setLineDash([]);
    }
}

// Initialize editor when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new LevelEditor());
} else {
    new LevelEditor();
}
