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
  Magnet
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
  const { tool, setTool, magnetic, setMagnetic } = useStore();

  return (
    <div className="flex flex-col gap-2 bg-white border-r border-gray-200 p-2 w-16 items-center shadow-sm z-10">
      {tools.map((t) => (
        <button
          key={t.id}
          onClick={() => setTool(t.id)}
          className={`p-3 rounded-xl transition-colors ${
            tool === t.id ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
          }`}
          title={t.label}
        >
          {t.icon}
        </button>
      ))}
      
      <div className="w-full h-px bg-gray-200 my-2" />
      
      <button
        onClick={() => setMagnetic(!magnetic)}
        className={`p-3 rounded-xl transition-colors ${
          magnetic ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100 text-gray-600'
        }`}
        title="Magnetic Grid Snap"
      >
        <Magnet size={20} />
      </button>
    </div>
  );
};

export default Toolbar;
