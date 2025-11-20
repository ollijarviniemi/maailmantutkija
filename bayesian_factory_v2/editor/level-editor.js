/**
 * Level Editor
 *
 * Interactive editor for creating Bayesian Factory levels
 */

class LevelEditor {
  constructor() {
    this.canvas = document.getElementById('editor-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.gridSize = 64;
    this.gridWidth = 10;
    this.gridHeight = 8;

    // Editor state
    this.currentTool = 'select';
    this.selectedComponentType = null;
    this.pendingComponentParams = {}; // Parameters for component about to be placed
    this.components = [];
    this.connections = [];
    this.hypotheses = {}; // Map of componentId -> alternatives array
    this.selectedComponent = null;
    this.clipboard = null;
    this.nextComponentId = 1;

    // Hypothesis system
    this.hypothesisEngine = new HypothesisEngine();
    this.hypothesisScript = '';
    this.sackTemplates = {}; // templateId -> template data
    this.selectedTemplate = null;

    // History for undo/redo
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 50;

    // Interaction state
    this.isDragging = false;
    this.dragStart = null;
    this.connectFrom = null;
    this.mouseGridPos = null; // Track mouse position for preview

    this.init();
  }

  init() {
    this.updateCanvasSize();
    this.populateComponentPalette();
    this.setupEventListeners();
    this.updateAutomaticConnections(); // Initialize connections
    this.saveState();
    this.render();
  }

  updateCanvasSize() {
    this.canvas.width = this.gridWidth * this.gridSize;
    this.canvas.height = this.gridHeight * this.gridSize;
  }

  populateComponentPalette() {
    const palette = document.getElementById('component-palette');
    const componentTypes = [
      {type: 'sack', icon: '🎒', hotkey: 'S'},
      {type: 'arm', icon: '🦾', hotkey: 'A'},
      {type: 'conveyor', icon: '→', hotkey: 'B'},
      {type: 'conveyor-turn', icon: '↪', hotkey: 'T'},
      {type: 'shuffler', icon: '🔀', hotkey: 'H'},
      {type: 'splitter', icon: '⑂', hotkey: 'L'},
      {type: 'observation', icon: '🗑️', hotkey: 'O'},
      {type: 'black-pit', icon: '⚫', hotkey: 'K'},
      {type: 'duplicator', icon: '×', hotkey: 'U'},
      {type: 'filter', icon: '⊲', hotkey: 'F'},
      {type: 'merger', icon: '⊳', hotkey: 'G'}
    ];

    componentTypes.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'component-btn';
      btn.dataset.type = item.type;
      btn.innerHTML = `
        <span class="icon">${item.icon}</span>
        <span class="name">${item.type}</span>
        <span class="hotkey">${item.hotkey}</span>
      `;
      btn.onclick = () => this.selectComponentType(item.type);
      palette.appendChild(btn);
    });
  }

  setupEventListeners() {
    // Canvas events
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.onMouseLeave(e));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Tool buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setTool(btn.dataset.tool);
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.onKeyDown(e));

    // Header buttons
    document.getElementById('new-level').onclick = () => this.newLevel();
    document.getElementById('load-level').onclick = () => this.loadLevel();
    document.getElementById('save-level').onclick = () => this.saveLevel();
    document.getElementById('test-level').onclick = () => this.testLevel();

    // Grid size buttons
    document.getElementById('increase-width').onclick = () => this.changeGridSize('width', 1);
    document.getElementById('decrease-width').onclick = () => this.changeGridSize('width', -1);
    document.getElementById('increase-height').onclick = () => this.changeGridSize('height', 1);
    document.getElementById('decrease-height').onclick = () => this.changeGridSize('height', -1);

    // Update grid size displays
    this.updateGridSizeDisplays();

    // Hypothesis script panel
    document.getElementById('execute-script').onclick = () => this.executeHypothesisScript();
  }

  // Tool Management
  setTool(tool) {
    this.currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
    this.selectedComponentType = null;
    document.querySelectorAll('.component-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    this.updateCursor();
    this.render();
  }

  selectComponentType(type) {
    this.selectedComponentType = type;
    this.currentTool = 'place';

    // Deselect any currently selected component on the board
    this.selectedComponent = null;
    this.updatePropertiesPanel();

    // Initialize pending params with defaults
    const spec = ComponentRegistry.get(type);
    this.pendingComponentParams = this.getDefaultParams(spec);

    document.querySelectorAll('.component-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    this.updateCursor();
    this.render(); // Re-render to show pending rotation in cursor preview if applicable
  }

  updateCursor() {
    this.canvas.className = '';
    if (this.currentTool === 'select') this.canvas.classList.add('selecting');
    else if (this.currentTool === 'move') this.canvas.classList.add('moving');
    else if (this.currentTool === 'connect') this.canvas.classList.add('connecting');
    else if (this.currentTool === 'delete') this.canvas.classList.add('deleting');
  }

  // Mouse Events
  onMouseDown(e) {
    const gridPos = this.getMouseGridPosition(e);
    const clickedComponent = this.getComponentAt(gridPos.x, gridPos.y);

    // Handle tool-specific actions on clicked components
    if (clickedComponent) {
      // Delete tool: delete the component
      if (this.currentTool === 'delete') {
        this.deleteComponent(clickedComponent);
        return;
      }

      // Connect tool: handle connection logic
      if (this.currentTool === 'connect') {
        if (!this.connectFrom) {
          this.connectFrom = clickedComponent;
        } else {
          this.createConnection(this.connectFrom, clickedComponent);
          this.connectFrom = null;
        }
        this.render();
        return;
      }

      // Special handling for duplicator quadrant clicking
      // Only handle quadrant clicks if duplicator is already selected (not first click)
      if (clickedComponent.type === 'duplicator' &&
          this.currentTool === 'select' &&
          this.selectedComponent === clickedComponent) {
        const handled = this.handleDuplicatorClick(clickedComponent, e, gridPos);
        if (handled) {
          return;
        }
      }

      // Special handling for shuffler quadrant/center clicking
      if (clickedComponent.type === 'shuffler' &&
          this.currentTool === 'select' &&
          this.selectedComponent === clickedComponent) {
        const handled = this.handleShufflerClick(clickedComponent, e, gridPos);
        if (handled) {
          return;
        }
      }

      // Default: select component and start drag
      this.selectComponent(clickedComponent);
      this.selectedComponentType = null;
      this.pendingComponentParams = {};

      // Start dragging
      this.isDragging = true;
      this.dragStart = {
        x: gridPos.x - clickedComponent.position.x,
        y: gridPos.y - clickedComponent.position.y
      };
      return;
    }

    // If no component clicked, proceed with tool actions
    if (this.currentTool === 'place' && this.selectedComponentType) {
      this.placeComponent(gridPos.x, gridPos.y);
    } else if (this.currentTool === 'select') {
      // Clicking empty space deselects
      this.selectComponent(null);
    } else if (this.currentTool === 'connect') {
      // Clicking empty space cancels connection
      this.connectFrom = null;
      this.render();
    } else if (this.currentTool === 'delete') {
      // Nothing to delete on empty space
    }
  }

  onMouseMove(e) {
    const gridPos = this.getMouseGridPosition(e);
    this.mouseGridPos = gridPos;

    if (this.isDragging && this.selectedComponent) {
      this.selectedComponent.position.x = Math.max(0, Math.min(this.gridWidth - 1, gridPos.x - this.dragStart.x));
      this.selectedComponent.position.y = Math.max(0, Math.min(this.gridHeight - 1, gridPos.y - this.dragStart.y));
      this.render();
    } else if (this.currentTool === 'place' && this.selectedComponentType) {
      // Re-render to update preview position
      this.render();
    }
  }

  onMouseUp(e) {
    if (this.isDragging) {
      this.isDragging = false;
      this.updateAutomaticConnections();
      this.saveState();
      this.render();
    }
  }

  onMouseLeave(e) {
    // Clear mouse position to hide preview
    this.mouseGridPos = null;
    this.render();
  }

  // Keyboard Events
  onKeyDown(e) {
    // Don't process shortcuts when typing in text fields
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
      return;
    }

    const ctrl = e.ctrlKey || e.metaKey;

    // ESC to deselect
    if (e.key === 'Escape') {
      this.selectedComponent = null;
      this.selectedComponentType = null;
      this.pendingComponentParams = {};
      this.updatePropertiesPanel();
      this.render();
      e.preventDefault();
      return;
    }

    // Tool shortcuts
    if (!ctrl && !e.shiftKey) {
      if (e.key === 'v' || e.key === 'V') {
        this.setTool('select');
        e.preventDefault();
      } else if (e.key === 'm' || e.key === 'M') {
        this.setTool('move');
        e.preventDefault();
      } else if (e.key === 'c' || e.key === 'C') {
        this.setTool('connect');
        e.preventDefault();
      } else if (e.key === 'd' || e.key === 'D') {
        this.setTool('delete');
        e.preventDefault();
      } else if (e.key === 'r' || e.key === 'R') {
        // Rotate selected component OR rotate component about to be placed
        if (this.selectedComponent) {
          this.rotateComponent(this.selectedComponent);
          e.preventDefault();
        } else if (this.selectedComponentType) {
          this.rotatePendingComponent();
          e.preventDefault();
        }
      } else if (e.key === 'e' || e.key === 'E') {
        // Cycle filter color for selected filter OR filter about to be placed
        if (this.selectedComponent && this.selectedComponent.type === 'filter') {
          this.cycleFilterColor(this.selectedComponent);
          e.preventDefault();
        } else if (this.selectedComponentType === 'filter') {
          this.cyclePendingFilterColor();
          e.preventDefault();
        }
      }
      // Number keys: set shuffler capacity (minBufferSize)
      else if (e.key >= '0' && e.key <= '9') {
        if (this.selectedComponent && this.selectedComponent.type === 'shuffler') {
          const capacity = parseInt(e.key);
          if (capacity >= 0) {
            this.selectedComponent.params.minBufferSize = capacity;
            this.saveState();
            this.render();
            this.setStatus(`Shuffler capacity: ${capacity}`, 'info');
            e.preventDefault();
          }
        }
      }
      // Component shortcuts - toggle if already selected
      else if (e.key === 's' || e.key === 'S') {
        if (this.selectedComponentType === 'sack') {
          this.selectedComponentType = null;
          this.pendingComponentParams = {};
          document.querySelectorAll('.component-btn').forEach(btn => btn.classList.remove('active'));
          this.render();
        } else {
          this.selectComponentType('sack');
        }
        e.preventDefault();
      } else if (e.key === 'a' || e.key === 'A') {
        if (this.selectedComponentType === 'arm') {
          this.selectedComponentType = null;
          this.pendingComponentParams = {};
          document.querySelectorAll('.component-btn').forEach(btn => btn.classList.remove('active'));
          this.render();
        } else {
          this.selectComponentType('arm');
        }
        e.preventDefault();
      } else if (e.key === 'b' || e.key === 'B') {
        if (this.selectedComponentType === 'conveyor') {
          this.selectedComponentType = null;
          this.pendingComponentParams = {};
          document.querySelectorAll('.component-btn').forEach(btn => btn.classList.remove('active'));
          this.render();
        } else {
          this.selectComponentType('conveyor');
        }
        e.preventDefault();
      } else if (e.key === 't' || e.key === 'T') {
        if (this.selectedComponentType === 'conveyor-turn') {
          this.selectedComponentType = null;
          this.pendingComponentParams = {};
          document.querySelectorAll('.component-btn').forEach(btn => btn.classList.remove('active'));
          this.render();
        } else {
          this.selectComponentType('conveyor-turn');
        }
        e.preventDefault();
      } else if (e.key === 'h' || e.key === 'H') {
        if (this.selectedComponentType === 'shuffler') {
          this.selectedComponentType = null;
          this.pendingComponentParams = {};
          document.querySelectorAll('.component-btn').forEach(btn => btn.classList.remove('active'));
          this.render();
        } else {
          this.selectComponentType('shuffler');
        }
        e.preventDefault();
      } else if (e.key === 'l' || e.key === 'L') {
        if (this.selectedComponentType === 'splitter') {
          this.selectedComponentType = null;
          this.pendingComponentParams = {};
          document.querySelectorAll('.component-btn').forEach(btn => btn.classList.remove('active'));
          this.render();
        } else {
          this.selectComponentType('splitter');
        }
        e.preventDefault();
      } else if (e.key === 'o' || e.key === 'O') {
        if (this.selectedComponentType === 'observation') {
          this.selectedComponentType = null;
          this.pendingComponentParams = {};
          document.querySelectorAll('.component-btn').forEach(btn => btn.classList.remove('active'));
          this.render();
        } else {
          this.selectComponentType('observation');
        }
        e.preventDefault();
      } else if (e.key === 'k' || e.key === 'K') {
        if (this.selectedComponentType === 'black-pit') {
          this.selectedComponentType = null;
          this.pendingComponentParams = {};
          document.querySelectorAll('.component-btn').forEach(btn => btn.classList.remove('active'));
          this.render();
        } else {
          this.selectComponentType('black-pit');
        }
        e.preventDefault();
      } else if (e.key === 'u' || e.key === 'U') {
        if (this.selectedComponentType === 'duplicator') {
          this.selectedComponentType = null;
          this.pendingComponentParams = {};
          document.querySelectorAll('.component-btn').forEach(btn => btn.classList.remove('active'));
          this.render();
        } else {
          this.selectComponentType('duplicator');
        }
        e.preventDefault();
      } else if (e.key === 'f' || e.key === 'F') {
        if (this.selectedComponentType === 'filter') {
          this.selectedComponentType = null;
          this.pendingComponentParams = {};
          document.querySelectorAll('.component-btn').forEach(btn => btn.classList.remove('active'));
          this.render();
        } else {
          this.selectComponentType('filter');
        }
        e.preventDefault();
      } else if (e.key === 'g' || e.key === 'G') {
        if (this.selectedComponentType === 'merger') {
          this.selectedComponentType = null;
          this.pendingComponentParams = {};
          document.querySelectorAll('.component-btn').forEach(btn => btn.classList.remove('active'));
          this.render();
        } else {
          this.selectComponentType('merger');
        }
        e.preventDefault();
      } else if (e.key === 'p' || e.key === 'P') {
        // Toggle plex glass on selected component (all types except sack)
        if (this.selectedComponent && this.selectedComponent.type !== 'sack') {
          this.selectedComponent.params.plex = !this.selectedComponent.params.plex;
          this.updatePropertiesPanel();
          this.saveState();
          this.render();
          e.preventDefault();
        }
      }
    }

    // Delete
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.selectedComponent) {
        this.deleteComponent(this.selectedComponent);
        e.preventDefault();
      }
    }

    // Undo/Redo
    if (ctrl && e.key === 'z') {
      if (e.shiftKey) {
        this.redo();
      } else {
        this.undo();
      }
      e.preventDefault();
    }
    if (ctrl && e.key === 'y') {
      this.redo();
      e.preventDefault();
    }

    // Copy/Paste
    if (ctrl && e.key === 'c') {
      if (this.selectedComponent) {
        this.copy();
        e.preventDefault();
      }
    }
    if (ctrl && e.key === 'v') {
      this.paste();
      e.preventDefault();
    }
  }

  // Component Operations
  placeComponent(x, y) {
    // Check if position is valid
    if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
      return;
    }

    // Check if position is occupied
    if (this.getComponentAt(x, y)) {
      this.setStatus('Position occupied', 'error');
      return;
    }

    const spec = ComponentRegistry.get(this.selectedComponentType);
    // Use pending params (which include any rotations applied before placement)
    // Ensure all default params are present
    const defaultParams = this.getDefaultParams(spec);
    const component = {
      id: this.generateId(),
      type: this.selectedComponentType,
      position: {x, y},
      params: {...defaultParams, ...this.pendingComponentParams}
    };

    // Link template for sacks (if selected)
    if (component.type === 'sack') {
      if (this.selectedTemplate && this.sackTemplates[this.selectedTemplate]) {
        // Store template link - contents will be set when hypothesis is sampled
        component.params.linkedTemplate = this.selectedTemplate;
        component.params.label = this.selectedTemplate; // Show template name
        // Note: Do NOT set contents here - sack represents uncertain hypotheses
      } else {
        // Default hypotheses if no template
        this.hypotheses[component.id] = [
          {red: 7, blue: 3},
          {red: 3, blue: 7}
        ];
        // For non-template sacks, set default contents
        component.params.contents = {red: 5, blue: 5};
      }
    }

    this.components.push(component);
    this.updateAutomaticConnections();
    this.saveState();
    this.setStatus(`Placed ${spec.displayName}`, 'success');
    this.render();
  }

  deleteComponent(component) {
    const index = this.components.indexOf(component);
    if (index > -1) {
      this.components.splice(index, 1);

      if (this.selectedComponent === component) {
        this.selectedComponent = null;
        this.updatePropertiesPanel();
      }

      this.updateAutomaticConnections();
      this.saveState();
      this.setStatus('Component deleted', 'success');
      this.render();
    }
  }

  rotateComponent(component) {
    // Rotate conveyors and turns
    if (component.type === 'conveyor') {
      const directions = ['right', 'down', 'left', 'up'];
      const current = directions.indexOf(component.params.direction);
      component.params.direction = directions[(current + 1) % 4];
    } else if (component.type === 'conveyor-turn') {
      const turns = [
        'right-to-down', 'down-to-left', 'left-to-up', 'up-to-right',
        'right-to-up', 'up-to-left', 'left-to-down', 'down-to-right'
      ];
      const current = turns.indexOf(component.params.turn);
      component.params.turn = turns[(current + 1) % 8];
    } else if (component.type === 'duplicator') {
      // Rotate duplicator by rotating all sides in outputPattern
      const directions = ['right', 'down', 'left', 'up'];
      const pattern = component.params.outputPattern || [{side: 'right', count: component.params.copies || 2}];

      component.params.outputPattern = pattern.map(entry => {
        const currentIdx = directions.indexOf(entry.side);
        const newSide = directions[(currentIdx + 1) % 4];
        return {...entry, side: newSide};
      });
    } else if (component.type === 'merger') {
      // Rotate merger through 12 configurations
      const spec = ComponentRegistry.get('merger');
      if (spec && spec.getNextRotation) {
        const nextConfig = spec.getNextRotation(component.params);
        component.params.input1Side = nextConfig.input1Side;
        component.params.input2Side = nextConfig.input2Side;
        component.params.direction = nextConfig.direction;
      }
    } else if (component.type === 'filter') {
      // Rotate filter through 12 configurations
      const spec = ComponentRegistry.get('filter');
      if (spec && spec.getNextRotation) {
        const nextConfig = spec.getNextRotation(component.params);
        component.params.inputSide = nextConfig.inputSide;
        component.params.matchOutputSide = nextConfig.matchOutputSide;
        component.params.nonMatchOutputSide = nextConfig.nonMatchOutputSide;
      }
    } else if (component.type === 'splitter') {
      // Rotate components with directional flow
      const directions = ['right', 'down', 'left', 'up'];
      const currentDir = component.params.direction || (component.type === 'splitter' ? 'right' : 'down');
      const current = directions.indexOf(currentDir);
      component.params.direction = directions[(current + 1) % 4];
    } else if (component.type === 'shuffler') {
      // Rotate shuffler by rotating all sides in outputPattern
      const directions = ['right', 'down', 'left', 'up'];
      const pattern = component.params.outputPattern || [{side: component.params.outputSide || 'down', count: component.params.numInputs || 2}];

      component.params.outputPattern = pattern.map(entry => {
        if (entry.retain) {
          return entry; // Retained entries don't have a side
        }
        const currentIdx = directions.indexOf(entry.side);
        const newSide = directions[(currentIdx + 1) % 4];
        return {...entry, side: newSide};
      });
    }

    this.updateAutomaticConnections();
    this.saveState();
    this.updatePropertiesPanel();
    this.render();
  }

  rotatePendingComponent() {
    // Rotate the component type that's about to be placed
    const type = this.selectedComponentType;

    if (type === 'conveyor') {
      const directions = ['right', 'down', 'left', 'up'];
      const current = directions.indexOf(this.pendingComponentParams.direction || 'right');
      this.pendingComponentParams.direction = directions[(current + 1) % 4];
    } else if (type === 'conveyor-turn') {
      const turns = [
        'right-to-down', 'down-to-left', 'left-to-up', 'up-to-right',
        'right-to-up', 'up-to-left', 'left-to-down', 'down-to-right'
      ];
      const current = turns.indexOf(this.pendingComponentParams.turn || 'right-to-down');
      this.pendingComponentParams.turn = turns[(current + 1) % 8];
    } else if (type === 'merger') {
      // Rotate merger through 12 configurations
      const spec = ComponentRegistry.get('merger');
      if (spec && spec.getNextRotation) {
        const nextConfig = spec.getNextRotation(this.pendingComponentParams);
        this.pendingComponentParams.input1Side = nextConfig.input1Side;
        this.pendingComponentParams.input2Side = nextConfig.input2Side;
        this.pendingComponentParams.direction = nextConfig.direction;
      }
    } else if (type === 'filter') {
      // Rotate filter through 12 configurations
      const spec = ComponentRegistry.get('filter');
      if (spec && spec.getNextRotation) {
        const nextConfig = spec.getNextRotation(this.pendingComponentParams);
        this.pendingComponentParams.inputSide = nextConfig.inputSide;
        this.pendingComponentParams.matchOutputSide = nextConfig.matchOutputSide;
        this.pendingComponentParams.nonMatchOutputSide = nextConfig.nonMatchOutputSide;
      }
    } else if (type === 'splitter') {
      const directions = ['right', 'down', 'left', 'up'];
      const currentDir = this.pendingComponentParams.direction || (type === 'splitter' ? 'right' : 'down');
      const current = directions.indexOf(currentDir);
      this.pendingComponentParams.direction = directions[(current + 1) % 4];
    } else if (type === 'duplicator') {
      // Rotate duplicator by rotating all sides in outputPattern
      const directions = ['right', 'down', 'left', 'up'];
      const pattern = this.pendingComponentParams.outputPattern || [{side: 'right', count: this.pendingComponentParams.copies || 2}];

      this.pendingComponentParams.outputPattern = pattern.map(entry => {
        const currentIdx = directions.indexOf(entry.side);
        const newSide = directions[(currentIdx + 1) % 4];
        return {...entry, side: newSide};
      });
    } else if (type === 'shuffler') {
      // Rotate shuffler by rotating all sides in outputPattern
      const directions = ['right', 'down', 'left', 'up'];
      const pattern = this.pendingComponentParams.outputPattern || [{side: this.pendingComponentParams.outputSide || 'down', count: this.pendingComponentParams.numInputs || 2}];

      this.pendingComponentParams.outputPattern = pattern.map(entry => {
        if (entry.retain) {
          return entry; // Retained entries don't have a side
        }
        const currentIdx = directions.indexOf(entry.side);
        const newSide = directions[(currentIdx + 1) % 4];
        return {...entry, side: newSide};
      });
    }

    this.setStatus(`Rotated ${type} to ${this.pendingComponentParams.direction || this.pendingComponentParams.turn || this.pendingComponentParams.outputSide}`, 'info');
    this.render();
  }

  cycleFilterColor(component) {
    if (component.type !== 'filter') return;

    if (!window.BallColors) {
      throw new Error('BallColors not loaded!');
    }

    const currentColor = component.params.targetColor || 'red';
    component.params.targetColor = window.BallColors.getNext(currentColor);

    this.updateAutomaticConnections();
    this.saveState();
    this.updatePropertiesPanel();
    this.render();

    this.setStatus(`Filter color: ${component.params.targetColor}`, 'info');
  }

  cyclePendingFilterColor() {
    if (this.selectedComponentType !== 'filter') return;

    if (!window.BallColors) {
      throw new Error('BallColors not loaded!');
    }

    const currentColor = this.pendingComponentParams.targetColor || 'red';
    this.pendingComponentParams.targetColor = window.BallColors.getNext(currentColor);

    this.render();

    this.setStatus(`Filter color: ${this.pendingComponentParams.targetColor}`, 'info');
  }

  // Handle duplicator quadrant clicks
  handleDuplicatorClick(component, event, gridPos) {
    // Get pixel position within component, accounting for canvas scaling
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const pixelX = (event.clientX - rect.left) * scaleX;
    const pixelY = (event.clientY - rect.top) * scaleY;


    // Calculate relative position within component (0-gridSize range)
    const compPixelX = pixelX - component.position.x * this.gridSize;
    const compPixelY = pixelY - component.position.y * this.gridSize;


    // Determine quadrant using diagonal divisions
    // Diagonals: y = x and y = gridSize - x
    // Four triangular regions: up, right, down, left
    let side;


    if (compPixelY < compPixelX && compPixelY < (this.gridSize - compPixelX)) {
      side = 'up';
    } else if (compPixelY < compPixelX && compPixelY >= (this.gridSize - compPixelX)) {
      side = 'right';
    } else if (compPixelY >= compPixelX && compPixelY >= (this.gridSize - compPixelX)) {
      side = 'down';
    } else {
      side = 'left';
    }


    // Initialize sides if not present
    if (!component.params.sides) {
      const spec = ComponentRegistry.get('duplicator');
      component.params.sides = spec.behavior.getDefaultSides();
    }

    const isLeftClick = event.button === 0;
    const isRightClick = event.button === 2;

    if (isLeftClick) {
      // Cycle side type: none → input → output → none
      const currentType = component.params.sides[side].type;
      if (currentType === 'none') {
        component.params.sides[side].type = 'input';
        component.params.sides[side].count = 0;
      } else if (currentType === 'input') {
        component.params.sides[side].type = 'output';
        component.params.sides[side].count = 1;
      } else {
        component.params.sides[side].type = 'none';
        component.params.sides[side].count = 0;
      }

      this.updateAutomaticConnections();
      this.saveState();
      this.render();
      this.setStatus(`Duplicator ${side}: ${component.params.sides[side].type}`, 'info');
      return true;
    }

    if (isRightClick) {
      // Cycle output count if this is an output side
      if (component.params.sides[side].type === 'output') {
        const currentCount = component.params.sides[side].count || 1;
        const newCount = (currentCount % 5) + 1;  // Cycle 1→2→3→4→5→1
        component.params.sides[side].count = newCount;

        this.saveState();
        this.render();
        this.setStatus(`Duplicator ${side} output: ${newCount}`, 'info');
        return true;
      }
    }

    return false;
  }

  // Handle shuffler quadrant clicks (similar to duplicator)
  handleShufflerClick(component, event, gridPos) {
    // Get pixel position within component, accounting for canvas scaling
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const pixelX = (event.clientX - rect.left) * scaleX;
    const pixelY = (event.clientY - rect.top) * scaleY;

    // Calculate relative position within component (0-gridSize range)
    const compPixelX = pixelX - component.position.x * this.gridSize;
    const compPixelY = pixelY - component.position.y * this.gridSize;

    // Initialize sides if not present
    if (!component.params.sides) {
      const spec = ComponentRegistry.get('shuffler');
      component.params.sides = spec.behavior.getDefaultSides();
    }

    const isLeftClick = event.button === 0;
    const isRightClick = event.button === 2;

    // Check if click is in center region (for retain count adjustment)
    const centerX = this.gridSize / 2;
    const centerY = this.gridSize / 2;
    const dx = compPixelX - centerX;
    const dy = compPixelY - centerY;
    const distFromCenter = Math.sqrt(dx * dx + dy * dy);
    const centerRadius = this.gridSize * 0.25;

    // Right-click on center: cycle retain count
    if (distFromCenter < centerRadius && isRightClick) {
      const currentRetain = component.params.retainCount || 0;
      const newRetain = (currentRetain + 1) % 6; // Cycle 0→1→2→3→4→5→0
      component.params.retainCount = newRetain;

      this.saveState();
      this.render();
      this.setStatus(`Shuffler retain: ${newRetain}`, 'info');
      return true;
    }

    // Determine quadrant using diagonal divisions (like duplicator)
    // Diagonals: y = x and y = gridSize - x
    let side;

    if (compPixelY < compPixelX && compPixelY < (this.gridSize - compPixelX)) {
      side = 'up';
    } else if (compPixelY < compPixelX && compPixelY >= (this.gridSize - compPixelX)) {
      side = 'right';
    } else if (compPixelY >= compPixelX && compPixelY >= (this.gridSize - compPixelX)) {
      side = 'down';
    } else {
      side = 'left';
    }

    if (isLeftClick) {
      // Cycle side type: input → output → none → input
      const currentType = component.params.sides[side].type;
      if (currentType === 'input') {
        component.params.sides[side].type = 'output';
        component.params.sides[side].count = 2; // Default output count
      } else if (currentType === 'output') {
        component.params.sides[side].type = 'none';
        component.params.sides[side].count = 0;
      } else {
        component.params.sides[side].type = 'input';
        component.params.sides[side].count = 0;
      }

      this.updateAutomaticConnections();
      this.saveState();
      this.render();
      this.setStatus(`Shuffler ${side}: ${component.params.sides[side].type}`, 'info');
      return true;
    }

    if (isRightClick) {
      // Increase output count if this is an output side (like duplicator)
      if (component.params.sides[side].type === 'output') {
        const currentCount = component.params.sides[side].count || 1;
        const newCount = (currentCount % 5) + 1;  // Cycle 1→2→3→4→5→1
        component.params.sides[side].count = newCount;

        this.saveState();
        this.render();
        this.setStatus(`Shuffler ${side} output: ${newCount}`, 'info');
        return true;
      }
    }

    return false;
  }

  selectComponent(component) {
    this.selectedComponent = component;
    this.updatePropertiesPanel();
    this.render();
  }

  createConnection(from, to) {
    // Check if connection already exists
    const exists = this.connections.some(conn =>
      conn.from === from.id && conn.to === to.id
    );

    if (exists) {
      this.setStatus('Connection already exists', 'error');
      return;
    }

    this.connections.push({from: from.id, to: to.id});
    this.saveState();
    this.setStatus('Connection created', 'success');
    this.render();
  }

  // Clipboard Operations
  copy() {
    if (this.selectedComponent) {
      this.clipboard = JSON.parse(JSON.stringify(this.selectedComponent));
      delete this.clipboard.id; // Remove ID so paste creates new component
      this.setStatus('Component copied', 'success');
    }
  }

  paste() {
    if (!this.clipboard) {
      this.setStatus('Nothing to paste', 'error');
      return;
    }

    const component = JSON.parse(JSON.stringify(this.clipboard));
    component.id = this.generateId();

    // Offset position slightly
    component.position.x = Math.min(this.gridWidth - 1, component.position.x + 1);
    component.position.y = Math.min(this.gridHeight - 1, component.position.y + 1);

    this.components.push(component);
    this.selectedComponent = component;
    this.updatePropertiesPanel();
    this.updateAutomaticConnections();
    this.saveState();
    this.setStatus('Component pasted', 'success');
    this.render();
  }

  // History Management
  saveState() {
    const state = {
      components: JSON.parse(JSON.stringify(this.components)),
      connections: JSON.parse(JSON.stringify(this.connections))
    };

    // Remove future history if we're not at the end
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    this.history.push(state);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.restoreState(this.history[this.historyIndex]);
      this.setStatus('Undo', 'success');
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.restoreState(this.history[this.historyIndex]);
      this.setStatus('Redo', 'success');
    }
  }

  restoreState(state) {
    this.components = JSON.parse(JSON.stringify(state.components));

    // Rebuild connections from spatial layout rather than saved connections
    this.updateAutomaticConnections();

    // Clear selection if component no longer exists
    if (this.selectedComponent) {
      const stillExists = this.components.some(c => c.id === this.selectedComponent.id);
      if (!stillExists) {
        this.selectedComponent = null;
        this.updatePropertiesPanel();
      }
    }

    this.render();
  }

  // Properties Panel
  updatePropertiesPanel() {
    const panel = document.getElementById('properties-panel');

    if (!this.selectedComponent) {
      panel.innerHTML = '<p class="help-text">Select a component to edit properties</p>';
      return;
    }

    const component = this.selectedComponent;
    const spec = ComponentRegistry.get(component.type);

    let html = `<div class="property-item">
      <label>Component ID</label>
      <input type="text" value="${component.id}" readonly>
    </div>`;

    // Add parameter editors based on component type
    if (component.type === 'sack') {
      html += `<div class="property-item">
        <label>Label</label>
        <input type="text" value="${component.params.label || ''}"
               onchange="editor.updateComponentParam('label', this.value)">
      </div>`;

      // Check if this sack is linked to a template
      if (component.params.linkedTemplate) {
        const template = this.sackTemplates[component.params.linkedTemplate];
        html += `<div class="property-item">
          <label>Template</label>
          <input type="text" value="${component.params.linkedTemplate}" readonly style="background: #2a2a2a; color: #888;">
          <small style="color: #888; font-size: 10px;">Linked to hypothesis template</small>
        </div>
        <div class="property-item">
          <label>Hypothesis Space</label>
          <div style="padding: 8px; background: #2a2a2a; border-radius: 4px; font-size: 11px; color: #aaa;">
            <div>This sack represents uncertain hypotheses</div>
            <div style="margin-top: 4px;">Contents will be sampled when testing</div>
          </div>
        </div>`;
      } else {
        // Regular sack without template
        html += `<div class="property-item">
          <label>Contents (JSON)</label>
          <textarea rows="3" style="font-family: monospace; font-size: 11px;"
                    onchange="editor.updateComponentContents(this.value)">${JSON.stringify(component.params.contents || {red: 5, blue: 5}, null, 2)}</textarea>
          <small style="color: #888; font-size: 10px;">Example: {"red": 7, "blue": 3}</small>
        </div>
        <div class="property-item">
          <label>Hypothesis Alternatives</label>
          <button onclick="editor.editHypotheses('${component.id}')" style="width: 100%; padding: 6px;">
            Edit Hypotheses ${this.hypotheses[component.id] ? `(${this.hypotheses[component.id].length})` : ''}
          </button>
          <small style="color: #888; font-size: 10px;">Define possible distributions for inference</small>
        </div>`;
      }

      html += ``;
    } else if (component.type === 'conveyor') {
      html += `<div class="property-item">
        <label>Direction</label>
        <select onchange="editor.updateComponentParam('direction', this.value)">
          <option value="right" ${component.params.direction === 'right' ? 'selected' : ''}>Right</option>
          <option value="left" ${component.params.direction === 'left' ? 'selected' : ''}>Left</option>
          <option value="down" ${component.params.direction === 'down' ? 'selected' : ''}>Down</option>
          <option value="up" ${component.params.direction === 'up' ? 'selected' : ''}>Up</option>
        </select>
      </div>
      <div class="property-item">
        <label>Speed</label>
        <input type="number" step="0.1" value="${component.params.speed || 1.0}"
               onchange="editor.updateComponentParam('speed', parseFloat(this.value))">
      </div>
      <div class="property-item">
        <label>
          <input type="checkbox" ${component.params.plex ? 'checked' : ''}
                 onchange="editor.updateComponentParam('plex', this.checked)">
          Plex Glass
        </label>
      </div>`;
    } else if (component.type === 'conveyor-turn') {
      html += `<div class="property-item">
        <label>Turn Type</label>
        <select onchange="editor.updateComponentParam('turn', this.value)">
          <option value="right-to-down" ${component.params.turn === 'right-to-down' ? 'selected' : ''}>Right → Down</option>
          <option value="right-to-up" ${component.params.turn === 'right-to-up' ? 'selected' : ''}>Right → Up</option>
          <option value="left-to-down" ${component.params.turn === 'left-to-down' ? 'selected' : ''}>Left → Down</option>
          <option value="left-to-up" ${component.params.turn === 'left-to-up' ? 'selected' : ''}>Left → Up</option>
          <option value="down-to-right" ${component.params.turn === 'down-to-right' ? 'selected' : ''}>Down → Right</option>
          <option value="down-to-left" ${component.params.turn === 'down-to-left' ? 'selected' : ''}>Down → Left</option>
          <option value="up-to-right" ${component.params.turn === 'up-to-right' ? 'selected' : ''}>Up → Right</option>
          <option value="up-to-left" ${component.params.turn === 'up-to-left' ? 'selected' : ''}>Up → Left</option>
        </select>
      </div>
      <div class="property-item">
        <label>Speed</label>
        <input type="number" step="0.1" value="${component.params.speed || 1.0}"
               onchange="editor.updateComponentParam('speed', parseFloat(this.value))">
      </div>
      <div class="property-item">
        <label>
          <input type="checkbox" ${component.params.plex ? 'checked' : ''}
                 onchange="editor.updateComponentParam('plex', this.checked)">
          Plex Glass
        </label>
      </div>`;
    } else if (component.type === 'shuffler') {
      html += `<div class="property-item">
        <label>Number of Inputs</label>
        <select onchange="editor.updateComponentParam('numInputs', parseInt(this.value))">
          <option value="2" ${component.params.numInputs === 2 ? 'selected' : ''}>2 Inputs</option>
          <option value="3" ${component.params.numInputs === 3 ? 'selected' : ''}>3 Inputs</option>
        </select>
      </div>
      <div class="property-item">
        <label>Input 1 Side</label>
        <select onchange="editor.updateComponentParam('input1Side', this.value)">
          <option value="up" ${component.params.input1Side === 'up' ? 'selected' : ''}>Up</option>
          <option value="down" ${component.params.input1Side === 'down' ? 'selected' : ''}>Down</option>
          <option value="left" ${component.params.input1Side === 'left' ? 'selected' : ''}>Left</option>
          <option value="right" ${component.params.input1Side === 'right' ? 'selected' : ''}>Right</option>
        </select>
      </div>
      <div class="property-item">
        <label>Input 2 Side</label>
        <select onchange="editor.updateComponentParam('input2Side', this.value)">
          <option value="up" ${component.params.input2Side === 'up' ? 'selected' : ''}>Up</option>
          <option value="down" ${component.params.input2Side === 'down' ? 'selected' : ''}>Down</option>
          <option value="left" ${component.params.input2Side === 'left' ? 'selected' : ''}>Left</option>
          <option value="right" ${component.params.input2Side === 'right' ? 'selected' : ''}>Right</option>
        </select>
      </div>
      ${component.params.numInputs === 3 ? `
      <div class="property-item">
        <label>Input 3 Side</label>
        <select onchange="editor.updateComponentParam('input3Side', this.value)">
          <option value="up" ${component.params.input3Side === 'up' ? 'selected' : ''}>Up</option>
          <option value="down" ${component.params.input3Side === 'down' ? 'selected' : ''}>Down</option>
          <option value="left" ${component.params.input3Side === 'left' ? 'selected' : ''}>Left</option>
          <option value="right" ${component.params.input3Side === 'right' ? 'selected' : ''}>Right</option>
        </select>
      </div>` : ''}
      <div class="property-item">
        <label>Output Side</label>
        <select onchange="editor.updateComponentParam('outputSide', this.value)">
          <option value="up" ${component.params.outputSide === 'up' ? 'selected' : ''}>Up</option>
          <option value="down" ${component.params.outputSide === 'down' ? 'selected' : ''}>Down</option>
          <option value="left" ${component.params.outputSide === 'left' ? 'selected' : ''}>Left</option>
          <option value="right" ${component.params.outputSide === 'right' ? 'selected' : ''}>Right</option>
        </select>
        <small style="color: #888; font-size: 10px;">Used if no output pattern is defined</small>
      </div>
      <div class="property-item">
        <label>Min Buffer Size</label>
        <input type="number" min="1" max="10" value="${component.params.minBufferSize || component.params.numInputs || 2}"
               onchange="editor.updateComponentParam('minBufferSize', parseInt(this.value))">
        <small style="color: #888; font-size: 10px;">Balls required before shuffle (default = numInputs)</small>
      </div>
      <div class="property-item">
        <label>Output Pattern</label>
        <button onclick="editor.editShufflerPattern()" style="width: 100%; padding: 6px;">
          Edit Output Pattern
        </button>
        <small style="color: #888; font-size: 10px;">Define distribution and retention</small>
        <div style="padding: 8px; background: #2a2a2a; border-radius: 4px; font-size: 11px; margin-top: 4px; color: #aaa;">
          ${this.formatShufflerPattern(component.params.outputPattern || [{side: component.params.outputSide || 'down', count: component.params.numInputs || 2}])}
        </div>
      </div>
      <div class="property-item">
        <label>
          <input type="checkbox" ${component.params.plex ? 'checked' : ''}
                 onchange="editor.updateComponentParam('plex', this.checked)">
          Plex Glass
        </label>
      </div>`;
    } else if (component.type === 'splitter') {
      html += `<div class="property-item">
        <label>Speed</label>
        <input type="number" step="0.1" value="${component.params.speed || 1.0}"
               onchange="editor.updateComponentParam('speed', parseFloat(this.value))">
      </div>
      <div class="property-item">
        <label>
          <input type="checkbox" ${component.params.plex ? 'checked' : ''}
                 onchange="editor.updateComponentParam('plex', this.checked)">
          Plex Glass
        </label>
      </div>`;
    } else if (component.type === 'duplicator') {
      html += `<div class="property-item">
        <label>Number of Copies</label>
        <input type="number" min="2" max="10" value="${component.params.copies || 2}"
               onchange="editor.updateComponentParam('copies', parseInt(this.value))">
      </div>
      <div class="property-item">
        <label>Output Pattern</label>
        <button onclick="editor.editOutputPattern()" style="width: 100%; padding: 6px;">
          Edit Output Pattern
        </button>
        <small style="color: #888; font-size: 10px;">Define distribution to each output side</small>
        <div style="padding: 8px; background: #2a2a2a; border-radius: 4px; font-size: 11px; margin-top: 4px; color: #aaa;">
          ${this.formatOutputPattern(component.params.outputPattern || [{side: 'right', count: 2}])}
        </div>
      </div>
      <div class="property-item">
        <label>
          <input type="checkbox" ${component.params.plex ? 'checked' : ''}
                 onchange="editor.updateComponentParam('plex', this.checked)">
          Plex Glass
        </label>
      </div>`;
    } else if (component.type === 'observation') {
      html += `<div class="property-item">
        <label>
          <input type="checkbox" ${component.params.plex ? 'checked' : ''}
                 onchange="editor.updateComponentParam('plex', this.checked)">
          Plex Glass
        </label>
      </div>`;
    } else if (component.type === 'arm') {
      html += `<div class="property-item">
        <label>
          <input type="checkbox" ${component.params.plex ? 'checked' : ''}
                 onchange="editor.updateComponentParam('plex', this.checked)">
          Plex Glass
        </label>
      </div>`;
    }

    panel.innerHTML = html;
  }

  updateComponentParam(key, value) {
    if (this.selectedComponent) {
      this.selectedComponent.params[key] = value;
      this.saveState();
      this.render();
    }
  }

  updateComponentContents(jsonStr) {
    if (!this.selectedComponent) return;

    try {
      const contents = JSON.parse(jsonStr);
      this.selectedComponent.params.contents = contents;
      this.saveState();
      this.setStatus('Contents updated', 'success');
    } catch (error) {
      this.setStatus('Invalid JSON: ' + error.message, 'error');
    }
  }

  editHypotheses(componentId) {
    const component = this.components.find(c => c.id === componentId);
    if (!component) return;

    // Initialize hypotheses if not exists
    if (!this.hypotheses) {
      this.hypotheses = {};
    }

    const currentAlternatives = this.hypotheses[componentId] || [];

    // Prompt for alternatives (simple for now)
    const alternativesStr = prompt(
      'Enter hypothesis alternatives as JSON array.\n\n' +
      'Example: [{"red": 7, "blue": 3}, {"red": 3, "blue": 7}]\n\n' +
      'Current alternatives:',
      JSON.stringify(currentAlternatives, null, 2)
    );

    if (alternativesStr !== null) {
      try {
        const alternatives = JSON.parse(alternativesStr);
        if (!Array.isArray(alternatives)) {
          throw new Error('Must be an array of distributions');
        }
        this.hypotheses[componentId] = alternatives;
        this.updatePropertiesPanel(); // Refresh to show count
        this.setStatus(`Hypotheses updated for ${componentId}`, 'success');
      } catch (error) {
        this.setStatus('Invalid JSON: ' + error.message, 'error');
      }
    }
  }

  formatOutputPattern(pattern) {
    // Format output pattern for display
    if (!pattern || !Array.isArray(pattern)) {
      return 'Invalid pattern';
    }

    return pattern.map(entry => {
      return `${entry.count} copies → ${entry.side}`;
    }).join('<br>');
  }

  editOutputPattern() {
    if (!this.selectedComponent) return;
    const component = this.selectedComponent;

    const currentPattern = component.params.outputPattern || [{side: 'right', count: component.params.copies || 2}];

    // Prompt for pattern editing
    const patternStr = prompt(
      'Edit output pattern as JSON array.\n\n' +
      'Example: [{"side": "right", "count": 3}, {"side": "up", "count": 2}]\n\n' +
      'Valid sides: right, down, left, up\n' +
      'Total count should equal number of copies.\n\n' +
      'Current pattern:',
      JSON.stringify(currentPattern, null, 2)
    );

    if (patternStr !== null) {
      try {
        const pattern = JSON.parse(patternStr);
        if (!Array.isArray(pattern)) {
          throw new Error('Pattern must be an array');
        }

        // Validate pattern entries
        const validSides = ['right', 'down', 'left', 'up'];
        let totalCount = 0;
        for (const entry of pattern) {
          if (!entry.side || !validSides.includes(entry.side)) {
            throw new Error(`Invalid side: ${entry.side}. Must be one of: ${validSides.join(', ')}`);
          }
          if (!Number.isInteger(entry.count) || entry.count < 0) {
            throw new Error(`Invalid count: ${entry.count}. Must be a non-negative integer`);
          }
          totalCount += entry.count;
        }

        // Warn if total doesn't match copies
        if (totalCount !== component.params.copies) {
          const proceed = confirm(
            `Warning: Total count (${totalCount}) doesn't match number of copies (${component.params.copies}).\n\n` +
            `Do you want to update copies to ${totalCount}?`
          );
          if (proceed) {
            component.params.copies = totalCount;
          }
        }

        component.params.outputPattern = pattern;
        this.updateAutomaticConnections(); // Reconnect for new output sides
        this.updatePropertiesPanel();
        this.saveState();
        this.render();
        this.setStatus('Output pattern updated', 'success');
      } catch (error) {
        this.setStatus('Invalid pattern: ' + error.message, 'error');
      }
    }
  }

  formatShufflerPattern(pattern) {
    // Format shuffler output pattern for display
    if (!pattern || !Array.isArray(pattern)) {
      return 'Invalid pattern';
    }

    return pattern.map(entry => {
      if (entry.retain) {
        return `${entry.count} balls → retained`;
      } else {
        return `${entry.count} balls → ${entry.side}`;
      }
    }).join('<br>');
  }

  editShufflerPattern() {
    if (!this.selectedComponent) return;
    const component = this.selectedComponent;

    const currentPattern = component.params.outputPattern || [
      {side: component.params.outputSide || 'down', count: component.params.numInputs || 2}
    ];

    // Prompt for pattern editing
    const patternStr = prompt(
      'Edit shuffler output pattern as JSON array.\n\n' +
      'Example (multi-output): [{"side": "right", "count": 2}, {"side": "down", "count": 1}]\n' +
      'Example (with retention): [{"side": "right", "count": 2}, {"retain": true, "count": 3}]\n\n' +
      'Valid sides: right, down, left, up\n' +
      'Entries with "retain: true" stay in buffer for next cycle.\n' +
      'Total count should equal minBufferSize.\n\n' +
      'Current pattern:',
      JSON.stringify(currentPattern, null, 2)
    );

    if (patternStr !== null) {
      try {
        const pattern = JSON.parse(patternStr);
        if (!Array.isArray(pattern)) {
          throw new Error('Pattern must be an array');
        }

        // Validate pattern entries
        const validSides = ['right', 'down', 'left', 'up'];
        let totalCount = 0;
        for (const entry of pattern) {
          if (entry.retain) {
            // Retained entry - just needs count
            if (!Number.isInteger(entry.count) || entry.count < 0) {
              throw new Error(`Invalid retained count: ${entry.count}`);
            }
          } else {
            // Output entry - needs valid side and count
            if (!entry.side || !validSides.includes(entry.side)) {
              throw new Error(`Invalid side: ${entry.side}. Must be one of: ${validSides.join(', ')}`);
            }
            if (!Number.isInteger(entry.count) || entry.count < 0) {
              throw new Error(`Invalid count: ${entry.count}. Must be a non-negative integer`);
            }
          }
          totalCount += entry.count;
        }

        // Warn if total doesn't match minBufferSize
        const minBufferSize = component.params.minBufferSize || component.params.numInputs || 2;
        if (totalCount !== minBufferSize) {
          const proceed = confirm(
            `Warning: Total count (${totalCount}) doesn't match minBufferSize (${minBufferSize}).\n\n` +
            `Do you want to update minBufferSize to ${totalCount}?`
          );
          if (proceed) {
            component.params.minBufferSize = totalCount;
          }
        }

        component.params.outputPattern = pattern;
        this.updateAutomaticConnections(); // Reconnect for new output sides
        this.updatePropertiesPanel();
        this.saveState();
        this.render();
        this.setStatus('Shuffler pattern updated', 'success');
      } catch (error) {
        this.setStatus('Invalid pattern: ' + error.message, 'error');
      }
    }
  }

  // File Operations
  newLevel() {
    this.components = [];
    this.connections = [];
    this.hypotheses = {};
    this.selectedComponent = null;
    this.history = [];
    this.historyIndex = -1;
    this.nextComponentId = 1;
    this.updatePropertiesPanel();
    this.saveState();
    this.render();
    this.setStatus('Level cleared', 'success');
  }

  loadLevel() {
    const savedLevels = this.getSavedLevels();

    if (savedLevels.length === 0) {
      alert('Ei tallennettuja tasoja!');
      return;
    }

    // Build level selection dialog
    let message = 'Valitse ladattava taso:\n\n';
    savedLevels.forEach((level, index) => {
      message += `${index + 1}. ${level.meta.title || level.meta.id}\n`;
      if (level.meta.description) {
        message += `   ${level.meta.description}\n`;
      }
    });
    message += '\nSyötä tason numero:';

    const selection = prompt(message);
    if (selection === null) return; // User cancelled

    const levelIndex = parseInt(selection) - 1;
    if (isNaN(levelIndex) || levelIndex < 0 || levelIndex >= savedLevels.length) {
      alert('Virheellinen tason numero!');
      return;
    }

    const level = savedLevels[levelIndex];

    // Load level data
    this.gridWidth = level.grid.width;
    this.gridHeight = level.grid.height;
    this.components = level.components || [];
    this.connections = level.connections || [];
    this.hypotheses = {};

    // Migrate shuffler components from old format to new format
    this.components.forEach(comp => {
      if (comp.type === 'shuffler') {
        const spec = ComponentRegistry.get('shuffler');
        if (spec && spec.behavior && spec.behavior.migrateParams) {
          comp.params = spec.behavior.migrateParams(comp.params);
        }
      }
    });

    // Reconstruct hypotheses map from level data
    if (level.hypothesisSpace && level.hypothesisSpace.components) {
      Object.keys(level.hypothesisSpace.components).forEach(componentId => {
        const config = level.hypothesisSpace.components[componentId];
        this.hypotheses[componentId] = config.alternatives || [];
      });
    }

    // Load hypothesis script if present
    if (level.hypothesisScript) {
      this.hypothesisScript = level.hypothesisScript;
      document.getElementById('hypothesis-script').value = level.hypothesisScript;

      // Try to execute the script to populate templates
      try {
        this.executeHypothesisScript();
      } catch (error) {
        console.warn('Could not execute hypothesis script during load:', error);
      }
    }

    // Load simulation settings
    if (level.simulation) {
      document.getElementById('balls-to-spawn').value = level.simulation.ballsToSpawn || 10;
    }

    // Load betting buckets
    if (level.meta && level.meta.bettingConfig) {
      this.bettingBuckets = level.meta.bettingConfig.granularity || 2;
      document.getElementById('betting-buckets').value = this.bettingBuckets;
    }

    // Update nextComponentId to avoid ID conflicts
    let maxId = 0;
    this.components.forEach(comp => {
      const idNum = parseInt(comp.id.replace(/\D/g, ''));
      if (!isNaN(idNum) && idNum > maxId) {
        maxId = idNum;
      }
    });
    this.nextComponentId = maxId + 1;

    // Reset editor state
    this.selectedComponent = null;
    this.selectedTemplate = null;
    this.history = [];
    this.historyIndex = -1;

    // Update UI
    this.updateCanvasSize();
    this.updateGridSizeDisplays();
    this.updatePropertiesPanel();
    this.updateAutomaticConnections();
    this.saveState();
    this.render();

    this.setStatus(`Ladattu: ${level.meta.title || level.meta.id}`, 'success');
  }

  saveLevel() {
    // Auto-assign arm connections from connection graph
    this.autoAssignArmConnections();

    // Get existing levels from localStorage
    const savedLevels = this.getSavedLevels();
    const levelNumber = savedLevels.length + 1;
    const levelId = `level-${levelNumber}`;
    const title = `Taso ${levelNumber}`;
    const description = `Bayesian Factory -taso`;

    // Build hypothesis space from configured hypotheses
    const hypothesisComponents = {};
    if (this.hypotheses) {
      Object.keys(this.hypotheses).forEach(componentId => {
        const alternatives = this.hypotheses[componentId];
        if (alternatives && alternatives.length > 0) {
          hypothesisComponents[componentId] = {alternatives};
        }
      });
    }

    const level = {
      meta: {
        id: levelId,
        title: title,
        description: description,
        bettingConfig: {
          granularity: this.bettingBuckets  // From DSL buckets() function
        }
      },
      grid: {
        width: this.gridWidth,
        height: this.gridHeight
      },
      components: this.components,
      connections: this.connections,
      hypothesisSpace: {
        type: "independent",
        components: hypothesisComponents
      },
      hypothesisScript: this.hypothesisScript,
      samplingSchedule: this.samplingSchedule || null,  // Add sampling schedule from hypothesis script
      simulation: {
        ballProductionInterval: 3000,
        ballSpeed: 1.0,
        ballsToSpawn: parseInt(document.getElementById('balls-to-spawn').value) || 10,
        seed: 42
      }
    };

    // Save to localStorage
    savedLevels.push(level);
    localStorage.setItem('bayesianFactoryLevels', JSON.stringify(savedLevels));

    // Add to "other" group if using new grouped system
    const groupsData = localStorage.getItem('bayesianFactoryGroups');
    if (groupsData) {
      const groups = JSON.parse(groupsData);
      if (!groups.other.includes(level.meta.id)) {
        groups.other.push(level.meta.id);
        localStorage.setItem('bayesianFactoryGroups', JSON.stringify(groups));
      }
    }

    this.setStatus(`Tallennettu tasolle ${levelNumber}`, 'success');
    alert(`Tallennettu tasolle ${levelNumber}!`);
  }

  getSavedLevels() {
    const saved = localStorage.getItem('bayesianFactoryLevels');
    return saved ? JSON.parse(saved) : [];
  }

  changeGridSize(dimension, delta) {
    if (dimension === 'width') {
      const newWidth = this.gridWidth + delta;
      if (newWidth >= 3 && newWidth <= 20) {
        this.gridWidth = newWidth;
      }
    } else if (dimension === 'height') {
      const newHeight = this.gridHeight + delta;
      if (newHeight >= 3 && newHeight <= 15) {
        this.gridHeight = newHeight;
      }
    }

    this.updateCanvasSize();
    this.updateGridSizeDisplays();
    this.render();
  }

  updateGridSizeDisplays() {
    document.getElementById('grid-width-display').textContent = this.gridWidth;
    document.getElementById('grid-height-display').textContent = this.gridHeight;
  }

  testLevel() {
    // Auto-assign arm connections from connection graph
    this.autoAssignArmConnections();

    // Build hypothesis space from configured hypotheses
    const hypothesisComponents = {};
    if (this.hypotheses) {
      Object.keys(this.hypotheses).forEach(componentId => {
        const alternatives = this.hypotheses[componentId];
        if (alternatives && alternatives.length > 0) {
          hypothesisComponents[componentId] = {alternatives};
        }
      });
    }

    // Open play page with level data in localStorage
    const level = {
      meta: {
        id: "test-level",
        title: "Test Level",
        description: "Testing from editor",
        bettingConfig: {
          granularity: this.bettingBuckets  // From DSL buckets() function
        }
      },
      grid: {
        width: this.gridWidth,
        height: this.gridHeight
      },
      components: this.components,
      connections: this.connections,
      hypothesisSpace: {
        type: "independent",
        components: hypothesisComponents
      },
      hypothesisScript: this.hypothesisScript,
      samplingSchedule: this.samplingSchedule || null,  // Add sampling schedule from hypothesis script
      simulation: {
        ballProductionInterval: 3000,
        ballSpeed: 1.0,
        ballsToSpawn: parseInt(document.getElementById('balls-to-spawn').value) || 10,
        seed: 42
      }
    };

    localStorage.setItem('testLevel', JSON.stringify(level));
    window.open('play.html', '_blank');
  }

  generateHypothesisSpace() {
    // Find all sacks and group by their template's source list
    const listGroups = {}; // listId -> {sacks: [...], templates: [...]}
    const independentSacks = []; // Sacks without templates

    this.components.forEach(comp => {
      if (comp.type === 'sack') {
        const templateId = comp.params.linkedTemplate;

        if (templateId && this.sackTemplates[templateId]) {
          const template = this.sackTemplates[templateId];
          const listId = template.process?.listId;

          if (listId) {
            // Coupled sack
            if (!listGroups[listId]) {
              listGroups[listId] = {
                sacks: [],
                templates: [],
                templateList: []
              };
            }

            listGroups[listId].sacks.push({
              componentId: comp.id,
              templateId: templateId,
              selectedIndex: template.process.selectedIndex
            });
          } else {
            // Independent sack (no permutation)
            independentSacks.push({
              componentId: comp.id,
              alternatives: [template.distribution]
            });
          }
        } else {
          // Old-style independent hypotheses
          if (this.hypotheses[comp.id]) {
            independentSacks.push({
              componentId: comp.id,
              alternatives: this.hypotheses[comp.id]
            });
          }
        }
      }
    });

    // Re-execute script to get fresh lists (needed for hypothesis generation)
    let lists = {};
    let animationInstructions = [];
    if (this.hypothesisScript) {
      const result = this.hypothesisEngine.execute(this.hypothesisScript);
      lists = result.lists;
      animationInstructions = result.animationInstructions || [];
    }

    // Build processes for coupled sacks
    const processes = [];
    Object.entries(listGroups).forEach(([listId, group]) => {
      const listInfo = lists[listId];
      if (listInfo && listInfo.templates) {
        processes.push({
          listId: listId,
          templates: listInfo.templates,
          selections: group.sacks.map(s => ({
            componentId: s.componentId,
            templateId: s.templateId,
            index: s.selectedIndex
          }))
        });
      }
    });

    // Generate all hypotheses using the engine
    const hypotheses = this.hypothesisEngine.generateAllHypotheses(processes);


    // Format for the game
    const hypothesisSpace = {
      type: "permutation",
      processes: processes,
      hypotheses: hypotheses.map(h => ({
        id: h.id,
        componentAssignments: h.assignments,
        logProbability: Math.log(h.probability)
      })),
      independentComponents: independentSacks.reduce((acc, sack) => {
        acc[sack.componentId] = {alternatives: sack.alternatives};
        return acc;
      }, {}),
      animationInstructions: animationInstructions
    };


    return hypothesisSpace;
  }


  // Rendering
  render() {
    // Store gridSize on canvas for components to access
    this.canvas._gridSize = this.gridSize;

    // Clear canvas
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid
    this.drawGrid();

    // Draw connections
    this.drawConnections();

    // Draw components
    this.components.forEach(comp => {
      this.drawComponent(comp);
    });

    // Draw component preview (for placement)
    if (this.currentTool === 'place' && this.selectedComponentType && this.mouseGridPos) {
      this.drawComponentPreview();
    }

    // Draw selection
    if (this.selectedComponent) {
      this.drawSelection(this.selectedComponent);
    }

    // Draw connection preview
    if (this.connectFrom) {
      this.drawConnectionPreview(this.connectFrom);
    }
  }

  drawGrid() {
    this.ctx.strokeStyle = '#2c2c2c';
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= this.gridWidth; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * this.gridSize, 0);
      this.ctx.lineTo(x * this.gridSize, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = 0; y <= this.gridHeight; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * this.gridSize);
      this.ctx.lineTo(this.canvas.width, y * this.gridSize);
      this.ctx.stroke();
    }
  }

  drawComponent(component) {
    const spec = ComponentRegistry.get(component.type);
    if (spec.visual.render) {
      this.ctx.save();
      spec.visual.render(this.ctx, component);
      this.ctx.restore();
    }

    const px = component.position.x * this.gridSize;
    const py = component.position.y * this.gridSize;

    // Draw plex glass overlay
    if (component.params && component.params.plex) {
      this.ctx.fillStyle = 'rgba(100, 150, 255, 0.3)'; // Semi-transparent blue
      this.ctx.fillRect(px, py, this.gridSize, this.gridSize);

      // Draw border
      this.ctx.strokeStyle = 'rgba(100, 150, 255, 0.8)';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(px, py, this.gridSize, this.gridSize);

      // Question mark
      this.ctx.fillStyle = 'rgba(100, 150, 255, 0.9)';
      this.ctx.font = 'bold 24px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('?', px + this.gridSize / 2, py + this.gridSize / 2);
    }

    // Draw ID label
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.font = 'bold 10px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(component.id, px + 2, py + 2);
  }

  drawSelection(component) {
    const px = component.position.x * this.gridSize;
    const py = component.position.y * this.gridSize;

    this.ctx.strokeStyle = '#1E88E5';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(px + 2, py + 2, this.gridSize - 4, this.gridSize - 4);
  }

  drawConnections() {
    this.ctx.strokeStyle = '#4CAF50';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([4, 4]);

    this.connections.forEach(conn => {
      const from = this.components.find(c => c.id === conn.from);
      const to = this.components.find(c => c.id === conn.to);

      if (from && to) {
        const fromCenter = {
          x: (from.position.x + 0.5) * this.gridSize,
          y: (from.position.y + 0.5) * this.gridSize
        };
        const toCenter = {
          x: (to.position.x + 0.5) * this.gridSize,
          y: (to.position.y + 0.5) * this.gridSize
        };

        this.ctx.beginPath();
        this.ctx.moveTo(fromCenter.x, fromCenter.y);
        this.ctx.lineTo(toCenter.x, toCenter.y);
        this.ctx.stroke();

        // Draw arrow
        const angle = Math.atan2(toCenter.y - fromCenter.y, toCenter.x - fromCenter.x);
        const arrowSize = 8;
        this.ctx.beginPath();
        this.ctx.moveTo(toCenter.x, toCenter.y);
        this.ctx.lineTo(
          toCenter.x - arrowSize * Math.cos(angle - Math.PI / 6),
          toCenter.y - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.moveTo(toCenter.x, toCenter.y);
        this.ctx.lineTo(
          toCenter.x - arrowSize * Math.cos(angle + Math.PI / 6),
          toCenter.y - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.stroke();
      }
    });

    this.ctx.setLineDash([]);
  }

  drawConnectionPreview(component) {
    const center = {
      x: (component.position.x + 0.5) * this.gridSize,
      y: (component.position.y + 0.5) * this.gridSize
    };

    this.ctx.fillStyle = '#4CAF50';
    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, 6, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawComponentPreview() {
    const x = this.mouseGridPos.x;
    const y = this.mouseGridPos.y;

    // Check if position is valid
    if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
      return;
    }

    // Check if position is occupied
    const isOccupied = this.getComponentAt(x, y) !== undefined;

    // Create a temporary component for preview
    const previewComponent = {
      id: 'preview',
      type: this.selectedComponentType,
      position: {x, y},
      params: {...this.pendingComponentParams}
    };

    // Save current context state
    this.ctx.save();

    // Set reduced opacity for preview
    this.ctx.globalAlpha = isOccupied ? 0.3 : 0.5;

    // Draw the component using its normal render method
    const spec = ComponentRegistry.get(this.selectedComponentType);
    if (spec.visual.render) {
      spec.visual.render(this.ctx, previewComponent);
    }

    // Draw red tint if position is occupied
    if (isOccupied) {
      const px = x * this.gridSize;
      const py = y * this.gridSize;
      this.ctx.globalAlpha = 0.4;
      this.ctx.fillStyle = '#ff0000';
      this.ctx.fillRect(px, py, this.gridSize, this.gridSize);
    }

    // Restore context state
    this.ctx.restore();
  }

  // Utility Methods
  getMouseGridPosition(e) {
    // Get accurate mouse position relative to canvas
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    return {
      x: Math.floor(x / this.gridSize),
      y: Math.floor(y / this.gridSize)
    };
  }

  screenToGrid(screenX, screenY) {
    return {
      x: Math.floor(screenX / this.gridSize),
      y: Math.floor(screenY / this.gridSize)
    };
  }

  /**
   * Check if a component type can receive balls (has input ports)
   * @param {string} type - Component type
   * @returns {boolean} True if component can receive balls
   */
  canReceiveBalls(type) {
    // List of all component types that can receive balls
    // This centralizes the logic to avoid forgetting new components
    return [
      'conveyor',
      'conveyor-turn',
      'observation',
      'black-pit',
      'splitter',
      'shuffler',
      'duplicator',
      'filter',
      'merger'
    ].includes(type);
  }

  getComponentAt(x, y) {
    return this.components.find(c => c.position.x === x && c.position.y === y);
  }

  generateId() {
    return `comp${this.nextComponentId++}`;
  }

  getDefaultParams(spec) {
    // Use editor.defaultParams if present, otherwise fall back to component's defaultParams
    const params = spec.editor?.defaultParams || spec.defaultParams || {};
    return JSON.parse(JSON.stringify(params));
  }

  updateAutomaticConnections() {
    // Clear existing connections
    this.connections = [];


    // Auto-connect based on spatial adjacency
    this.components.forEach(comp => {
      const adjacent = this.getAdjacentComponents(comp);

      if (comp.type === 'sack') {
        // Sack connects to adjacent arm
        const arm = adjacent.find(c => c.type === 'arm');
        if (arm) {
          this.addConnection(comp.id, arm.id);
        }
      } else if (comp.type === 'arm') {
        // Arm receives from sack (already handled above)
        // Arm outputs to conveyor/turn
        const output = adjacent.find(c => c.type === 'conveyor' || c.type === 'conveyor-turn');
        if (output) {
          this.addConnection(comp.id, output.id);
        }
      } else if (comp.type === 'conveyor' || comp.type === 'conveyor-turn') {
        // Conveyor connects to adjacent conveyor/turn/observation/splitter/machine based on direction
        const nextComp = this.getComponentInDirection(comp);
        if (nextComp && this.canReceiveBalls(nextComp.type)) {
          this.addConnection(comp.id, nextComp.id);
        }
      } else if (comp.type === 'shuffler') {
        // Shuffler has multiple outputs based on sides configuration
        if (!comp.params.sides) {
          // Skip connection creation if not configured yet (during editing)
          return;
        }

        const sides = comp.params.sides;

        // Create connections for each output side
        for (const side in sides) {
          if (sides[side].type === 'output' && sides[side].count > 0) {
            let outputPos;

            switch (side) {
              case 'right': outputPos = {x: comp.position.x + 1, y: comp.position.y}; break;
              case 'down': outputPos = {x: comp.position.x, y: comp.position.y + 1}; break;
              case 'left': outputPos = {x: comp.position.x - 1, y: comp.position.y}; break;
              case 'up': outputPos = {x: comp.position.x, y: comp.position.y - 1}; break;
            }

            if (outputPos) {
              const output = this.getComponentAt(outputPos.x, outputPos.y);
              if (output && this.canReceiveBalls(output.type)) {
                this.addConnection(comp.id, output.id);
              }
            }
          }
        }
      } else if (comp.type === 'splitter') {
        // Splitter has two outputs perpendicular to flow direction
        const direction = comp.params.direction || 'right';
        let leftOutputPos, rightOutputPos;

        switch (direction) {
          case 'right':
            // Outputs to top and bottom
            leftOutputPos = {x: comp.position.x, y: comp.position.y - 1};
            rightOutputPos = {x: comp.position.x, y: comp.position.y + 1};
            break;
          case 'down':
            // Outputs to left and right
            leftOutputPos = {x: comp.position.x - 1, y: comp.position.y};
            rightOutputPos = {x: comp.position.x + 1, y: comp.position.y};
            break;
          case 'left':
            // Outputs to bottom and top
            leftOutputPos = {x: comp.position.x, y: comp.position.y + 1};
            rightOutputPos = {x: comp.position.x, y: comp.position.y - 1};
            break;
          case 'up':
            // Outputs to right and left
            leftOutputPos = {x: comp.position.x + 1, y: comp.position.y};
            rightOutputPos = {x: comp.position.x - 1, y: comp.position.y};
            break;
        }

        [leftOutputPos, rightOutputPos].forEach(pos => {
          if (pos) {
            const output = this.getComponentAt(pos.x, pos.y);
            if (output && this.canReceiveBalls(output.type)) {
              this.addConnection(comp.id, output.id);
            }
          }
        });
      } else if (comp.type === 'duplicator') {
        // Duplicator has multiple outputs based on sides configuration
        if (!comp.params.sides) {
          // Skip connection creation if not configured yet (during editing)
          return;
        }

        const sides = comp.params.sides;

        // Create connections for each output side
        for (const side in sides) {
          if (sides[side].type === 'output' && sides[side].count > 0) {
            let outputPos;

            switch (side) {
              case 'right': outputPos = {x: comp.position.x + 1, y: comp.position.y}; break;
              case 'down': outputPos = {x: comp.position.x, y: comp.position.y + 1}; break;
              case 'left': outputPos = {x: comp.position.x - 1, y: comp.position.y}; break;
              case 'up': outputPos = {x: comp.position.x, y: comp.position.y - 1}; break;
            }

            if (outputPos) {
              const output = this.getComponentAt(outputPos.x, outputPos.y);
              if (output && this.canReceiveBalls(output.type)) {
                this.addConnection(comp.id, output.id);
              }
            }
          }
        }
      } else if (comp.type === 'filter') {
        // Filter has two outputs based on matchOutputSide and nonMatchOutputSide
        const matchSide = comp.params.matchOutputSide;
        const nonMatchSide = comp.params.nonMatchOutputSide;
        const outputSides = [matchSide, nonMatchSide];

        outputSides.forEach(side => {
          let outputPos;

          switch (side) {
            case 'up':
              outputPos = {x: comp.position.x, y: comp.position.y - 1};
              break;
            case 'down':
              outputPos = {x: comp.position.x, y: comp.position.y + 1};
              break;
            case 'left':
              outputPos = {x: comp.position.x - 1, y: comp.position.y};
              break;
            case 'right':
              outputPos = {x: comp.position.x + 1, y: comp.position.y};
              break;
          }

          if (outputPos) {
            const output = this.getComponentAt(outputPos.x, outputPos.y);
            if (output && this.canReceiveBalls(output.type)) {
              this.addConnection(comp.id, output.id);
            }
          }
        });
      } else if (comp.type === 'merger') {
        // Merger has single inline output based on direction
        const direction = comp.params.direction || 'right';
        let outputPos;

        switch (direction) {
          case 'right': outputPos = {x: comp.position.x + 1, y: comp.position.y}; break;
          case 'down': outputPos = {x: comp.position.x, y: comp.position.y + 1}; break;
          case 'left': outputPos = {x: comp.position.x - 1, y: comp.position.y}; break;
          case 'up': outputPos = {x: comp.position.x, y: comp.position.y - 1}; break;
        }

        if (outputPos) {
          const output = this.getComponentAt(outputPos.x, outputPos.y);
          if (output && this.canReceiveBalls(output.type)) {
            this.addConnection(comp.id, output.id);
          }
        }
      }
    });

    // Update arm parameters based on connections
    this.autoAssignArmConnections();


    // Validate connections - check for duplicates and multiple outputs from single-output components
    const connectionCounts = {};
    this.connections.forEach(conn => {
      connectionCounts[conn.from] = (connectionCounts[conn.from] || 0) + 1;
    });

    Object.keys(connectionCounts).forEach(fromId => {
      if (connectionCounts[fromId] > 1) {
        const comp = this.components.find(c => c.id === fromId);
        // Allow multiple connections for components that support multiple outputs
        const multiOutputTypes = ['splitter', 'filter', 'shuffler', 'duplicator'];
        if (comp && !multiOutputTypes.includes(comp.type)) {
          console.warn(`WARNING: Component ${fromId} (${comp.type}) has ${connectionCounts[fromId]} outgoing connections but doesn't support multiple outputs!`);
        }
      }
    });

    // Validate that all components with output ports are handled in connection logic
    const handledTypes = ['sack', 'arm', 'conveyor', 'conveyor-turn', 'shuffler', 'splitter', 'duplicator', 'filter', 'merger'];
    this.components.forEach(comp => {
      const spec = ComponentRegistry.get(comp.type);
      if (spec && spec.ports && spec.ports.outputs && spec.ports.outputs.length > 0) {
        if (!handledTypes.includes(comp.type)) {
          console.error(`ERROR: Component type "${comp.type}" has output ports but is not handled in updateAutomaticConnections()! Add it to the connection logic.`);
        }
      }
    });
  }

  getAdjacentComponents(comp) {
    const adjacent = [];
    const positions = [
      {x: comp.position.x - 1, y: comp.position.y},
      {x: comp.position.x + 1, y: comp.position.y},
      {x: comp.position.x, y: comp.position.y - 1},
      {x: comp.position.x, y: comp.position.y + 1}
    ];

    positions.forEach(pos => {
      const c = this.getComponentAt(pos.x, pos.y);
      if (c) adjacent.push(c);
    });

    return adjacent;
  }

  getComponentInDirection(comp) {
    let targetPos = null;

    if (comp.type === 'conveyor') {
      const dir = comp.params.direction || 'right';
      switch (dir) {
        case 'right': targetPos = {x: comp.position.x + 1, y: comp.position.y}; break;
        case 'left': targetPos = {x: comp.position.x - 1, y: comp.position.y}; break;
        case 'down': targetPos = {x: comp.position.x, y: comp.position.y + 1}; break;
        case 'up': targetPos = {x: comp.position.x, y: comp.position.y - 1}; break;
      }
    } else if (comp.type === 'conveyor-turn') {
      const turn = comp.params.turn || 'right-to-down';
      const exits = {
        'right-to-down': {x: comp.position.x, y: comp.position.y + 1},
        'right-to-up': {x: comp.position.x, y: comp.position.y - 1},
        'left-to-down': {x: comp.position.x, y: comp.position.y + 1},
        'left-to-up': {x: comp.position.x, y: comp.position.y - 1},
        'down-to-right': {x: comp.position.x + 1, y: comp.position.y},
        'down-to-left': {x: comp.position.x - 1, y: comp.position.y},
        'up-to-right': {x: comp.position.x + 1, y: comp.position.y},
        'up-to-left': {x: comp.position.x - 1, y: comp.position.y}
      };
      targetPos = exits[turn];
    }

    return targetPos ? this.getComponentAt(targetPos.x, targetPos.y) : null;
  }

  addConnection(fromId, toId) {
    // Don't add duplicate connections
    const exists = this.connections.some(c => c.from === fromId && c.to === toId);
    if (exists) {
      return;
    }

    // Don't add bidirectional connections (prevents loops)
    const reverseExists = this.connections.some(c => c.from === toId && c.to === fromId);
    if (reverseExists) {
      console.warn(`Prevented bidirectional connection between ${fromId} and ${toId}`);
      return;
    }

    this.connections.push({from: fromId, to: toId});
  }

  autoAssignArmConnections() {
    // For each arm, find its connected sack (input) and conveyor (output)
    this.components.forEach(comp => {
      if (comp.type === 'arm') {
        // Find sack connected TO this arm
        const sackConnection = this.connections.find(conn => conn.to === comp.id);
        if (sackConnection) {
          const sack = this.components.find(c => c.id === sackConnection.from);
          if (sack && sack.type === 'sack') {
            comp.params.assignedSackId = sack.id;
          }
        }

        // Find conveyor/component connected FROM this arm
        const outputConnection = this.connections.find(conn => conn.from === comp.id);
        if (outputConnection) {
          comp.params.outputConveyorId = outputConnection.to;
        }
      }
    });
  }

  // Hypothesis Script Management
  executeHypothesisScript() {
    const scriptText = document.getElementById('hypothesis-script').value;
    this.hypothesisScript = scriptText;

    // Execute script
    const result = this.hypothesisEngine.execute(scriptText);

    if (result.errors.length > 0) {
      const errorMsg = result.errors.map(e => `Line ${e.line || '?'}: ${e.message}`).join('\n');
      this.setStatus(`Script error: ${result.errors[0].message}`, 'error');
      console.error('Script errors:', result.errors);
      return;
    }

    // Store templates
    this.sackTemplates = result.templates;

    // Store sampling schedule and ball count
    this.samplingSchedule = result.samplingSchedule;
    this.ballCount = result.ballCount;

    // Store betting buckets
    this.bettingBuckets = result.bettingBuckets;

    // Update ball count input if schedule specified it
    if (result.ballCount) {
      document.getElementById('balls-to-spawn').value = result.ballCount;
    }

    // Update betting buckets input
    if (result.bettingBuckets) {
      document.getElementById('betting-buckets').value = result.bettingBuckets;
    }

    // Update template palette
    this.updateTemplatePalette();

    this.setStatus(`Created ${Object.keys(result.templates).length} template(s)`, 'success');
  }

  updateTemplatePalette() {
    const palette = document.getElementById('template-palette');
    palette.innerHTML = '';

    if (Object.keys(this.sackTemplates).length === 0) {
      palette.innerHTML = '<p class="help-text">Execute script to create templates</p>';
      return;
    }

    Object.values(this.sackTemplates).forEach(template => {
      const item = document.createElement('div');
      item.className = 'template-item';
      if (this.selectedTemplate === template.templateId) {
        item.classList.add('active');
      }

      // Don't show distribution - it represents uncertainty over hypothesis space
      item.innerHTML = `
        <div class="template-name">${template.templateId}</div>
      `;

      item.onclick = () => this.selectTemplate(template.templateId);

      palette.appendChild(item);
    });
  }

  selectTemplate(templateId) {
    this.selectedTemplate = templateId;
    this.currentTool = 'place';
    this.selectedComponentType = 'sack';

    // Update visual feedback
    document.querySelectorAll('.template-item').forEach(item => {
      item.classList.remove('active');
    });
    event.target.closest('.template-item')?.classList.add('active');

    this.updateCursor();
    this.setStatus(`Selected template: ${templateId}`, 'info');
  }

  setStatus(message, type = 'info') {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.style.color = type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#888';
    setTimeout(() => {
      statusEl.textContent = 'Ready';
      statusEl.style.color = '#888';
    }, 3000);
  }
}

// Initialize editor when page loads
let editor;
window.addEventListener('DOMContentLoaded', () => {
  editor = new LevelEditor();
  window.editor = editor; // For debugging and property panel callbacks
});
