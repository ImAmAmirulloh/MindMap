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
            
            if (state.currentTool === 'text') {
                canvas.style.cursor = 'text';
            } else if (state.currentTool === 'pencil') {
                canvas.style.cursor = 'crosshair';
            } else if (state.currentTool === 'select') {
                canvas.style.cursor = 'default';
            } else {
                canvas.style.cursor = 'crosshair';
            }
        });
    });

    // Mouse & Touch Events
    canvas.addEventListener('mousedown', startAction);
    canvas.addEventListener('mousemove', moveAction);
    canvas.addEventListener('mouseup', endAction);
    canvas.addEventListener('dblclick', handleDoubleClick);
    
    // Mobile Touch Support
    canvas.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent("mousedown", {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Prevent scrolling while drawing
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent("mousemove", {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }, { passive: false });
    
    canvas.addEventListener('touchend', (e) => {
        const mouseEvent = new MouseEvent("mouseup", {});
        canvas.dispatchEvent(mouseEvent);
    }, { passive: false });

    // Delete Logic (Mobile Friendly)
    document.getElementById('tool-delete').addEventListener('click', deleteSelected);

    // Settings Modal
    document.getElementById('btn-canvas-settings').onclick = () => {
        document.getElementById('canvas-width').value = state.settings.width;
        document.getElementById('canvas-height').value = state.settings.height;
        document.getElementById('canvas-bg').value = state.settings.bg;
        document.getElementById('canvas-grid').checked = state.settings.grid;
        document.getElementById('modal-canvas-settings').classList.remove('hidden');
    };
    
    document.getElementById('btn-close-settings').onclick = () => 
        document.getElementById('modal-canvas-settings').classList.add('hidden');
        
    document.getElementById('btn-apply-settings').onclick = () => {
        state.settings.width = parseInt(document.getElementById('canvas-width').value) || 1920;
        state.settings.height = parseInt(document.getElementById('canvas-height').value) || 1080;
        state.settings.bg = document.getElementById('canvas-bg').value;
        state.settings.grid = document.getElementById('canvas-grid').checked;
        resizeCanvas();
        document.getElementById('modal-canvas-settings').classList.add('hidden');
    };

    document.getElementById('btn-save').onclick = saveToLocalStorage;
    document.getElementById('btn-load').onclick = () => {
        loadFromLocalStorage();
        render();
    };
    
    document.getElementById('magnetic-snap').addEventListener('change', (e) => {
        state.settings.snap = e.target.checked;
    });
    
    // Formatting buttons
    const formatBtns = ['bold', 'italic', 'underline', 'strike', 'mark', 'sub', 'super'];
    formatBtns.forEach(fmt => {
        document.getElementById(`fmt-${fmt}`).addEventListener('click', (e) => {
            const btn = e.currentTarget;
            btn.classList.toggle('active');
            applyFormattingToSelected();
        });
    });
    
    document.getElementById('text-size').addEventListener('change', applyFormattingToSelected);
    document.getElementById('text-align').addEventListener('change', applyFormattingToSelected);
    document.getElementById('color-fill').addEventListener('change', applyFormattingToSelected);
    document.getElementById('color-stroke').addEventListener('change', applyFormattingToSelected);
    
    document.getElementById('btn-add-comment').addEventListener('click', () => {
        if (state.selectedId) {
            const obj = state.objects.find(o => o.id === state.selectedId);
            if (obj) {
                const comment = prompt("Enter comment:", obj.comment || "");
                if (comment !== null) {
                    obj.comment = comment;
                    render();
                }
            }
        } else {
            alert("Please select an object first to add a comment.");
        }
    });
}

function applyFormattingToSelected() {
    if (!state.selectedId) return;
    const obj = state.objects.find(o => o.id === state.selectedId);
    if (!obj) return;
    
    obj.color = document.getElementById('color-fill').value;
    obj.stroke = document.getElementById('color-stroke').value;
    
    if (obj.type === 'text' || obj.type === 'dot') {
        obj.fontSize = parseInt(document.getElementById('text-size').value) || 16;
        obj.textAlign = document.getElementById('text-align').value;
        obj.bold = document.getElementById('fmt-bold').classList.contains('active');
        obj.italic = document.getElementById('fmt-italic').classList.contains('active');
        obj.underline = document.getElementById('fmt-underline').classList.contains('active');
        obj.strike = document.getElementById('fmt-strike').classList.contains('active');
        obj.mark = document.getElementById('fmt-mark').classList.contains('active');
        obj.sub = document.getElementById('fmt-sub').classList.contains('active');
        obj.super = document.getElementById('fmt-super').classList.contains('active');
    }
    render();
}

function updateFormattingUI(obj) {
    document.getElementById('color-fill').value = obj.color || '#ffffff';
    document.getElementById('color-stroke').value = obj.stroke || '#000000';
    
    if (obj.type === 'text' || obj.type === 'dot') {
        document.getElementById('text-size').value = obj.fontSize || 16;
        document.getElementById('text-align').value = obj.textAlign || 'center';
        document.getElementById('fmt-bold').classList.toggle('active', !!obj.bold);
        document.getElementById('fmt-italic').classList.toggle('active', !!obj.italic);
        document.getElementById('fmt-underline').classList.toggle('active', !!obj.underline);
        document.getElementById('fmt-strike').classList.toggle('active', !!obj.strike);
        document.getElementById('fmt-mark').classList.toggle('active', !!obj.mark);
        document.getElementById('fmt-sub').classList.toggle('active', !!obj.sub);
        document.getElementById('fmt-super').classList.toggle('active', !!obj.super);
    }
}

// --- Core Functionality ---

function getHitObject(x, y) {
    // Reverse loop to select top-most object
    for (let i = state.objects.length - 1; i >= 0; i--) {
        const obj = state.objects[i];
        if (obj.type === 'line') {
            // Simple bounding box for line
            const minX = Math.min(obj.x, obj.endX);
            const maxX = Math.max(obj.x, obj.endX);
            const minY = Math.min(obj.y, obj.endY);
            const maxY = Math.max(obj.y, obj.endY);
            if (x >= minX - 5 && x <= maxX + 5 && y >= minY - 5 && y <= maxY + 5) return obj;
        } else if (obj.type === 'pencil') {
            // Bounding box for pencil
            let minX = obj.x, maxX = obj.x, minY = obj.y, maxY = obj.y;
            obj.points.forEach(p => {
                minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
            });
            if (x >= minX - 5 && x <= maxX + 5 && y >= minY - 5 && y <= maxY + 5) return obj;
        } else {
            const w = obj.w || 50;
            const h = obj.h || 50;
            let ox = obj.x;
            let oy = obj.y;
            
            if (obj.type === 'circle' || obj.type === 'polygon' || obj.type === 'dot') {
                // Adjust for center-based drawing
                ox = obj.x - Math.abs(w/2);
                oy = obj.y - Math.abs(h/2);
            }
            
            if (x >= ox && x <= ox + Math.abs(w) && y >= oy && y <= oy + Math.abs(h)) {
                return obj;
            }
        }
    }
    return null;
}

function startAction(e) {
    if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') return;
    
    const { x, y } = getMousePos(e);
    state.startX = state.settings.snap ? Math.round(x / 20) * 20 : x;
    state.startY = state.settings.snap ? Math.round(y / 20) * 20 : y;
    state.isDrawing = true;

    if (state.currentTool === 'select') {
        const clickedObj = getHitObject(x, y);
        state.selectedId = clickedObj ? clickedObj.id : null;
        if (clickedObj) {
            updateFormattingUI(clickedObj);
            // Calculate offset for dragging
            state.dragOffsetX = x - clickedObj.x;
            state.dragOffsetY = y - clickedObj.y;
        }
    } else if (state.currentTool === 'text') {
        const text = prompt("Enter text:", "New Text");
        if (text) {
            state.objects.push({
                id: Date.now(),
                type: 'text',
                x: state.startX,
                y: state.startY,
                w: 100,
                h: 30,
                color: document.getElementById('color-fill').value,
                stroke: document.getElementById('color-stroke').value,
                text: text,
                fontSize: parseInt(document.getElementById('text-size').value) || 16,
                textAlign: document.getElementById('text-align').value,
                comment: ""
            });
            state.isDrawing = false;
        }
    } else {
        // Start creating a new shape
        state.tempObject = {
            id: Date.now(),
            type: state.currentTool,
            x: state.startX,
            y: state.startY,
            w: 0,
            h: 0,
            color: document.getElementById('color-fill').value,
            stroke: document.getElementById('color-stroke').value,
            comment: ""
        };
        
        if (state.currentTool === 'pencil') {
            state.tempObject.points = [{x: state.startX, y: state.startY}];
        } else if (state.currentTool === 'line') {
            state.tempObject.endX = state.startX;
            state.tempObject.endY = state.startY;
        } else if (state.currentTool === 'polygon') {
            state.tempObject.sides = parseInt(document.getElementById('polygon-sides').value) || 5;
        } else if (state.currentTool === 'dot') {
            state.tempObject.text = "List Item";
            state.tempObject.fontSize = parseInt(document.getElementById('text-size').value) || 16;
            state.tempObject.textAlign = document.getElementById('text-align').value;
        }
    }
    render();
}

function moveAction(e) {
    const { x, y } = getMousePos(e);
    handleHoverComment(x, y);

    if (!state.isDrawing) return;
    
    const currentX = state.settings.snap ? Math.round(x / 20) * 20 : x;
    const currentY = state.settings.snap ? Math.round(y / 20) * 20 : y;

    if (state.currentTool !== 'select' && state.currentTool !== 'text' && state.tempObject) {
        if (state.currentTool === 'pencil') {
            state.tempObject.points.push({x: currentX, y: currentY});
        } else if (state.currentTool === 'line') {
            state.tempObject.endX = currentX;
            state.tempObject.endY = currentY;
        } else {
            state.tempObject.w = currentX - state.startX;
            state.tempObject.h = currentY - state.startY;
        }
    } else if (state.currentTool === 'select' && state.selectedId) {
        const obj = state.objects.find(o => o.id === state.selectedId);
        if (obj) {
            obj.x = state.settings.snap ? Math.round((x - state.dragOffsetX) / 20) * 20 : x - state.dragOffsetX;
            obj.y = state.settings.snap ? Math.round((y - state.dragOffsetY) / 20) * 20 : y - state.dragOffsetY;
            
            if (obj.type === 'line') {
                // Move end point as well
                const dx = obj.x - (x - state.dragOffsetX);
                const dy = obj.y - (y - state.dragOffsetY);
                obj.endX -= dx;
                obj.endY -= dy;
            } else if (obj.type === 'pencil') {
                const dx = obj.x - (x - state.dragOffsetX);
                const dy = obj.y - (y - state.dragOffsetY);
                obj.points.forEach(p => {
                    p.x -= dx;
                    p.y -= dy;
                });
            }
        }
    }
    render();
}

function endAction() {
    if (state.tempObject) {
        // Don't add if it's too small (accidental click)
        if (state.tempObject.type === 'pencil' && state.tempObject.points.length < 2) {
            // ignore
        } else if (state.tempObject.type !== 'pencil' && state.tempObject.type !== 'line' && Math.abs(state.tempObject.w) < 5 && Math.abs(state.tempObject.h) < 5) {
            // ignore unless it's a dot
            if (state.tempObject.type === 'dot') {
                state.tempObject.w = 20;
                state.tempObject.h = 20;
                state.objects.push(state.tempObject);
            }
        } else {
            state.objects.push(state.tempObject);
        }
        state.tempObject = null;
    }
    state.isDrawing = false;
    render();
}

function handleDoubleClick(e) {
    const { x, y } = getMousePos(e);
    const clickedObj = getHitObject(x, y);
    
    if (clickedObj && (clickedObj.type === 'text' || clickedObj.type === 'dot')) {
        const newText = prompt("Edit text:", clickedObj.text);
        if (newText !== null) {
            clickedObj.text = newText;
            render();
        }
    }
}

// --- Hover Logic (3 Seconds) ---
function handleHoverComment(x, y) {
    clearTimeout(state.hoverTimer);
    const tooltip = document.getElementById('comment-tooltip');
    tooltip.classList.add('hidden');

    const hoveredObj = getHitObject(x, y);

    if (hoveredObj && hoveredObj.comment) {
        state.hoverTimer = setTimeout(() => {
            tooltip.innerText = hoveredObj.comment;
            tooltip.style.left = `${x + 15}px`;
            tooltip.style.top = `${y + 15}px`;
            tooltip.classList.remove('hidden');
        }, 1000); // Changed to 1 second for better UX
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
        
        ctx.save();
        ctx.fillStyle = obj.color || 'transparent';
        ctx.strokeStyle = obj.stroke || '#000000';
        ctx.lineWidth = (obj.id === state.selectedId) ? 3 : 2;
        
        // Selection highlight
        if (obj.id === state.selectedId) {
            ctx.shadowColor = 'rgba(37, 99, 235, 0.5)';
            ctx.shadowBlur = 10;
        }

        if (obj.type === 'cube') {
            if (obj.color !== 'transparent') ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
        } else if (obj.type === 'circle') {
            ctx.beginPath();
            ctx.arc(obj.x + obj.w/2, obj.y + obj.h/2, Math.abs(obj.w/2), 0, Math.PI*2);
            if (obj.color !== 'transparent') ctx.fill();
            ctx.stroke();
        } else if (obj.type === 'line') {
            ctx.beginPath();
            ctx.moveTo(obj.x, obj.y);
            ctx.lineTo(obj.endX, obj.endY);
            ctx.stroke();
        } else if (obj.type === 'pencil') {
            if (obj.points && obj.points.length > 0) {
                ctx.beginPath();
                ctx.moveTo(obj.points[0].x, obj.points[0].y);
                for (let i = 1; i < obj.points.length; i++) {
                    ctx.lineTo(obj.points[i].x, obj.points[i].y);
                }
                ctx.stroke();
            }
        } else if (obj.type === 'polygon') {
            const sides = obj.sides || 5;
            const radius = Math.abs(obj.w / 2);
            const cx = obj.x + obj.w/2;
            const cy = obj.y + obj.h/2;
            
            ctx.beginPath();
            for (let i = 0; i < sides; i++) {
                const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
                const px = cx + radius * Math.cos(angle);
                const py = cy + radius * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            if (obj.color !== 'transparent') ctx.fill();
            ctx.stroke();
        } else if (obj.type === 'dot') {
            // Draw dot
            ctx.beginPath();
            ctx.arc(obj.x, obj.y, 6, 0, Math.PI*2);
            ctx.fillStyle = obj.stroke; // Dot is usually filled with stroke color
            ctx.fill();
            
            // Draw text next to dot
            if (obj.text) {
                drawFormattedText(obj, obj.x + 15, obj.y + 5);
            }
        } else if (obj.type === 'text') {
            if (obj.text) {
                drawFormattedText(obj, obj.x, obj.y);
            }
        }
        
        ctx.restore();
    });
}

function drawFormattedText(obj, x, y) {
    ctx.fillStyle = obj.stroke || '#000000'; // Text color uses stroke color
    
    let fontStr = '';
    if (obj.italic) fontStr += 'italic ';
    if (obj.bold) fontStr += 'bold ';
    
    let size = obj.fontSize || 16;
    if (obj.sub || obj.super) size = Math.round(size * 0.7);
    
    fontStr += `${size}px Arial`;
    ctx.font = fontStr;
    ctx.textAlign = obj.textAlign || 'left';
    ctx.textBaseline = 'middle';
    
    let drawY = y;
    if (obj.sub) drawY += size * 0.5;
    if (obj.super) drawY -= size * 0.5;
    
    // Background highlight
    if (obj.mark) {
        const metrics = ctx.measureText(obj.text);
        const textWidth = metrics.width;
        const textHeight = size * 1.2;
        ctx.fillStyle = 'yellow';
        
        let bgX = x;
        if (ctx.textAlign === 'center') bgX -= textWidth / 2;
        else if (ctx.textAlign === 'right') bgX -= textWidth;
        
        ctx.fillRect(bgX, drawY - textHeight/2, textWidth, textHeight);
        ctx.fillStyle = obj.stroke || '#000000'; // Reset to text color
    }
    
    ctx.fillText(obj.text, x, drawY);
    
    // Underline & Strikethrough
    if (obj.underline || obj.strike) {
        const metrics = ctx.measureText(obj.text);
        const textWidth = metrics.width;
        
        let lineX = x;
        if (ctx.textAlign === 'center') lineX -= textWidth / 2;
        else if (ctx.textAlign === 'right') lineX -= textWidth;
        
        ctx.beginPath();
        ctx.lineWidth = Math.max(1, size / 15);
        ctx.strokeStyle = obj.stroke || '#000000';
        
        if (obj.underline) {
            ctx.moveTo(lineX, drawY + size * 0.6);
            ctx.lineTo(lineX + textWidth, drawY + size * 0.6);
        }
        if (obj.strike) {
            ctx.moveTo(lineX, drawY);
            ctx.lineTo(lineX + textWidth, drawY);
        }
        ctx.stroke();
    }
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
    localStorage.setItem('mindmap_settings', JSON.stringify(state.settings));
    alert('Progress saved locally!');
}

function loadFromLocalStorage() {
    const data = localStorage.getItem('mindmap_data');
    if (data) state.objects = JSON.parse(data);
    
    const settings = localStorage.getItem('mindmap_settings');
    if (settings) state.settings = JSON.parse(settings);
}

// Start the app
init();