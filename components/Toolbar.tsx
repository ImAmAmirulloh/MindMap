'use client';

import React from 'react';
import { useStore, ToolType } from '@/store/useStore';
import { 
  MousePointer2, 
  Square, 
  Circle, 
  Hexagon, 
  Minus, 
  Pencil, 
  Type, 
  List,
  Magnet,
  Trash2
} from 'lucide-react';

const tools: { id: ToolType; icon: React.ReactNode; label: string }[] = [
  { id: 'select', icon: <MousePointer2 size={20} />, label: 'Select' },
  { id: 'rectangle', icon: <Square size={20} />, label: 'Rectangle' },
  { id: 'circle', icon: <Circle size={20} />, label: 'Circle' },
  { id: 'dot', icon: <List size={20} />, label: 'Dot List' },
  { id: 'polygon', icon: <Hexagon size={20} />, label: 'Polygon' },
  { id: 'line', icon: <Minus size={20} />, label: 'Line' },
  { id: 'pencil', icon: <Pencil size={20} />, label: 'Pencil' },
  { id: 'text', icon: <Type size={20} />, label: 'Text' },
];

const Toolbar = () => {
  const { tool, setTool, magnetic, setMagnetic, selectedIds, deleteElements } = useStore();

  return (
    <div className="flex flex-row md:flex-col gap-2 bg-white border-b md:border-b-0 md:border-r border-gray-200 p-2 w-full md:w-16 items-center shadow-sm z-10 overflow-x-auto shrink-0">
      {tools.map((t) => (
        <button
          key={t.id}
          onClick={() => setTool(t.id)}
          className={`p-3 rounded-xl transition-colors shrink-0 ${
            tool === t.id ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
          }`}
          title={t.label}
        >
          {t.icon}
        </button>
      ))}
      
      <div className="w-px h-8 md:w-full md:h-px bg-gray-200 my-0 md:my-2 shrink-0" />
      
      <button
        onClick={() => setMagnetic(!magnetic)}
        className={`p-3 rounded-xl transition-colors shrink-0 ${
          magnetic ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100 text-gray-600'
        }`}
        title="Magnetic Grid Snap"
      >
        <Magnet size={20} />
      </button>

      <div className="w-px h-8 md:w-full md:h-px bg-gray-200 my-0 md:my-2 shrink-0" />

      <button
        onClick={() => {
          if (selectedIds.length > 0) {
            deleteElements(selectedIds);
          }
        }}
        disabled={selectedIds.length === 0}
        className={`p-3 rounded-xl transition-colors shrink-0 ${
          selectedIds.length > 0 ? 'hover:bg-red-100 text-red-600' : 'text-gray-300 cursor-not-allowed'
        }`}
        title="Delete Selected"
      >
        <Trash2 size={20} />
      </button>
    </div>
  );
};

export default Toolbar;
