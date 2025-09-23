import React, { useMemo, useRef, useState, useEffect } from 'react';
import Button from './Button';
import type { ButtonConfig } from '../types';

interface KeypadProps {
    onButtonClick: (value: string) => void;
    isDegrees: boolean;
    is2nd: boolean;
    isScientific: boolean;
    isListening: boolean;
    isMicCooldown: boolean;
    isLayoutEditable: boolean;
    basicButtonOrder: string[];
    onBasicLayoutChange: (order: string[]) => void;
    scientificButtonOrder: string[];
    onScientificLayoutChange: (order: string[]) => void;
    canUndo: boolean;
    canRedo: boolean;
}

const BackspaceIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 002.828 0L21 12M3 12l6.414-6.414a2 2 0 012.828 0L21 12" />
    </svg>
);

const MicIcon = ({ isListening }: { isListening: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 inline-block transition-transform duration-200 ${isListening ? 'animate-pulse-icon' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
);

const UndoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l4-4m-4 4l4 4" />
    </svg>
);

const RedoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a8 8 0 00-8 8v2m18-10l-4-4m4 4l-4 4" />
    </svg>
);

export const getScientificButtons = (is2nd: boolean, isDegrees: boolean): ButtonConfig[] => [
    { label: '2nd', value: '2nd', variant: 'default', active: is2nd },
    { label: 'deg', value: 'Deg', variant: 'default', active: isDegrees },
    { label: is2nd ? <span>sin<sup>-1</sup></span> : 'sin', value: 'sin', variant: 'default' },
    { label: is2nd ? <span>cos<sup>-1</sup></span> : 'cos', value: 'cos', variant: 'default' },
    { label: is2nd ? <span>tan<sup>-1</sup></span> : 'tan', value: 'tan', variant: 'default' },
    { label: <span>x<sup>y</sup></span>, value: 'x^y', variant: 'advanced' },
    { label: is2nd ? <span>10<sup>x</sup></span> : 'lg', value: 'lg', variant: 'default' },
    { label: is2nd ? <span>e<sup>x</sup></span> : 'ln', value: 'ln', variant: 'default' },
    { label: '(', value: '(', variant: 'default' },
    { label: ')', value: ')', variant: 'default' },
];

export const getBasicButtons = (is2nd: boolean, isListening: boolean, canUndo: boolean, canRedo: boolean, isMicCooldown: boolean): ButtonConfig[] => [
    // Row 1
    { label: 'AC', value: 'AC', variant: 'special1' },
    { label: <BackspaceIcon />, value: 'DEL', variant: 'special1' },
    { label: '%', value: '%', variant: 'operator' },
    { label: '÷', value: '÷', variant: 'operator' },
    { label: <MicIcon isListening={isListening} />, value: 'MIC', variant: 'default', active: isListening, disabled: isMicCooldown },
    // Row 2
    { label: '7', value: '7', variant: 'number' },
    { label: '8', value: '8', variant: 'number' },
    { label: '9', value: '9', variant: 'number' },
    { label: '×', value: '×', variant: 'operator' },
    { label: is2nd ? <span>x<sup>2</sup></span> : '√', value: '√', variant: 'default' },
    // Row 3
    { label: '4', value: '4', variant: 'number' },
    { label: '5', value: '5', variant: 'number' },
    { label: '6', value: '6', variant: 'number' },
    { label: '-', value: '-', variant: 'operator' },
    { label: 'π', value: 'π', variant: 'default' },
    // Row 4
    { label: '1', value: '1', variant: 'number' },
    { label: '2', value: '2', variant: 'number' },
    { label: '3', value: '3', variant: 'number' },
    { label: '+', value: '+', variant: 'operator' },
    { label: 'RND', value: 'RND', variant: 'default' },
    // Row 5
    { label: <UndoIcon />, value: 'UNDO', variant: 'default', disabled: !canUndo },
    { label: <RedoIcon />, value: 'REDO', variant: 'default', disabled: !canRedo },
    { label: '0', value: '0', variant: 'number' },
    { label: '.', value: '.', variant: 'number' },
    { label: '=', value: '=', variant: 'special2' },
];

const Keypad: React.FC<KeypadProps> = (props) => {
    const { 
        onButtonClick, isDegrees, is2nd, isScientific, isListening, 
        isMicCooldown,
        isLayoutEditable, basicButtonOrder, onBasicLayoutChange,
        scientificButtonOrder, onScientificLayoutChange, canUndo, canRedo
    } = props;

    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    
    const isTouchDragging = useRef(false);
    const activeLayoutRef = useRef<{ layout: string[], onChange: (order: string[]) => void } | null>(null);

    const handleDrop = () => {
        if (activeLayoutRef.current && dragItem.current !== null && dragOverItem.current !== null) {
            const { layout, onChange } = activeLayoutRef.current;
            if (dragItem.current !== dragOverItem.current) {
                const newLayout = [...layout];
                const dragItemContent = newLayout[dragItem.current];
                newLayout.splice(dragItem.current, 1);
                newLayout.splice(dragOverItem.current, 0, dragItemContent);
                onChange(newLayout);
            }
        }
        dragItem.current = null;
        dragOverItem.current = null;
        setDraggedIndex(null);
        setDragOverIndex(null);
        activeLayoutRef.current = null;
    };

    // --- Touch Handlers ---
    const handleTouchMove = (e: TouchEvent) => {
        if (!isTouchDragging.current) return;
        if (e.cancelable) e.preventDefault();

        const touch = e.touches[0];
        const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
        
        const button = targetElement?.closest<HTMLButtonElement>('[data-keypad-btn-index]');
        if (button?.dataset.keypadBtnIndex) {
            const index = parseInt(button.dataset.keypadBtnIndex, 10);
            if (!isNaN(index) && dragOverItem.current !== index) {
                dragOverItem.current = index;
                setDragOverIndex(index);
            }
        }
    };

    const handleTouchEnd = () => {
        if (!isTouchDragging.current) return;
        isTouchDragging.current = false;
        
        handleDrop();
        
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
        window.removeEventListener('touchcancel', handleTouchEnd);
    };
    
    const handleTouchStart = (index: number, layout: string[], onChange: (order: string[]) => void) => {
        if (!isLayoutEditable) return;
        
        dragItem.current = index;
        dragOverItem.current = index;
        setDraggedIndex(index);
        setDragOverIndex(index);

        isTouchDragging.current = true;
        activeLayoutRef.current = { layout, onChange };
        
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('touchcancel', handleTouchEnd);
    };
    
    useEffect(() => {
        return () => {
            if (isTouchDragging.current) {
                window.removeEventListener('touchmove', handleTouchMove);
                window.removeEventListener('touchend', handleTouchEnd);
                window.removeEventListener('touchcancel', handleTouchEnd);
            }
        };
    }, []);


    const allScientificButtons = useMemo(() => getScientificButtons(is2nd, isDegrees), [is2nd, isDegrees]);
    const scientificButtons = useMemo(() => {
        const buttonMap = new Map(allScientificButtons.map(b => [b.value, b]));
        return scientificButtonOrder.map(value => buttonMap.get(value)!).filter(Boolean);
    }, [scientificButtonOrder, allScientificButtons]);

    const allBasicButtons = useMemo(() => getBasicButtons(is2nd, isListening, canUndo, canRedo, isMicCooldown), [is2nd, isListening, canUndo, canRedo, isMicCooldown]);
    const basicButtons = useMemo(() => {
        const buttonMap = new Map(allBasicButtons.map(b => [b.value, b]));
        return basicButtonOrder.map(value => buttonMap.get(value)!).filter(Boolean);
    }, [basicButtonOrder, allBasicButtons]);
    
    const renderButtons = (buttons: ButtonConfig[], onLayoutChange: (order: string[]) => void) => {
       return buttons.map((btn, index) => {
           const isDragging = draggedIndex === index && activeLayoutRef.current?.onChange === onLayoutChange;
           const isDragOver = dragOverIndex === index && activeLayoutRef.current?.onChange === onLayoutChange;
           const layout = buttons.map(b => b.value);
           return (
                <Button
                    key={btn.value}
                    label={btn.label}
                    onClick={() => onButtonClick(btn.value)}
                    variant={btn.variant}
                    className={`${isDragging ? 'dragging' : ''} ${isDragOver && !isDragging ? 'drag-over' : ''}`}
                    isActive={btn.active}
                    isDisabled={btn.disabled}
                    isDraggable={isLayoutEditable}
                    // Mouse D&D
                    onDragStart={() => {
                        dragItem.current = index;
                        dragOverItem.current = index;
                        setDraggedIndex(index);
                        activeLayoutRef.current = { layout, onChange: onLayoutChange };
                    }}
                    onDragEnter={() => {
                        if (draggedIndex !== null) {
                           dragOverItem.current = index;
                           setDragOverIndex(index);
                        }
                    }}
                    onDragEnd={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    // Touch D&D
                    onTouchStart={() => handleTouchStart(index, layout, onLayoutChange)}
                    data-keypad-btn-index={index}
                />
           );
        });
    };

    return (
        <>
            <style>{`
                @keyframes pulse-icon {
                    50% { transform: scale(1.2); }
                }
                .animate-pulse-icon {
                    animation: pulse-icon 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                .dragging {
                    opacity: 0.8 !important;
                    transform: scale(1.1) !important;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
                    z-index: 10;
                    cursor: grabbing !important;
                    animation: none !important; /* Override wobble */
                }
                .drag-over {
                    transform: scale(0.95);
                    opacity: 0.7;
                }
                [data-keypad-btn-index] {
                    touch-action: none; /* Prevents scrolling when starting a drag on a button */
                }
            `}</style>
            <div className={`grid grid-cols-5 gap-3 ${draggedIndex !== null ? 'cursor-grabbing' : ''}`}>
                <div className={`col-span-5 grid grid-cols-subgrid gap-3 transition-[grid-template-rows] duration-300 ease-in-out ${isScientific ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="col-span-5 overflow-hidden">
                        <div className="grid grid-cols-5 gap-3">
                            {renderButtons(scientificButtons, onScientificLayoutChange)}
                        </div>
                    </div>
                </div>
                {renderButtons(basicButtons, onBasicLayoutChange)}
            </div>
        </>
    );
};

export default Keypad;