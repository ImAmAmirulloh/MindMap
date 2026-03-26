'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  Highlighter,
  Superscript,
  Subscript
} from 'lucide-react';

const colors = [
  'transparent', '#ffffff', '#000000', '#f87171', '#fb923c', '#fbbf24', 
  '#4ade80', '#2dd4bf', '#60a5fa', '#818cf8', '#c084fc', '#f472b6'
];

const PropertiesPanel = () => {
  const { 
    currentStyle, 
    setCurrentStyle, 
    canvasSettings, 
    setCanvasSettings,
    selectedIds,
    elements,
    updateElement
  } = useStore();

  const selectedElement = selectedIds.length === 1 
    ? elements.find(e => e.id === selectedIds[0]) 
    : null;

  const style = selectedElement ? selectedElement.style : currentStyle;

  const handleStyleChange = (updates: Partial<typeof currentStyle>) => {
    if (selectedElement) {
      updateElement(selectedElement.id, { style: { ...selectedElement.style, ...updates } });
    } else {
      setCurrentStyle(updates);
    }
  };

  const toggleFontStyle = (styleName: string) => {
    const current = style.fontStyle || '';
    const isSet = current.includes(styleName);
    let newStyle = current;
    if (isSet) {
      newStyle = current.replace(styleName, '').trim();
    } else {
      newStyle = `${current} ${styleName}`.trim();
    }
    handleStyleChange({ fontStyle: newStyle });
  };

  const toggleTextDecoration = (decName: string) => {
    const current = style.textDecoration || '';
    const isSet = current.includes(decName);
    let newDec = current;
    if (isSet) {
      newDec = current.replace(decName, '').trim();
    } else {
      newDec = `${current} ${decName}`.trim();
    }
    handleStyleChange({ textDecoration: newDec });
  };

  return (
    <div className="w-72 bg-white border-l border-gray-200 p-4 overflow-y-auto shadow-sm z-10 flex flex-col gap-6">
      
      {/* Colors */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Fill Color</h3>
        <div className="grid grid-cols-6 gap-2">
          {colors.map(c => (
            <button
              key={`fill-${c}`}
              onClick={() => handleStyleChange({ fill: c })}
              className={`w-8 h-8 rounded-full border-2 ${style.fill === c ? 'border-blue-500' : 'border-transparent shadow-sm'}`}
              style={{ backgroundColor: c === 'transparent' ? '#f3f4f6' : c }}
              title={c}
            >
              {c === 'transparent' && <span className="text-xs text-gray-400 block text-center">None</span>}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Stroke Color</h3>
        <div className="grid grid-cols-6 gap-2">
          {colors.map(c => (
            <button
              key={`stroke-${c}`}
              onClick={() => handleStyleChange({ stroke: c })}
              className={`w-8 h-8 rounded-full border-2 ${style.stroke === c ? 'border-blue-500' : 'border-transparent shadow-sm'}`}
              style={{ backgroundColor: c === 'transparent' ? '#f3f4f6' : c }}
              title={c}
            >
              {c === 'transparent' && <span className="text-xs text-gray-400 block text-center">None</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Stroke Width */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Stroke Width</h3>
        <input 
          type="range" 
          min="0" max="20" 
          value={style.strokeWidth || 0}
          onChange={(e) => handleStyleChange({ strokeWidth: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="text-xs text-gray-500 mt-1 text-right">{style.strokeWidth}px</div>
      </div>

      {/* Text Styles */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Text Style</h3>
        
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-gray-500 w-12">Size:</span>
          <input 
            type="number" 
            value={style.fontSize || 16}
            onChange={(e) => handleStyleChange({ fontSize: parseInt(e.target.value) })}
            className="border rounded px-2 py-1 w-20 text-sm"
          />
        </div>

        <div className="flex gap-1 mb-3 bg-gray-100 p-1 rounded-lg flex-wrap">
          <button onClick={() => toggleFontStyle('bold')} className={`p-2 rounded ${style.fontStyle?.includes('bold') ? 'bg-white shadow' : ''}`} title="Bold"><Bold size={16} /></button>
          <button onClick={() => toggleFontStyle('italic')} className={`p-2 rounded ${style.fontStyle?.includes('italic') ? 'bg-white shadow' : ''}`} title="Italic"><Italic size={16} /></button>
          <button onClick={() => toggleTextDecoration('underline')} className={`p-2 rounded ${style.textDecoration?.includes('underline') ? 'bg-white shadow' : ''}`} title="Underline"><Underline size={16} /></button>
          <button onClick={() => toggleTextDecoration('line-through')} className={`p-2 rounded ${style.textDecoration?.includes('line-through') ? 'bg-white shadow' : ''}`} title="Strikethrough"><Strikethrough size={16} /></button>
          <button onClick={() => handleStyleChange({ fontStyle: style.fontStyle?.includes('super') ? style.fontStyle.replace('super', '').trim() : `${style.fontStyle || ''} super`.trim() })} className={`p-2 rounded ${style.fontStyle?.includes('super') ? 'bg-white shadow' : ''}`} title="Superscript"><Superscript size={16} /></button>
          <button onClick={() => handleStyleChange({ fontStyle: style.fontStyle?.includes('sub') ? style.fontStyle.replace('sub', '').trim() : `${style.fontStyle || ''} sub`.trim() })} className={`p-2 rounded ${style.fontStyle?.includes('sub') ? 'bg-white shadow' : ''}`} title="Subscript"><Subscript size={16} /></button>
          <button onClick={() => handleStyleChange({ fill: style.fill === '#fbbf24' ? 'transparent' : '#fbbf24' })} className={`p-2 rounded ${style.fill === '#fbbf24' ? 'bg-white shadow' : ''}`} title="Mark/Highlight"><Highlighter size={16} /></button>
          <button onClick={() => handleStyleChange({ align: 'left' })} className={`p-2 rounded ${style.align === 'left' ? 'bg-white shadow' : ''}`} title="Align Left"><AlignLeft size={16} /></button>
          <button onClick={() => handleStyleChange({ align: 'center' })} className={`p-2 rounded ${style.align === 'center' ? 'bg-white shadow' : ''}`} title="Align Center"><AlignCenter size={16} /></button>
          <button onClick={() => handleStyleChange({ align: 'right' })} className={`p-2 rounded ${style.align === 'right' ? 'bg-white shadow' : ''}`} title="Align Right"><AlignRight size={16} /></button>
        </div>
      </div>

      {/* Polygon Sides */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Polygon Sides</h3>
        <input 
          type="number" 
          min="3" max="12"
          value={style.sides || 5}
          onChange={(e) => handleStyleChange({ sides: parseInt(e.target.value) })}
          className="border rounded px-2 py-1 w-full text-sm"
        />
      </div>

      {/* Comment */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Comment</h3>
        <textarea
          className="w-full border rounded p-2 text-sm"
          rows={3}
          placeholder="Add a comment..."
          value={selectedElement?.comment || ''}
          onChange={(e) => {
            if (selectedElement) {
              updateElement(selectedElement.id, { comment: e.target.value });
            }
          }}
          disabled={!selectedElement}
        />
      </div>

      <div className="w-full h-px bg-gray-200 my-2" />

      {/* Canvas Settings */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Canvas Settings</h3>
        
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Width</label>
            <input 
              type="number" 
              value={canvasSettings.width}
              onChange={(e) => setCanvasSettings({ width: parseInt(e.target.value) })}
              className="border rounded px-2 py-1 w-full text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Height</label>
            <input 
              type="number" 
              value={canvasSettings.height}
              onChange={(e) => setCanvasSettings({ height: parseInt(e.target.value) })}
              className="border rounded px-2 py-1 w-full text-sm"
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="text-xs text-gray-500 block mb-1">Background Color</label>
          <input 
            type="color" 
            value={canvasSettings.backgroundColor}
            onChange={(e) => setCanvasSettings({ backgroundColor: e.target.value })}
            className="w-full h-8 cursor-pointer rounded"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input 
            type="checkbox" 
            checked={canvasSettings.showGrid}
            onChange={(e) => setCanvasSettings({ showGrid: e.target.checked })}
            className="rounded text-blue-500"
          />
          Show Grid
        </label>
      </div>

    </div>
  );
};

export default PropertiesPanel;
