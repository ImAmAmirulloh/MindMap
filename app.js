/**
 * MindMap Creator - Core Logic
 */

const canvas = document.getElementById('mindmap-canvas');
const ctx = canvas.getContext('2d');
const wrapper = document.getElementById('canvas-wrapper');

// --- State Management ---
let state = {
    objects: [],
    selectedId: null,
    currentTool: 'select',
    isDrawing: false,
    startX: 0,
    startY: 0,
    tempObject: null,
    hoverTimer: null,
    settings: {
        width: 1920,
        height: 1080,
        bg: '#ffffff',
        grid: true,
        snap: false
    }
};

// --- Initialization ---
function init() {
    loadFromLocalStorage();
    resizeCanvas();
    setupEventListeners();
    render();
}

function resizeCanvas() {
    canvas.width = state.settings.width;
    canvas.height = state.settings.height;
    canvas.style.backgroundColor = state.settings.bg;
    render();
}

// --- Event Listeners ---
function setupEventListeners() {
    // Toolbar Tool Selection
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelector('.tool-btn.active')?.classList.remove('active');
            btn.classList.add('active');
            state.currentTool = btn.id.replace('tool-', '').replace('shape-', '');
        });
    });

    // Mouse & Touch Events
    canvas.addEventListener('mousedown', startAction);
    canvas.addEventListener('mousemove', moveAction);
    canvas.addEventListener('mouseup', endAction);
    
    // Mobile Touch Support
    canvas.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent("mousedown", {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }, { passive: false });

    // Delete Logic (Mobile Friendly)
    document.getElementById('tool-delete').addEventListener('click', deleteSelected);

    // Settings Modal
    document.getElementById('btn-canvas-settings').onclick = () => 
        document.getElementById('modal-canvas-settings').classList.remove('hidden');
    
    document.getElementById('btn-close-settings').onclick = () => 
        document.getElementById('modal-canvas-settings').classList.add('hidden');

    document.getElementById('btn-save').onclick = saveToLocalStorage;
}

// --- Core Functionality ---

function startAction(e) {
    const { x, y } = getMousePos(e);
    state.startX = x;
    state.startY = y;
    state.isDrawing = true;

    if (state.currentTool === 'select') {
        // Simple hit detection for selection
        const clickedObj = state.objects.findLast(obj => 
            x >= obj.x && x <= obj.x + (obj.w || 50) && 
            y >= obj.y && y <= obj.y + (obj.h || 50)
        );
        state.selectedId = clickedObj ? clickedObj.id : null;
    } else {
        // Start creating a new shape
        state.tempObject = {
            id: Date.now(),
            type: state.currentTool,
            x: x,
            y: y,
            w: 0,
            h: 0,
            color: document.getElementById('color-fill').value,
            stroke: document.getElementById('color-stroke').value,
            text: state.currentTool === 'text' ? 'New Text' : '',
            comment: ""
        };
    }
    render();
}

function moveAction(e) {
    const { x, y } = getMousePos(e);
    handleHoverComment(x, y);

    if (!state.isDrawing) return;

    if (state.currentTool !== 'select' && state.tempObject) {
        state.tempObject.w = x - state.startX;
        state.tempObject.h = y - state.startY;
    } else if (state.currentTool === 'select' && state.selectedId) {
        const obj = state.objects.find(o => o.id === state.selectedId);
        if (obj) {
            obj.x = state.settings.snap ? Math.round(x / 20) * 20 : x;
            obj.y = state.settings.snap ? Math.round(y / 20) * 20 : y;
        }
    }
    render();
}

function endAction() {
    if (state.tempObject) {
        state.objects.push(state.tempObject);
        state.tempObject = null;
    }
    state.isDrawing = false;
    render();
}

// --- Hover Logic (3 Seconds) ---
function handleHoverComment(x, y) {
    clearTimeout(state.hoverTimer);
    const tooltip = document.getElementById('comment-tooltip');
    tooltip.classList.add('hidden');

    const hoveredObj = state.objects.findLast(obj => 
        x >= obj.x && x <= obj.x + (obj.w || 50) && 
        y >= obj.y && y <= obj.y + (obj.h || 50)
    );

    if (hoveredObj && hoveredObj.comment) {
        state.hoverTimer = setTimeout(() => {
            tooltip.innerText = hoveredObj.comment;
            tooltip.style.left = `${hoveredObj.x}px`;
            tooltip.style.top = `${hoveredObj.y - 30}px`;
            tooltip.classList.remove('hidden');
        }, 3000);
    }
}

// --- Drawing Engine ---
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Grid if enabled
    if (state.settings.grid) drawGrid();

    // Draw all objects
    [...state.objects, state.tempObject].forEach(obj => {
        if (!obj) return;
        ctx.fillStyle = obj.color;
        ctx.strokeStyle = obj.stroke;
        ctx.lineWidth = (obj.id === state.selectedId) ? 3 : 1;

        if (obj.type === 'cube') {
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
        } else if (obj.type === 'circle') {
            ctx.beginPath();
            ctx.arc(obj.x + obj.w/2, obj.y + obj.h/2, Math.abs(obj.w/2), 0, Math.PI*2);
            ctx.fill();
            ctx.stroke();
        }
        // ... Add logic for other shapes (polygon, line) here
    });
}

function drawGrid() {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }
}

// --- Utilities ---
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
}

function deleteSelected() {
    state.objects = state.objects.filter(o => o.id !== state.selectedId);
    state.selectedId = null;
    render();
}

// --- Storage ---
function saveToLocalStorage() {
    localStorage.setItem('mindmap_data', JSON.stringify(state.objects));
    alert('Progress saved locally!');
}

function loadFromLocalStorage() {
    const data = localStorage.getItem('mindmap_data');
    if (data) state.objects = JSON.parse(data);
}

// Start the app
init();