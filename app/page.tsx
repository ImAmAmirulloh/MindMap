'use client';

import dynamic from 'next/dynamic';
import Toolbar from '@/components/Toolbar';
import PropertiesPanel from '@/components/PropertiesPanel';

// Dynamically import CanvasArea with ssr: false because Konva requires window
const CanvasArea = dynamic(() => import('@/components/CanvasArea'), { ssr: false });

export default function Home() {
  return (
    <main className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-gray-50 text-gray-900 font-sans">
      <Toolbar />
      <div className="flex-1 relative min-h-0">
        <CanvasArea />
      </div>
      <PropertiesPanel />
    </main>
  );
}
