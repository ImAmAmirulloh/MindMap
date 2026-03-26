// State
let state = {
  elements: [],
  selectedIds: [],
  tool: 'select',
  currentStyle: {
    fill: '#ffffff',
    stroke: '#000000',
    strokeWidth: 2,
    fontSize: 16,
    fontFamily: 'Arial',
    fontStyle: 'normal',
    textDecoration: '',
    align: 'left',
    sides: 5,
  },
  canvasSettings: {
    width: 1200,
    height: 800,
    backgroundColor: '#f0f0f0',
    showGrid: true,
    gridSize: 20,
  },
  magnetic: false,
};

// Load state
const saved = localStorage.getItem('mindmap-vanilla');
if (saved) {
  try {
    const parsed = JSON.parse(saved);
    state.elements = parsed.elements || [];
    state.canvasSettings = parsed.canvasSettings || state.canvasSettings;
  } catch(e){}
}

function saveState() {
  localStorage.setItem('mindmap-vanilla', JSON.stringify({
    elements: state.elements,
    canvasSettings: state.canvasSettings
  }));
}

// Generate UUID
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Konva Setup
const stage = new Konva.Stage({
  container: 'canvas-container',
  width: state.canvasSettings.width,
  height: state.canvasSettings.height,
});

const gridLayer = new Konva.Layer();
const mainLayer = new Konva.Layer();
stage.add(gridLayer);
stage.add(mainLayer);

const tr = new Konva.Transformer({
  boundBoxFunc: (oldBox, newBox) => {
    if (newBox.width < 5 || newBox.height < 5) return oldBox;
    return newBox;
  }
});
mainLayer.add(tr);

// Draw Grid
function drawGrid() {
  gridLayer.destroyChildren();
  if (!state.canvasSettings.showGrid) {
    gridLayer.draw();
    return;
  }
  const size = state.canvasSettings.gridSize;
  const w = state.canvasSettings.width;
  const h = state.canvasSettings.height;
  
  for (let i = 0; i < w / size; i++) {
    gridLayer.add(new Konva.Line({
      points: [Math.round(i * size) + 0.5, 0, Math.round(i * size) + 0.5, h],
      stroke: '#ddd',
      strokeWidth: 1,
    }));
  }
  for (let j = 0; j < h / size; j++) {
    gridLayer.add(new Konva.Line({
      points: [0, Math.round(j * size) + 0.5, w, Math.round(j * size) + 0.5],
      stroke: '#ddd',
      strokeWidth: 1,
    }));
  }
  gridLayer.draw();
}

// Render Elements
let konvaNodes = {};

function renderElements() {
  // Clear old nodes not in state
  const currentIds = state.elements.map(e => e.id);
  Object.keys(konvaNodes).forEach(id => {
    if (!currentIds.includes(id)) {
      konvaNodes[id].destroy();
      delete konvaNodes[id];
    }
  });

  state.elements.forEach(el => {
    let node = konvaNodes[el.id];
    if (!node) {
      node = createKonvaNode(el);
      konvaNodes[el.id] = node;
      mainLayer.add(node);
    } else {
      updateKonvaNode(node, el);
    }
  });

  // Update Transformer
  const selectedNodes = state.selectedIds.map(id => konvaNodes[id]).filter(Boolean);
  tr.nodes(selectedNodes);
  
  mainLayer.batchDraw();
  
  // Update UI
  renderPropertiesPanel();
  renderToolbar();
}

function createKonvaNode(el) {
  let node;
  const common = {
    id: el.id,
    x: el.x,
    y: el.y,
    draggable: state.tool === 'select',
    fill: el.style.fill,
    stroke: el.style.stroke,
    strokeWidth: el.style.strokeWidth || 2,
  };

  switch(el.type) {
    case 'rectangle':
      node = new Konva.Rect({ ...common, width: el.width, height: el.height });
      break;
    case 'circle':
      node = new Konva.Circle({ ...common, radius: (el.width || 0) / 2 });
      break;
    case 'polygon':
      node = new Konva.RegularPolygon({ ...common, sides: el.style.sides || 5, radius: (el.width || 0) / 2 });
      break;
    case 'line':
    case 'pencil':
      node = new Konva.Line({
        ...common,
        points: el.points || [],
        tension: el.type === 'pencil' ? 0.5 : 0,
        lineCap: 'round',
        lineJoin: 'round',
        fill: undefined
      });
      break;
    case 'dot':
      node = new Konva.Group({ id: el.id, x: el.x, y: el.y, draggable: state.tool === 'select' });
      const dot = new Konva.Circle({ radius: 5, fill: el.style.fill, stroke: el.style.stroke, strokeWidth: el.style.strokeWidth });
      const dotText = new Konva.Text({
        x: 15, y: -8,
        text: el.text || 'List item',
        fontSize: el.style.fontSize,
        fontFamily: el.style.fontFamily,
        fill: el.style.stroke,
        fontStyle: el.style.fontStyle,
        textDecoration: el.style.textDecoration,
        align: el.style.align
      });
      node.add(dot);
      node.add(dotText);
      break;
    case 'text':
      node = new Konva.Group({ id: el.id, x: el.x, y: el.y, draggable: state.tool === 'select' });
      const bg = new Konva.Rect({ width: el.width, height: el.height, fill: 'transparent' });
      const txt = new Konva.Text({
        text: el.text,
        width: el.width,
        height: el.height,
        fontSize: el.style.fontSize,
        fontFamily: el.style.fontFamily,
        fill: el.style.stroke,
        fontStyle: el.style.fontStyle,
        textDecoration: el.style.textDecoration,
        align: el.style.align,
        padding: 4
      });
      node.add(bg);
      node.add(txt);
      break;
  }

  // Events
  node.on('mousedown touchstart', (e) => {
    if (state.tool !== 'select') return;
    e.cancelBubble = true;
    const meta = e.evt && (e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey);
    const isSel = state.selectedIds.includes(el.id);
    if (!meta && !isSel) {
      state.selectedIds = [el.id];
    } else if (meta && isSel) {
      state.selectedIds = state.selectedIds.filter(id => id !== el.id);
    } else if (meta && !isSel) {
      state.selectedIds.push(el.id);
    }
    renderElements();
  });

  node.on('dragend', (e) => {
    let x = e.target.x();
    let y = e.target.y();
    if (state.magnetic) {
      x = snapToGrid(x);
      y = snapToGrid(y);
      e.target.position({x, y});
    }
    updateElement(el.id, {x, y});
  });

  node.on('transformend', (e) => {
    const n = e.target;
    const scaleX = n.scaleX();
    const scaleY = n.scaleY();
    n.scaleX(1);
    n.scaleY(1);
    
    const currentEl = state.elements.find(e => e.id === el.id);
    if (!currentEl) return;

    if (['rectangle', 'text', 'circle', 'dot', 'polygon'].includes(currentEl.type)) {
      updateElement(el.id, {
        x: n.x(),
        y: n.y(),
        width: Math.max(5, (currentEl.width || 0) * scaleX),
        height: Math.max(5, (currentEl.height || 0) * scaleY)
      });
    }
  });

  let hoverTimer;
  node.on('mouseenter', (e) => {
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      const pos = stage.getPointerPosition();
      const currentEl = state.elements.find(e => e.id === el.id);
      if (pos && currentEl && currentEl.comment) {
        const popup = document.getElementById('comment-popup');
        const text = document.getElementById('comment-text');
        text.textContent = currentEl.comment;
        popup.style.left = (pos.x + 15) + 'px';
        popup.style.top = (pos.y + 15) + 'px';
        popup.classList.remove('hidden');
      }
    }, 3000);
  });

  node.on('mouseleave', () => {
    clearTimeout(hoverTimer);
    document.getElementById('comment-popup').classList.add('hidden');
  });

  node.on('dblclick dbltap', (e) => {
    if (state.tool !== 'select') return;
    const currentEl = state.elements.find(e => e.id === el.id);
    if (currentEl && (currentEl.type === 'text' || currentEl.type === 'dot')) {
      openTextEditor(currentEl, node);
    }
  });

  return node;
}

function updateKonvaNode(node, el) {
  node.setAttrs({
    x: el.x,
    y: el.y,
    draggable: state.tool === 'select',
  });

  if (el.type === 'rectangle') {
    node.setAttrs({ width: el.width, height: el.height, fill: el.style.fill, stroke: el.style.stroke, strokeWidth: el.style.strokeWidth || 2 });
  } else if (el.type === 'circle') {
    node.setAttrs({ radius: (el.width || 0) / 2, fill: el.style.fill, stroke: el.style.stroke, strokeWidth: el.style.strokeWidth || 2 });
  } else if (el.type === 'polygon') {
    node.setAttrs({ sides: el.style.sides || 5, radius: (el.width || 0) / 2, fill: el.style.fill, stroke: el.style.stroke, strokeWidth: el.style.strokeWidth || 2 });
  } else if (el.type === 'line' || el.type === 'pencil') {
    node.setAttrs({ points: el.points, stroke: el.style.stroke, strokeWidth: el.style.strokeWidth || 2 });
  } else if (el.type === 'dot') {
    const dot = node.children[0];
    const txt = node.children[1];
    dot.setAttrs({ fill: el.style.fill, stroke: el.style.stroke, strokeWidth: el.style.strokeWidth || 2 });
    txt.setAttrs({
      text: el.text || 'List item',
      fontSize: el.style.fontSize,
      fontFamily: el.style.fontFamily,
      fill: el.style.stroke,
      fontStyle: el.style.fontStyle,
      textDecoration: el.style.textDecoration,
      align: el.style.align
    });
  } else if (el.type === 'text') {
    const bg = node.children[0];
    const txt = node.children[1];
    bg.setAttrs({ width: el.width, height: el.height });
    txt.setAttrs({
      text: el.text,
      width: el.width,
      height: el.height,
      fontSize: el.style.fontSize,
      fontFamily: el.style.fontFamily,
      fill: el.style.stroke,
      fontStyle: el.style.fontStyle,
      textDecoration: el.style.textDecoration,
      align: el.style.align
    });
  }
}

function updateElement(id, updates) {
  const el = state.elements.find(e => e.id === id);
  if (el) {
    Object.assign(el, updates);
    saveState();
    renderElements();
  }
}

function snapToGrid(val) {
  if (!state.magnetic) return val;
  const size = state.canvasSettings.gridSize;
  return Math.round(val / size) * size;
}

// Drawing Logic
let isDrawing = false;
let newElement = null;

stage.on('mousedown touchstart', (e) => {
  if (state.tool === 'select') {
    if (e.target === stage) {
      state.selectedIds = [];
      renderElements();
    }
    return;
  }

  const pos = stage.getPointerPosition();
  if (!pos) return;

  let x = snapToGrid(pos.x);
  let y = snapToGrid(pos.y);

  isDrawing = true;
  const id = uuidv4();

  newElement = {
    id,
    type: state.tool,
    x, y,
    style: JSON.parse(JSON.stringify(state.currentStyle))
  };

  if (['rectangle', 'circle', 'dot', 'polygon'].includes(state.tool)) {
    newElement.width = 0;
    newElement.height = 0;
  } else if (['line', 'pencil'].includes(state.tool)) {
    newElement.points = [x, y];
  } else if (state.tool === 'text') {
    newElement.text = 'Double click to edit';
    newElement.width = 150;
    newElement.height = 50;
    state.elements.push(newElement);
    state.selectedIds = [id];
    isDrawing = false;
    newElement = null;
    saveState();
    renderElements();
    return;
  }

  state.elements.push(newElement);
  renderElements();
});

stage.on('mousemove touchmove', (e) => {
  if (!isDrawing || !newElement) return;
  const pos = stage.getPointerPosition();
  if (!pos) return;

  let x = pos.x;
  let y = pos.y;

  if (state.magnetic && state.tool !== 'pencil') {
    x = snapToGrid(x);
    y = snapToGrid(y);
  }

  if (state.tool === 'rectangle') {
    newElement.width = x - newElement.x;
    newElement.height = y - newElement.y;
  } else if (['circle', 'dot', 'polygon'].includes(state.tool)) {
    const radius = Math.sqrt(Math.pow(x - newElement.x, 2) + Math.pow(y - newElement.y, 2));
    newElement.width = radius * 2;
    newElement.height = radius * 2;
  } else if (state.tool === 'line') {
    newElement.points = [newElement.points[0], newElement.points[1], x, y];
  } else if (state.tool === 'pencil') {
    newElement.points.push(x, y);
  }
  
  renderElements();
});

stage.on('mouseup touchend', () => {
  if (!isDrawing || !newElement) return;
  isDrawing = false;
  
  if (state.tool === 'rectangle' && Math.abs(newElement.width) < 5 && Math.abs(newElement.height) < 5) {
    state.elements = state.elements.filter(e => e.id !== newElement.id);
  } else {
    state.selectedIds = [newElement.id];
    saveState();
  }
  newElement = null;
  renderElements();
});

// Text Editor
const textEditor = document.getElementById('text-editor');
let editingId = null;

function openTextEditor(el, node) {
  editingId = el.id;
  textEditor.value = el.text || '';
  textEditor.classList.remove('hidden');
  
  let absPos = node.absolutePosition();
  if (el.type === 'dot') {
    absPos.x += 15;
    absPos.y -= 8;
  }
  
  textEditor.style.left = absPos.x + 'px';
  textEditor.style.top = absPos.y + 'px';
  textEditor.style.width = Math.max(100, el.width || 100) + 'px';
  textEditor.style.height = Math.max(50, el.height || 50) + 'px';
  textEditor.style.fontSize = el.style.fontSize + 'px';
  textEditor.style.fontFamily = el.style.fontFamily;
  textEditor.style.color = el.style.stroke;
  textEditor.style.backgroundColor = el.style.fill === 'transparent' ? 'white' : el.style.fill;
  
  textEditor.focus();
}

textEditor.addEventListener('blur', () => {
  if (editingId) {
    updateElement(editingId, { text: textEditor.value });
    editingId = null;
    textEditor.classList.add('hidden');
  }
});

// Keyboard
window.addEventListener('keydown', (e) => {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (state.selectedIds.length > 0 && !editingId) {
      state.elements = state.elements.filter(el => !state.selectedIds.includes(el.id));
      state.selectedIds = [];
      saveState();
      renderElements();
    }
  }
});

// UI Rendering
const tools = [
  { id: 'select', icon: 'mouse-pointer-2', label: 'Select' },
  { id: 'rectangle', icon: 'square', label: 'Rectangle' },
  { id: 'circle', icon: 'circle', label: 'Circle' },
  { id: 'dot', icon: 'list', label: 'Dot List' },
  { id: 'polygon', icon: 'hexagon', label: 'Polygon' },
  { id: 'line', icon: 'minus', label: 'Line' },
  { id: 'pencil', icon: 'pencil', label: 'Pencil' },
  { id: 'text', icon: 'type', label: 'Text' },
];

function renderToolbar() {
  const tb = document.getElementById('toolbar');
  tb.innerHTML = '';
  
  tools.forEach(t => {
    const btn = document.createElement('button');
    btn.className = `p-3 rounded-xl transition-colors shrink-0 ${state.tool === t.id ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`;
    btn.title = t.label;
    btn.innerHTML = `<i data-lucide="${t.icon}"></i>`;
    btn.onclick = () => { state.tool = t.id; state.selectedIds = []; renderElements(); };
    tb.appendChild(btn);
  });
  
  const div1 = document.createElement('div');
  div1.className = 'w-px h-8 md:w-full md:h-px bg-gray-200 my-0 md:my-2 shrink-0';
  tb.appendChild(div1);
  
  const magBtn = document.createElement('button');
  magBtn.className = `p-3 rounded-xl transition-colors shrink-0 ${state.magnetic ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100 text-gray-600'}`;
  magBtn.title = 'Magnetic Grid Snap';
  magBtn.innerHTML = `<i data-lucide="magnet"></i>`;
  magBtn.onclick = () => { state.magnetic = !state.magnetic; renderElements(); };
  tb.appendChild(magBtn);
  
  const div2 = document.createElement('div');
  div2.className = 'w-px h-8 md:w-full md:h-px bg-gray-200 my-0 md:my-2 shrink-0';
  tb.appendChild(div2);
  
  const delBtn = document.createElement('button');
  delBtn.className = `p-3 rounded-xl transition-colors shrink-0 ${state.selectedIds.length > 0 ? 'hover:bg-red-100 text-red-600' : 'text-gray-300 cursor-not-allowed'}`;
  delBtn.title = 'Delete Selected';
  delBtn.disabled = state.selectedIds.length === 0;
  delBtn.innerHTML = `<i data-lucide="trash-2"></i>`;
  delBtn.onclick = () => {
    if (state.selectedIds.length > 0) {
      state.elements = state.elements.filter(el => !state.selectedIds.includes(el.id));
      state.selectedIds = [];
      saveState();
      renderElements();
    }
  };
  tb.appendChild(delBtn);
  
  lucide.createIcons();
}

const colors = [
  'transparent', '#ffffff', '#000000', '#f87171', '#fb923c', '#fbbf24', 
  '#4ade80', '#2dd4bf', '#60a5fa', '#818cf8', '#c084fc', '#f472b6'
];

function renderPropertiesPanel() {
  const panel = document.getElementById('properties-panel');
  const selectedEl = state.selectedIds.length === 1 ? state.elements.find(e => e.id === state.selectedIds[0]) : null;
  const style = selectedEl ? selectedEl.style : state.currentStyle;
  
  const handleStyleChange = (updates) => {
    if (selectedEl) {
      updateElement(selectedEl.id, { style: { ...selectedEl.style, ...updates } });
    } else {
      Object.assign(state.currentStyle, updates);
      renderElements();
    }
  };

  const toggleFontStyle = (name) => {
    const cur = style.fontStyle || '';
    const isSet = cur.includes(name);
    handleStyleChange({ fontStyle: isSet ? cur.replace(name, '').trim() : `${cur} ${name}`.trim() });
  };

  const toggleTextDec = (name) => {
    const cur = style.textDecoration || '';
    const isSet = cur.includes(name);
    handleStyleChange({ textDecoration: isSet ? cur.replace(name, '').trim() : `${cur} ${name}`.trim() });
  };

  let html = `
    <div>
      <h3 class="text-sm font-semibold text-gray-700 mb-3">Fill Color</h3>
      <div class="grid grid-cols-6 gap-2" id="fill-colors"></div>
    </div>
    <div>
      <h3 class="text-sm font-semibold text-gray-700 mb-3">Stroke Color</h3>
      <div class="grid grid-cols-6 gap-2" id="stroke-colors"></div>
    </div>
    <div>
      <h3 class="text-sm font-semibold text-gray-700 mb-3">Stroke Width</h3>
      <input type="range" min="0" max="20" value="${style.strokeWidth || 0}" id="stroke-width" class="w-full" />
      <div class="text-xs text-gray-500 mt-1 text-right">${style.strokeWidth || 0}px</div>
    </div>
    <div>
      <h3 class="text-sm font-semibold text-gray-700 mb-3">Text Style</h3>
      <div class="flex items-center gap-2 mb-3">
        <span class="text-xs text-gray-500 w-12">Size:</span>
        <input type="number" value="${style.fontSize || 16}" id="font-size" class="border rounded px-2 py-1 w-20 text-sm" />
      </div>
      <div class="flex gap-1 mb-3 bg-gray-100 p-1 rounded-lg flex-wrap">
        <button id="btn-bold" class="p-2 rounded ${style.fontStyle?.includes('bold') ? 'bg-white shadow' : ''}" title="Bold"><i data-lucide="bold" class="w-4 h-4"></i></button>
        <button id="btn-italic" class="p-2 rounded ${style.fontStyle?.includes('italic') ? 'bg-white shadow' : ''}" title="Italic"><i data-lucide="italic" class="w-4 h-4"></i></button>
        <button id="btn-underline" class="p-2 rounded ${style.textDecoration?.includes('underline') ? 'bg-white shadow' : ''}" title="Underline"><i data-lucide="underline" class="w-4 h-4"></i></button>
        <button id="btn-strike" class="p-2 rounded ${style.textDecoration?.includes('line-through') ? 'bg-white shadow' : ''}" title="Strikethrough"><i data-lucide="strikethrough" class="w-4 h-4"></i></button>
        <button id="btn-super" class="p-2 rounded ${style.fontStyle?.includes('super') ? 'bg-white shadow' : ''}" title="Superscript"><i data-lucide="superscript" class="w-4 h-4"></i></button>
        <button id="btn-sub" class="p-2 rounded ${style.fontStyle?.includes('sub') ? 'bg-white shadow' : ''}" title="Subscript"><i data-lucide="subscript" class="w-4 h-4"></i></button>
        <button id="btn-high" class="p-2 rounded ${style.fill === '#fbbf24' ? 'bg-white shadow' : ''}" title="Highlight"><i data-lucide="highlighter" class="w-4 h-4"></i></button>
        <button id="btn-left" class="p-2 rounded ${style.align === 'left' ? 'bg-white shadow' : ''}" title="Align Left"><i data-lucide="align-left" class="w-4 h-4"></i></button>
        <button id="btn-center" class="p-2 rounded ${style.align === 'center' ? 'bg-white shadow' : ''}" title="Align Center"><i data-lucide="align-center" class="w-4 h-4"></i></button>
        <button id="btn-right" class="p-2 rounded ${style.align === 'right' ? 'bg-white shadow' : ''}" title="Align Right"><i data-lucide="align-right" class="w-4 h-4"></i></button>
      </div>
    </div>
    <div>
      <h3 class="text-sm font-semibold text-gray-700 mb-3">Polygon Sides</h3>
      <input type="number" min="3" max="12" value="${style.sides || 5}" id="poly-sides" class="border rounded px-2 py-1 w-full text-sm" />
    </div>
    <div>
      <h3 class="text-sm font-semibold text-gray-700 mb-3">Comment</h3>
      <textarea id="comment-input" class="w-full border rounded p-2 text-sm" rows="3" placeholder="Add a comment..." ${!selectedEl ? 'disabled' : ''}>${selectedEl?.comment || ''}</textarea>
    </div>
    <div class="w-full h-px bg-gray-200 my-2"></div>
    <div>
      <h3 class="text-sm font-semibold text-gray-700 mb-3">Canvas Settings</h3>
      <div class="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label class="text-xs text-gray-500 block mb-1">Width</label>
          <input type="number" value="${state.canvasSettings.width}" id="canvas-w" class="border rounded px-2 py-1 w-full text-sm" />
        </div>
        <div>
          <label class="text-xs text-gray-500 block mb-1">Height</label>
          <input type="number" value="${state.canvasSettings.height}" id="canvas-h" class="border rounded px-2 py-1 w-full text-sm" />
        </div>
      </div>
      <div class="mb-3">
        <label class="text-xs text-gray-500 block mb-1">Background Color</label>
        <input type="color" value="${state.canvasSettings.backgroundColor}" id="canvas-bg" class="w-full h-8 cursor-pointer rounded" />
      </div>
      <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" ${state.canvasSettings.showGrid ? 'checked' : ''} id="canvas-grid" class="rounded text-blue-500" />
        Show Grid
      </label>
    </div>
  `;
  
  panel.innerHTML = html;
  lucide.createIcons();

  // Attach color buttons
  const fillContainer = document.getElementById('fill-colors');
  const strokeContainer = document.getElementById('stroke-colors');
  
  colors.forEach(c => {
    const btnF = document.createElement('button');
    btnF.className = `w-8 h-8 rounded-full border-2 ${style.fill === c ? 'border-blue-500' : 'border-transparent shadow-sm'}`;
    btnF.style.backgroundColor = c === 'transparent' ? '#f3f4f6' : c;
    if (c === 'transparent') btnF.innerHTML = '<span class="text-xs text-gray-400 block text-center">None</span>';
    btnF.onclick = () => handleStyleChange({ fill: c });
    fillContainer.appendChild(btnF);

    const btnS = document.createElement('button');
    btnS.className = `w-8 h-8 rounded-full border-2 ${style.stroke === c ? 'border-blue-500' : 'border-transparent shadow-sm'}`;
    btnS.style.backgroundColor = c === 'transparent' ? '#f3f4f6' : c;
    if (c === 'transparent') btnS.innerHTML = '<span class="text-xs text-gray-400 block text-center">None</span>';
    btnS.onclick = () => handleStyleChange({ stroke: c });
    strokeContainer.appendChild(btnS);
  });

  // Attach other listeners
  document.getElementById('stroke-width').onchange = (e) => handleStyleChange({ strokeWidth: parseInt(e.target.value) });
  document.getElementById('font-size').onchange = (e) => handleStyleChange({ fontSize: parseInt(e.target.value) });
  document.getElementById('btn-bold').onclick = () => toggleFontStyle('bold');
  document.getElementById('btn-italic').onclick = () => toggleFontStyle('italic');
  document.getElementById('btn-underline').onclick = () => toggleTextDec('underline');
  document.getElementById('btn-strike').onclick = () => toggleTextDec('line-through');
  document.getElementById('btn-super').onclick = () => toggleFontStyle('super');
  document.getElementById('btn-sub').onclick = () => toggleFontStyle('sub');
  document.getElementById('btn-high').onclick = () => handleStyleChange({ fill: style.fill === '#fbbf24' ? 'transparent' : '#fbbf24' });
  document.getElementById('btn-left').onclick = () => handleStyleChange({ align: 'left' });
  document.getElementById('btn-center').onclick = () => handleStyleChange({ align: 'center' });
  document.getElementById('btn-right').onclick = () => handleStyleChange({ align: 'right' });
  document.getElementById('poly-sides').onchange = (e) => handleStyleChange({ sides: parseInt(e.target.value) });
  
  document.getElementById('comment-input').onchange = (e) => {
    if (selectedEl) updateElement(selectedEl.id, { comment: e.target.value });
  };

  document.getElementById('canvas-w').onchange = (e) => {
    state.canvasSettings.width = parseInt(e.target.value);
    stage.width(state.canvasSettings.width);
    document.getElementById('canvas-container').style.width = state.canvasSettings.width + 'px';
    drawGrid();
    saveState();
  };
  document.getElementById('canvas-h').onchange = (e) => {
    state.canvasSettings.height = parseInt(e.target.value);
    stage.height(state.canvasSettings.height);
    document.getElementById('canvas-container').style.height = state.canvasSettings.height + 'px';
    drawGrid();
    saveState();
  };
  document.getElementById('canvas-bg').onchange = (e) => {
    state.canvasSettings.backgroundColor = e.target.value;
    document.getElementById('canvas-container').style.backgroundColor = e.target.value;
    saveState();
  };
  document.getElementById('canvas-grid').onchange = (e) => {
    state.canvasSettings.showGrid = e.target.checked;
    drawGrid();
    saveState();
  };
}

// Init
document.getElementById('canvas-container').style.width = state.canvasSettings.width + 'px';
document.getElementById('canvas-container').style.height = state.canvasSettings.height + 'px';
document.getElementById('canvas-container').style.backgroundColor = state.canvasSettings.backgroundColor;

drawGrid();
renderElements();

// Handle window resize to reposition text editor if needed
window.addEventListener('resize', () => {
  if (editingId) {
    const el = state.elements.find(e => e.id === editingId);
    const node = konvaNodes[editingId];
    if (el && node) openTextEditor(el, node);
  }
});
