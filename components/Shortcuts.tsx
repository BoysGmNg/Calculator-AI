import React, { useState } from 'react';
import { SHORTCUTS } from '../services/shortcutsService';
import type { Shortcut } from '../types';

interface ShortcutsProps {
    onShortcutResult: (result: number) => void;
}

const Shortcuts: React.FC<ShortcutsProps> = ({ onShortcutResult }) => {
    const [activeShortcut, setActiveShortcut] = useState<Shortcut | null>(null);
    const [inputValues, setInputValues] = useState<Record<string, string>>({});
    const [calculatedResult, setCalculatedResult] = useState<number | null>(null);

    const handleShortcutClick = (shortcut: Shortcut) => {
        const defaultValues = shortcut.inputs.reduce((acc, input) => {
            acc[input.name] = input.defaultValue || '';
            return acc;
        }, {} as Record<string, string>);
        setInputValues(defaultValues);
        setCalculatedResult(null);
        setActiveShortcut(shortcut);
    };

    const handleCloseModal = () => {
        setActiveShortcut(null);
    };

    const handleInputChange = (name: string, value: string) => {
        setInputValues(prev => ({ ...prev, [name]: value }));
        setCalculatedResult(null); // Reset result when inputs change
    };

    const handleCalculate = () => {
        if (!activeShortcut) return;
        const result = activeShortcut.calculate(inputValues);
        setCalculatedResult(result);
    };

    const handleUseResult = () => {
        if (calculatedResult === null) return;
        onShortcutResult(calculatedResult);
        handleCloseModal();
    };
    
    return (
        <div className="space-y-4 min-h-[492px]">
            {SHORTCUTS.map((shortcut) => (
                <button
                    key={shortcut.name}
                    onClick={() => handleShortcutClick(shortcut)}
                    className="w-full flex items-center gap-4 p-4 bg-[--color-buttonBackground] hover:bg-[--color-buttonBackgroundHover] rounded-xl transition-colors"
                >
                    <div className="w-10 h-10 flex items-center justify-center bg-[--color-displayBackground] rounded-lg text-[--color-accent]">
                        {shortcut.icon}
                    </div>
                    <div>
                        <p className="font-bold text-left text-[--color-textPrimary]">{shortcut.name}</p>
                        <p className="text-sm text-left text-[--color-textSecondary]">{shortcut.description}</p>
                    </div>
                </button>
            ))}

            {activeShortcut && (
                <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center" onClick={handleCloseModal}>
                    <div className="bg-[--color-displayBackground] w-full max-w-sm rounded-2xl p-6 flex flex-col shadow-2xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-4">
                           <div>
                             <h2 className="text-xl font-bold text-[--color-textPrimary]">{activeShortcut.name}</h2>
                             <p className="text-sm text-[--color-textSecondary]">{activeShortcut.description}</p>
                           </div>
                            <button onClick={handleCloseModal} className="p-1 text-[--color-textSecondary] hover:text-[--color-textPrimary]">&times;</button>
                        </div>
                        
                        <div className="space-y-3">
                            {activeShortcut.inputs.map(input => (
                                <div key={input.name}>
                                    <label className="text-sm font-medium text-[--color-textSecondary]">{input.label}</label>
                                    <input
                                        type={input.type}
                                        value={inputValues[input.name] || ''}
                                        onChange={(e) => handleInputChange(input.name, e.target.value)}
                                        className="w-full mt-1 p-3 bg-[--color-buttonBackground] rounded-lg text-[--color-textPrimary] text-lg focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
                                        placeholder={input.type === 'text' ? 'e.g., 1, 2, 3.5, 4' : ''}
                                    />
                                </div>
                            ))}
                        </div>

                        {calculatedResult !== null && (
                            <div className="mt-4 text-center bg-black/20 p-3 rounded-lg">
                                <p className="text-sm text-[--color-textSecondary]">Result</p>
                                <p className="text-3xl font-bold text-[--color-accent]">{calculatedResult.toLocaleString()}</p>
                            </div>
                        )}
                        
                        <div className="mt-6 flex gap-3">
                            <button onClick={handleCalculate} className="w-full py-3 bg-[--color-buttonOperatorBackground] text-[--color-accent] font-bold rounded-xl">Calculate</button>
                            <button onClick={handleUseResult} disabled={calculatedResult === null} className="w-full py-3 bg-[--color-buttonSpecial2Background] text-[--color-textPrimary] font-bold rounded-xl disabled:opacity-50">Use Result</button>
                        </div>
                    </div>
                     <style>{`
                        @keyframes fade-in-up {
                            from { opacity: 0; transform: translateY(20px) scale(0.95); }
                            to { opacity: 1; transform: translateY(0) scale(1); }
                        }
                        .animate-fade-in-up { animation: fade-in-up 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
                    `}</style>
                </div>
            )}
        </div>
    );
};

export default Shortcuts;