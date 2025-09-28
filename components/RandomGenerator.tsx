import React, { useState, useEffect } from 'react';

interface RandomGeneratorProps {
    show: boolean;
    onClose: () => void;
    onGenerate: (min: number, max: number) => void;
}

const RandomGenerator: React.FC<RandomGeneratorProps> = ({ show, onClose, onGenerate }) => {
    const [min, setMin] = useState('0');
    const [max, setMax] = useState('100');
    const [isRendered, setIsRendered] = useState(false);

    useEffect(() => {
        if (show) {
            setIsRendered(true);
        } else {
            const timer = setTimeout(() => setIsRendered(false), 300);
            return () => clearTimeout(timer);
        }
    }, [show]);

    const handleGenerate = () => {
        const minVal = parseInt(min, 10);
        const maxVal = parseInt(max, 10);

        if (isNaN(minVal) || isNaN(maxVal) || minVal > maxVal) {
            alert("Please enter a valid range where Min is less than or equal to Max.");
            return;
        }
        onGenerate(minVal, maxVal);
    };

    if (!isRendered) {
        return null;
    }

    return (
        <div 
            className={`fixed inset-0 z-50 flex items-end justify-center transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}
            onClick={onClose}
        >
            <div 
                className={`w-full max-w-sm p-4 rounded-t-3xl shadow-lg transition-transform duration-300 ease-in-out transform origin-bottom-left ${show ? 'translate-y-0 scale-100' : 'translate-y-full scale-90'}`}
                style={{ backgroundColor: 'var(--color-buttonBackground)'}}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-[--color-textPrimary]">Random Number</h2>
                    <button onClick={onClose} className="text-2xl text-[--color-textSecondary]">&times;</button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label htmlFor="min" className="text-sm text-[--color-textSecondary]">Min</label>
                        <input
                            id="min"
                            type="number"
                            value={min}
                            onChange={(e) => setMin(e.target.value)}
                            className="w-full mt-1 p-3 bg-[--color-displayBackground] rounded-lg text-[--color-textPrimary] text-xl focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
                        />
                    </div>
                     <div>
                        <label htmlFor="max" className="text-sm text-[--color-textSecondary]">Max</label>
                        <input
                            id="max"
                            type="number"
                            value={max}
                            onChange={(e) => setMax(e.target.value)}
                            className="w-full mt-1 p-3 bg-[--color-displayBackground] rounded-lg text-[--color-textPrimary] text-xl focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
                        />
                    </div>
                </div>

                <div className="mt-6 flex gap-4">
                    <button 
                        onClick={onClose}
                        className="w-full py-3 rounded-xl bg-[--color-buttonSpecial1Background] text-[--color-accent] font-bold text-lg transition-colors hover:bg-[--color-buttonSpecial1BackgroundHover]"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleGenerate}
                        className="w-full py-3 rounded-xl bg-[--color-buttonSpecial2Background] text-[--color-textPrimary] font-bold text-lg transition-colors hover:bg-[--color-buttonSpecial2BackgroundHover]"
                    >
                        Generate
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RandomGenerator;
