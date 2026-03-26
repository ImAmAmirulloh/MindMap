'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, RegularPolygon, Line, Text, Transformer, Group } from 'react-konva';
import { Html } from 'react-konva-utils';
import { useStore, CanvasElement, ToolType } from '@/store/useStore';
import { v4 as uuidv4 } from 'uuid';
import Konva from 'konva';

const CanvasArea = () => {
  const {
    elements,
    selectedIds,
    tool,
    currentStyle,
    canvasSettings,
    magnetic,
    addElement,
    updateElement,
    setSelectedIds,
    deleteElements,
    setComment,
  } = useStore();

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const layerRef = useRef<Konva.Layer>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [newElement, setNewElement] = useState<CanvasElement | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textValue, setTextValue] = useState('');

  // Handle snapping
  const snapToGrid = (val: number) => {
    if (!magnetic) return val;
    const size = canvasSettings.gridSize;
    return Math.round(val / size) * size;
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (tool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setSelectedIds([]);
        setEditingTextId(null);
      }
      return;
    }

    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    let x = snapToGrid(pos.x);
    let y = snapToGrid(pos.y);

    setIsDrawing(true);
    const id = uuidv4();

    const baseElement: CanvasElement = {
      id,
      type: tool,
      x,
      y,
      style: { ...currentStyle },
    };

    if (tool === 'rectangle') {
      setNewElement({ ...baseElement, width: 0, height: 0 });
    } else if (tool === 'circle' || tool === 'dot' || tool === 'polygon') {
      setNewElement({ ...baseElement, width: 0, height: 0 });
    } else if (tool === 'line' || tool === 'pencil') {
      setNewElement({ ...baseElement, points: [x, y] });
    } else if (tool === 'text') {
      const newText: CanvasElement = {
        ...baseElement,
        text: 'Double click to edit',
        width: 150,
        height: 50,
      };
      addElement(newText);
      setSelectedIds([id]);
      setIsDrawing(false);
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDrawing || !newElement) return;

    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    let x = pos.x;
    let y = pos.y;

    if (magnetic && tool !== 'pencil') {
      x = snapToGrid(x);
      y = snapToGrid(y);
    }

    if (tool === 'rectangle') {
      setNewElement({
        ...newElement,
        width: x - newElement.x,
        height: y - newElement.y,
      });
    } else if (tool === 'circle' || tool === 'dot' || tool === 'polygon') {
      const radius = Math.sqrt(Math.pow(x - newElement.x, 2) + Math.pow(y - newElement.y, 2));
      setNewElement({
        ...newElement,
        width: radius * 2,
        height: radius * 2,
      });
    } else if (tool === 'line') {
      setNewElement({
        ...newElement,
        points: [newElement.points![0], newElement.points![1], x, y],
      });
    } else if (tool === 'pencil') {
      setNewElement({
        ...newElement,
        points: [...newElement.points!, x, y],
      });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !newElement) return;

    setIsDrawing(false);
    
    // Don't add if it's too small
    if (tool === 'rectangle' && Math.abs(newElement.width || 0) < 5 && Math.abs(newElement.height || 0) < 5) {
      setNewElement(null);
      return;
    }
    
    addElement(newElement);
    setSelectedIds([newElement.id]);
    setNewElement(null);
  };

  // Transformer update
  useEffect(() => {
    if (transformerRef.current && layerRef.current) {
      const nodes = selectedIds.map((id) => layerRef.current?.findOne(`#${id}`)).filter(Boolean) as Konva.Node[];
      transformerRef.current.nodes(nodes);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedIds, elements]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0 && !editingTextId) {
          deleteElements(selectedIds);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, editingTextId, deleteElements]);

  const handleElementClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>, id: string) => {
    if (tool !== 'select') return;
    e.cancelBubble = true;
    
    const metaPressed = e.evt && (e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey);
    const isSelected = selectedIds.includes(id);

    if (!metaPressed && !isSelected) {
      setSelectedIds([id]);
    } else if (metaPressed && isSelected) {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
    } else if (metaPressed && !isSelected) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>, id: string) => {
    let x = e.target.x();
    let y = e.target.y();
    
    if (magnetic) {
      x = snapToGrid(x);
      y = snapToGrid(y);
      e.target.position({ x, y });
    }
    
    updateElement(id, { x, y });
  };

  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>, id: string) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    const el = elements.find(el => el.id === id);
    if (!el) return;

    if (el.type === 'rectangle' || el.type === 'text') {
      updateElement(id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(5, (el.width || 0) * scaleX),
        height: Math.max(5, (el.height || 0) * scaleY),
      });
    } else if (el.type === 'circle' || el.type === 'dot' || el.type === 'polygon') {
      updateElement(id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(5, (el.width || 0) * scaleX),
        height: Math.max(5, (el.height || 0) * scaleY),
      });
    }
  };

  const [hoverPos, setHoverPos] = useState<{ x: number, y: number } | null>(null);

  const handleMouseEnter = (e: Konva.KonvaEventObject<MouseEvent>, id: string) => {
    if (hoverTimer) clearTimeout(hoverTimer);
    const timer = setTimeout(() => {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        setHoverPos(pos);
        setHoveredId(id);
      }
    }, 3000);
    setHoverTimer(timer);
  };

  const handleMouseLeave = () => {
    if (hoverTimer) clearTimeout(hoverTimer);
    setHoveredId(null);
    setHoverPos(null);
  };

  const handleTextDblClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>, el: CanvasElement) => {
    if (tool !== 'select') return;
    setEditingTextId(el.id);
    setTextValue(el.text || '');
  };

  const renderElement = (el: CanvasElement) => {
    const commonProps = {
      id: el.id,
      x: el.x,
      y: el.y,
      draggable: tool === 'select',
      onClick: (e: any) => handleElementClick(e, el.id),
      onTap: (e: any) => handleElementClick(e, el.id),
      onDragEnd: (e: any) => handleDragEnd(e, el.id),
      onTransformEnd: (e: any) => handleTransformEnd(e, el.id),
      onMouseEnter: (e: any) => handleMouseEnter(e, el.id),
      onMouseLeave: handleMouseLeave,
      fill: el.style.fill,
      stroke: el.style.stroke,
      strokeWidth: el.style.strokeWidth || 2,
    };

    switch (el.type) {
      case 'rectangle':
        return (
          <Rect
            key={el.id}
            {...commonProps}
            width={el.width}
            height={el.height}
          />
        );
      case 'circle':
        return (
          <Circle
            key={el.id}
            {...commonProps}
            radius={(el.width || 0) / 2}
          />
        );
      case 'dot':
        const isEditingDot = editingTextId === el.id;
        return (
          <Group key={el.id} {...commonProps} fill={undefined} stroke={undefined} onDblClick={(e) => handleTextDblClick(e, el)} onDblTap={(e) => handleTextDblClick(e, el)}>
            <Circle
              radius={5}
              fill={el.style.fill}
              stroke={el.style.stroke}
              strokeWidth={el.style.strokeWidth}
            />
            {isEditingDot ? (
              <Html groupProps={{ x: 15, y: -8 }}>
                <input
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  onBlur={() => {
                    updateElement(el.id, { text: textValue });
                    setEditingTextId(null);
                  }}
                  autoFocus
                  style={{
                    fontSize: `${el.style.fontSize}px`,
                    fontFamily: el.style.fontFamily,
                    color: el.style.stroke,
                    border: '1px solid #ccc',
                    outline: 'none',
                    background: 'white',
                  }}
                />
              </Html>
            ) : (
              <Text
                x={15}
                y={-8}
                text={el.text || 'List item'}
                fontSize={el.style.fontSize}
                fontFamily={el.style.fontFamily}
                fill={el.style.stroke}
                fontStyle={el.style.fontStyle}
                textDecoration={el.style.textDecoration}
                align={el.style.align}
              />
            )}
          </Group>
        );
      case 'polygon':
        return (
          <RegularPolygon
            key={el.id}
            {...commonProps}
            sides={el.style.sides || 5}
            radius={(el.width || 0) / 2}
          />
        );
      case 'line':
      case 'pencil':
        return (
          <Line
            key={el.id}
            {...commonProps}
            points={el.points || []}
            tension={el.type === 'pencil' ? 0.5 : 0}
            lineCap="round"
            lineJoin="round"
            fill={undefined} // Lines shouldn't have fill
          />
        );
      case 'text':
        const isEditing = editingTextId === el.id;
        const textStyle: React.CSSProperties = {
          width: Math.max(100, el.width || 100),
          height: Math.max(50, el.height || 50),
          fontFamily: el.style.fontFamily,
          color: el.style.stroke,
          backgroundColor: el.style.fill === 'transparent' ? 'transparent' : el.style.fill,
          fontWeight: el.style.fontStyle?.includes('bold') ? 'bold' : 'normal',
          fontStyle: el.style.fontStyle?.includes('italic') ? 'italic' : 'normal',
          verticalAlign: el.style.fontStyle?.includes('super') ? 'super' : el.style.fontStyle?.includes('sub') ? 'sub' : 'baseline',
          fontSize: el.style.fontStyle?.includes('super') || el.style.fontStyle?.includes('sub') ? `${(el.style.fontSize || 16) * 0.75}px` : `${el.style.fontSize}px`,
          textDecoration: el.style.textDecoration,
          textAlign: el.style.align as any,
          padding: '4px',
          boxSizing: 'border-box',
        };

        return (
          <Group key={el.id} {...commonProps} fill={undefined} stroke={undefined} onDblClick={(e) => handleTextDblClick(e, el)} onDblTap={(e) => handleTextDblClick(e, el)}>
            <Rect
              width={el.width}
              height={el.height}
              fill="transparent"
            />
            <Html groupProps={{ x: 0, y: 0 }} divProps={{ style: { pointerEvents: isEditing ? 'auto' : 'none' } }}>
              {isEditing ? (
                <textarea
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  onBlur={() => {
                    updateElement(el.id, { text: textValue });
                    setEditingTextId(null);
                  }}
                  autoFocus
                  style={{
                    ...textStyle,
                    border: '1px solid #ccc',
                    outline: 'none',
                    resize: 'both',
                    pointerEvents: 'auto',
                  }}
                />
              ) : (
                <div style={{ ...textStyle, overflow: 'hidden', whiteSpace: 'pre-wrap' }}>
                  {el.text}
                </div>
              )}
            </Html>
          </Group>
        );
      default:
        return null;
    }
  };

  // Draw Grid
  const drawGrid = () => {
    if (!canvasSettings.showGrid) return null;
    const lines = [];
    const size = canvasSettings.gridSize;
    const width = canvasSettings.width;
    const height = canvasSettings.height;

    for (let i = 0; i < width / size; i++) {
      lines.push(
        <Line
          key={`v-${i}`}
          points={[Math.round(i * size) + 0.5, 0, Math.round(i * size) + 0.5, height]}
          stroke="#ddd"
          strokeWidth={1}
        />
      );
    }
    for (let j = 0; j < height / size; j++) {
      lines.push(
        <Line
          key={`h-${j}`}
          points={[0, Math.round(j * size) + 0.5, width, Math.round(j * size) + 0.5]}
          stroke="#ddd"
          strokeWidth={1}
        />
      );
    }
    return lines;
  };

  return (
    <div className="relative w-full h-full overflow-auto bg-gray-100 flex items-center justify-center p-8">
      <div 
        className="shadow-lg bg-white relative"
        style={{ 
          width: canvasSettings.width, 
          height: canvasSettings.height,
          backgroundColor: canvasSettings.backgroundColor 
        }}
      >
        <Stage
          width={canvasSettings.width}
          height={canvasSettings.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          ref={stageRef}
        >
          <Layer>
            {drawGrid()}
          </Layer>
          <Layer ref={layerRef}>
            {elements.map(renderElement)}
            {newElement && renderElement(newElement)}
            <Transformer ref={transformerRef} boundBoxFunc={(oldBox, newBox) => {
              // limit resize
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox;
              }
              return newBox;
            }} />
          </Layer>
        </Stage>

        {/* Comment Popup */}
        {hoveredId && hoverPos && elements.find(e => e.id === hoveredId)?.comment && (
          <div 
            className="absolute bg-yellow-100 p-3 rounded shadow-xl border border-yellow-300 z-50 max-w-xs pointer-events-none"
            style={{ left: hoverPos.x + 15, top: hoverPos.y + 15 }}
          >
            <p className="text-sm text-gray-800 whitespace-pre-wrap">
              {elements.find(e => e.id === hoveredId)?.comment}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CanvasArea;
