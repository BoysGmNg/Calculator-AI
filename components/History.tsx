import React from 'react';
import { HistoryItem } from '../types';

interface HistoryProps {
    show: boolean;
    history: HistoryItem[];
    onHistoryClick: (value: string) => void;
    onClose: () => void;
    onClearHistory: () => void;
}

const History: React.FC<HistoryProps> = ({ show, history, onHistoryClick, onClose, onClearHistory }) => {
    if (!show) {
        return null;
    }

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        }).format(date);
    };
    
    const formatResult = (value: string): string => {
        // Regex to check if the string is purely a number (integer or float)
        const isNumeric = /^-?\d+(\.\d+)?$/.test(value);
        if (!isNumeric) {
            return value; // It's a Gemini text response or something else, don't format
        }

        const [integerPart, decimalPart] = value.split('.');
        try {
            // Use Intl.NumberFormat for robust, locale-aware formatting.
            const formattedIntegerPart = new Intl.NumberFormat('en-US').format(BigInt(integerPart));

            return decimalPart === undefined
                ? formattedIntegerPart
                : `${formattedIntegerPart}.${decimalPart}`;
        } catch(e) {
            return value;
        }
    };


    return (
        <div 
            className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center transition-opacity"
            onClick={onClose}
        >
            <div 
                className="bg-[--color-displayBackground] w-full max-w-sm h-[80vh] max-h-[600px] rounded-2xl p-4 flex flex-col shadow-2xl animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-[--color-textPrimary]">History</h2>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-full text-[--color-textSecondary] hover:text-[--color-textPrimary] transition-colors"
                        aria-label="Close history"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                {history.length > 0 ? (
                    <>
                        <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                            {history.map((item, index) => (
                                <div key={index} className="text-right">
                                    <p 
                                        className="text-[--color-textSecondary] text-sm truncate cursor-pointer hover:text-[--color-textPrimary]"
                                        onClick={() => onHistoryClick(item.input)}
                                        title={item.input}
                                    >
                                        {item.input}
                                    </p>
                                    <p 
                                        className="text-[--color-textPrimary] text-2xl font-semibold truncate cursor-pointer hover:text-[--color-accent]"
                                        onClick={() => onHistoryClick(item.result)}
                                        title={item.result}
                                    >
                                       = {formatResult(item.result)}
                                    </p>
                                    <p className="text-xs text-[--color-textSecondary]/70 mt-1">{formatDate(item.date)}</p>
                                </div>
                            ))}
                        </div>
                        <button 
                            onClick={onClearHistory}
                            className="mt-4 w-full py-2 bg-[--color-buttonSpecial1Background] hover:bg-[--color-buttonSpecial1BackgroundHover] text-[--color-accent] rounded-lg font-semibold transition-colors"
                        >
                            Clear History
                        </button>
                    </>
                ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-center text-[--color-textSecondary]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="font-semibold">No calculations yet</p>
                        <p className="text-sm">Your calculation history will appear here.</p>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                }
            `}</style>
        </div>
    );
};

export default History;