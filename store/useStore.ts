import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export type ToolType = 'select' | 'rectangle' | 'circle' | 'dot' | 'polygon' | 'line' | 'pencil' | 'text';

export interface ElementStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string; // 'normal', 'bold', 'italic', 'italic bold'
  textDecoration?: string; // 'underline', 'line-through', ''
  align?: 'left' | 'center' | 'right';
  sides?: number; // for polygon
}

export interface CanvasElement {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: number[]; // for line and pencil
  text?: string;
  style: ElementStyle;
  comment?: string;
}

export interface AppState {
  elements: CanvasElement[];
  selectedIds: string[];
  tool: ToolType;
  currentStyle: ElementStyle;
  canvasSettings: {
    width: number;
    height: number;
    backgroundColor: string;
    showGrid: boolean;
    gridSize: number;
  };
  magnetic: boolean;
  
  // Actions
  setTool: (tool: ToolType) => void;
  setCurrentStyle: (style: Partial<ElementStyle>) => void;
  setCanvasSettings: (settings: Partial<AppState['canvasSettings']>) => void;
  setMagnetic: (magnetic: boolean) => void;
  
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElements: (ids: string[]) => void;
  setSelectedIds: (ids: string[]) => void;
  setComment: (id: string, comment: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
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

      setTool: (tool) => set({ tool, selectedIds: [] }),
      setCurrentStyle: (style) => set((state) => ({ currentStyle: { ...state.currentStyle, ...style } })),
      setCanvasSettings: (settings) => set((state) => ({ canvasSettings: { ...state.canvasSettings, ...settings } })),
      setMagnetic: (magnetic) => set({ magnetic }),

      addElement: (element) => set((state) => ({ elements: [...state.elements, element] })),
      updateElement: (id, updates) => set((state) => ({
        elements: state.elements.map((el) => el.id === id ? { ...el, ...updates } : el)
      })),
      deleteElements: (ids) => set((state) => ({
        elements: state.elements.filter((el) => !ids.includes(el.id)),
        selectedIds: state.selectedIds.filter((id) => !ids.includes(id))
      })),
      setSelectedIds: (ids) => set({ selectedIds: ids }),
      setComment: (id, comment) => set((state) => ({
        elements: state.elements.map((el) => el.id === id ? { ...el, comment } : el)
      })),
    }),
    {
      name: 'mindmap-storage',
      partialize: (state) => ({ elements: state.elements, canvasSettings: state.canvasSettings }),
    }
  )
);
