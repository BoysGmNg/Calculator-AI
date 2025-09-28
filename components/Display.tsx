
import React, { useState } from 'react';
import { HistoryItem } from '../types';

interface DisplayProps {
    input: string;
    result: string;
    isLoading: boolean;
    statusText: string;
    isGemini: boolean;
    explanation: string;
    errorKey: number;
    history: HistoryItem[];
    onHistoryClick: (value: string) => void;
    isScientific: boolean;
    onToggleScientific: () => void;
    onToggleHistory: () => void;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-end space-x-2">
        <div className="w-4 h-4 rounded-full bg-[--color-accent] animate-pulse"></div>
        <div className="w-4 h-4 rounded-full bg-[--color-accent] animate-pulse [animation-delay:0.2s]"></div>
        <div className="w-4 h-4 rounded-full bg-[--color-accent] animate-pulse [animation-delay:0.4s]"></div>
    </div>
);

const Display: React.FC<DisplayProps> = ({ input, result, isLoading, statusText, isGemini, explanation, errorKey, history, onHistoryClick, isScientific, onToggleScientific, onToggleHistory }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        if (result && !isLoading && result !== 'Error' && result !== 'API Error') {
            navigator.clipboard.writeText(result).then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 1500);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        }
    };

    const isError = !isLoading && (result === 'Error' || result === 'API Error');
    
    const formatResult = (value: string): string => {
        if (isLoading || isError || !value) {
            return value;
        }
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
        } catch (e) {
            // Fallback for numbers too large for BigInt or other errors
            return value;
        }
    };

    const getResultFontSize = (text: string) => {
        const length = text.toString().length;
        if (length > 18) return 'text-3xl';
        if (length > 14) return 'text-4xl';
        if (length > 10) return 'text-5xl';
        return 'text-6xl';
    };
    const formattedResult = formatResult(result);
    const resultFontSize = getResultFontSize(formattedResult);

    return (
        <div className="relative bg-[--color-displayBackground] rounded-lg px-6 py-4 mb-4 text-right break-words min-h-[220px] flex flex-col justify-end transition-colors duration-300">
             {isLoading && statusText && (
                <div className="absolute inset-0 bg-[--color-displayBackground]/80 backdrop-blur-sm flex items-center justify-center z-20 rounded-lg animate-fade-in">
                    <div className="flex flex-col items-center justify-center text-center">
                        <LoadingSpinner />
                        <p className="mt-4 text-base font-semibold text-[--color-textPrimary] animate-pulse">{statusText}</p>
                    </div>
                </div>
            )}
             <style>{`
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
                .animate-shake {
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }
            `}</style>
            
            <div className="absolute top-3 left-3 flex items-center gap-1 z-10">
                <button 
                    onClick={onToggleScientific}
                    className="p-2 text-[--color-textSecondary] hover:text-[--color-textPrimary] transition-colors"
                    aria-label={isScientific ? "Collapse scientific keypad" : "Expand scientific keypad"}
                    aria-expanded={isScientific}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-300 ${isScientific ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                <button 
                    onClick={onToggleHistory}
                    className="p-2 text-[--color-textSecondary] hover:text-[--color-textPrimary] transition-colors"
                    aria-label="View history"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
            </div>

            <div className="flex-grow flex flex-col justify-end items-end text-sm text-[--color-textSecondary] overflow-hidden space-y-1">
                {history.slice(0, 3).reverse().map((item, index) => (
                    <div key={index} className="w-full text-right group" title="Click expression or result to use">
                       <span 
                            className="cursor-pointer hover:text-[--color-textPrimary] p-1 rounded transition-colors group-hover:bg-white/5"
                            onClick={() => onHistoryClick(item.input)}
                        >
                            {item.input}
                        </span>
                       <span className="text-[--color-textPrimary] font-medium mx-1">=</span>
                       <span 
                            className="cursor-pointer hover:text-[--color-accent] font-bold text-[--color-textPrimary] p-1 rounded transition-colors group-hover:bg-white/5"
                            onClick={() => onHistoryClick(item.result)}
                        >
                            {formatResult(item.result)}
                        </span>
                    </div>
                ))}
            </div>

            <div className="h-8 text-2xl text-[--color-textSecondary] truncate">{input || ' '}</div>
            <div className="flex items-center justify-end gap-2">
                {!isLoading && !isError && result !== '0' && (
                     <button 
                        onClick={handleCopy} 
                        className="p-2 -ml-2 rounded-full text-[--color-textSecondary] hover:text-[--color-textPrimary] hover:bg-white/10 transition-colors"
                        aria-label="Copy result"
                     >
                        {isCopied ? (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[--color-accent]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        )}
                    </button>
                )}
                <div key={errorKey} className={`h-16 font-bold flex items-center justify-end transition-all duration-200 ${resultFontSize} ${isError ? 'animate-shake' : ''}`}>
                    {isLoading && !statusText ? (
                        <LoadingSpinner />
                    ) : isError ? (
                        <div className="flex items-center justify-end gap-2" style={{ color: 'var(--color-buttonSpecial1Background)'}}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="truncate">{result}</span>
                        </div>
                    ) : (
                        <span className="truncate">{formattedResult}</span>
                    )}
                </div>
            </div>
             {isGemini && !isLoading && !isError && (
                <div className="text-right mt-1 space-y-1">
                    {explanation && (
                        <p className="text-sm text-[--color-textSecondary]">{explanation}</p>
                    )}
                    <div className="text-sm text-[--color-accent] font-semibold flex items-center justify-end">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm3.93 6.07L12 12l-3.93-3.93L12 4.14l3.93 3.93zM4.14 12l3.93 3.93L12 12l-3.93-3.93-3.93 3.93zm7.86 7.86L12 12l3.93 3.93L12 19.86z"></path></svg>
                        Powered by Gemini
                    </div>
                </div>
            )}
        </div>
    );
};

export default Display;
