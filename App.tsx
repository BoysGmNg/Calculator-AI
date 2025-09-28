
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { HistoryItem, Theme, ButtonConfig } from './types';
import { calculateWithGemini, classifyVoiceInput } from './services/geminiService';
import Display from './components/Display';
import Keypad, { getBasicButtons, getScientificButtons } from './components/Keypad';
import { evaluate } from 'mathjs';
import ThemeCustomizer from './components/ThemeCustomizer';
import { PREDEFINED_THEMES, DEFAULT_THEME } from './themes';
import Converter from './components/Converter';
import History from './components/History';
import RandomGenerator from './components/RandomGenerator';
import Shortcuts from './components/Shortcuts';
import AboutModal from './components/AboutModal';
import AiChat from './components/AiChat';
import AiSelectionModal from './components/AiSelectionModal';
import { MODELS } from './services/aiChatService';
import Graph from './components/Graph';
import { SHORTCUTS } from './services/shortcutsService';
import Graph3D from './components/Graph3D';

// FIX: Add SpeechRecognition types to the global window object to fix TypeScript errors.
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

const App: React.FC = () => {
    const [inputState, setInputState] = useState<{ past: string[], present: string, future: string[] }>({ past: [], present: '', future: []});
    const [result, setResult] = useState<string>('0');
    const [explanation, setExplanation] = useState<string>('');
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [statusText, setStatusText] = useState<string>('');
    const [isGemini, setIsGemini] = useState<boolean>(false);
    const [isDegrees, setIsDegrees] = useState<boolean>(false);
    const [is2nd, setIs2nd] = useState<boolean>(false);
    const [showThemeCustomizer, setShowThemeCustomizer] = useState<boolean>(false);
    const [errorKey, setErrorKey] = useState(0);
    const [activeView, setActiveView] = useState<'calculator' | 'converter' | 'shortcuts' | 'aiChat' | 'graph'>('calculator');
    const [graphMode, setGraphMode] = useState<'2D' | '3D'>('2D');
    const [isScientific, setIsScientific] = useState<boolean>(false);
    const [isListening, setIsListening] = useState<boolean>(false);
    const [isMicCooldown, setIsMicCooldown] = useState<boolean>(false);
    const [showHistory, setShowHistory] = useState<boolean>(false);
    const [isLayoutEditable, setIsLayoutEditable] = useState<boolean>(false);
    const [showRandomGenerator, setShowRandomGenerator] = useState<boolean>(false);
    const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
    const recognitionRef = useRef<any>(null);
    const [aiSelectionState, setAiSelectionState] = useState<{ show: boolean; topic: string; } | null>(null);
    const [initialChatState, setInitialChatState] = useState<{ modelId: string; prompt: string; } | null>(null);


    const input = inputState.present;
    const canUndo = inputState.past.length > 0;
    const canRedo = inputState.future.length > 0;

    const [basicButtonOrder, setBasicButtonOrder] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('calculator-basic-layout');
            return saved ? JSON.parse(saved) : getBasicButtons(false, false, false, false, false).map(b => b.value);
        } catch {
            return getBasicButtons(false, false, false, false, false).map(b => b.value);
        }
    });

    const [scientificButtonOrder, setScientificButtonOrder] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('calculator-scientific-layout');
            return saved ? JSON.parse(saved) : getScientificButtons(false, false).map(b => b.value);
        } catch {
            return getScientificButtons(false, false).map(b => b.value);
        }
    });

    useEffect(() => {
        if (!isLoading) {
            setStatusText('');
        }
    }, [isLoading]);

    useEffect(() => {
        try {
            localStorage.setItem('calculator-basic-layout', JSON.stringify(basicButtonOrder));
        } catch (error) {
            console.error("Could not save basic layout to localStorage", error);
        }
    }, [basicButtonOrder]);
    
    useEffect(() => {
        try {
            localStorage.setItem('calculator-scientific-layout', JSON.stringify(scientificButtonOrder));
        } catch (error) {
            console.error("Could not save scientific layout to localStorage", error);
        }
    }, [scientificButtonOrder]);

    const setInputWithHistory = useCallback((newValue: string | ((prev: string) => string), merge = false) => {
        const value = typeof newValue === 'function' ? newValue(inputState.present) : newValue;
        if (value === inputState.present) return;

        setInputState(prevState => {
            const newPast = [...prevState.past];
            if (!merge || newPast[newPast.length - 1] !== prevState.present) {
                newPast.push(prevState.present);
            }
            return {
                past: newPast,
                present: value,
                future: []
            };
        });
    }, [inputState.present]);

    const handleUndo = useCallback(() => {
        if (!canUndo) return;
        setInputState(prevState => {
            const newPast = [...prevState.past];
            const newPresent = newPast.pop()!;
            return {
                past: newPast,
                present: newPresent,
                future: [prevState.present, ...prevState.future]
            };
        });
    }, [canUndo]);

    const handleRedo = useCallback(() => {
        if (!canRedo) return;
        setInputState(prevState => {
            const newFuture = [...prevState.future];
            const newPresent = newFuture.shift()!;
            return {
                past: [...prevState.past, prevState.present],
                present: newPresent,
                future: newFuture
            };
        });
    }, [canRedo]);


    // FIX: The result of JSON.parse is 'unknown' and must be validated to prevent type errors.
    // This ensures that corrupted data in localStorage does not crash the application.
    const [customThemes, setCustomThemes] = useState<Theme[]>(() => {
        try {
            const saved = localStorage.getItem('calculator-custom-themes');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            }
            return [];
        } catch (error) {
            console.error("Failed to load custom themes from localStorage", error);
            return [];
        }
    });

    // FIX: The `customThemes` state variable is not available during the initialization of another state.
    // To fix this, we load the custom themes directly from localStorage again within this initializer
    // to correctly determine the active theme on first render.
    const [activeTheme, setActiveTheme] = useState<Theme>(() => {
        try {
            const savedCustom = localStorage.getItem('calculator-custom-themes');
            let localCustomThemes: Theme[] = [];
            if (savedCustom) {
                const parsed = JSON.parse(savedCustom);
                if (Array.isArray(parsed)) {
                    localCustomThemes = parsed;
                }
            }
            
            const allThemes = [...PREDEFINED_THEMES, ...localCustomThemes];
            const savedName = localStorage.getItem('calculator-active-theme-name');
            const savedTheme = allThemes.find(t => t.name === savedName);
            return savedTheme || DEFAULT_THEME;
        } catch (error) {
            console.error("Failed to load active theme from localStorage", error);
            return DEFAULT_THEME;
        }
    });
    
    useEffect(() => {
        const root = document.documentElement;
        for (const [key, value] of Object.entries(activeTheme.colors)) {
            // FIX: The value from `Object.entries` can be inferred as `unknown` when using strict
            // settings with unvalidated data from `JSON.parse`. This type guard ensures `value` is a
            // string before being passed to `setProperty`, resolving the TypeScript error.
            if (typeof value === 'string') {
                root.style.setProperty(`--color-${key}`, value);
            }
        }
        document.body.style.backgroundColor = activeTheme.colors.background;
        
        try {
            if (activeTheme.name !== 'Custom') {
                localStorage.setItem('calculator-active-theme-name', activeTheme.name);
            }
        } catch (error) {
            console.error("Could not save active theme name to localStorage", error);
        }

    }, [activeTheme]);

    const setTheme = useCallback((newTheme: Theme) => {
        if (activeTheme.name === newTheme.name && newTheme.name !== 'Custom') {
            return;
        }
        setActiveTheme(newTheme);
    }, [activeTheme.name]);

    const saveCustomTheme = useCallback((theme: Theme) => {
        const newCustomThemes = [...customThemes.filter(t => t.name !== theme.name), theme];
        setCustomThemes(newCustomThemes);
        setActiveTheme(theme);
        try {
            localStorage.setItem('calculator-custom-themes', JSON.stringify(newCustomThemes));
        } catch (error) {
            console.error("Could not save custom themes to localStorage", error);
        }
    }, [customThemes]);

    const deleteCustomTheme = useCallback((themeName: string) => {
        const newCustomThemes = customThemes.filter(t => t.name !== themeName);
        setCustomThemes(newCustomThemes);
        if (activeTheme.name === themeName) {
            setActiveTheme(DEFAULT_THEME);
        }
        try {
            localStorage.setItem('calculator-custom-themes', JSON.stringify(newCustomThemes));
        } catch (error) {
            console.error("Could not save custom themes to localStorage", error);
        }
    }, [customThemes, activeTheme.name]);


    const handleClear = useCallback(() => {
        setInputWithHistory('');
        setResult('0');
        setExplanation('');
        setIsGemini(false);
    }, [setInputWithHistory]);

    const handleCalculate = useCallback(async (expressionOverride?: string) => {
        const expressionToCalculate = expressionOverride ?? input;
        if (!expressionToCalculate) return;
        
        setIsLoading(true);
        setStatusText('Calculating...');
        setResult('');
        setExplanation('');
        
        try {
            let expression = expressionToCalculate
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/π/g, 'pi')
                // More robustly handle log function names (for keypad and voice)
                .replace(/lg/g, 'log10')
                .replace(/ln/g, 'log')
                // Explicitly handle implicit multiplication between parentheses, e.g. (2)(3)
                .replace(/\)\(/g, ')*(');
            
            const scope = isDegrees ? {
                sin: (x: number) => Math.sin(x * Math.PI / 180),
                cos: (x: number) => Math.cos(x * Math.PI / 180),
                tan: (x: number) => Math.tan(x * Math.PI / 180),
                asin: (x: number) => Math.asin(x) * 180 / Math.PI,
                acos: (x: number) => Math.acos(x) * 180 / Math.PI,
                atan: (x: number) => Math.atan(x) * 180 / Math.PI,
            } : {};

            const mathResult = evaluate(expression, scope);
            const formattedResult = Number(mathResult.toFixed(10)).toString();
            setResult(formattedResult);
            if (history.length === 0 || history[0].input !== expressionToCalculate || history[0].result !== formattedResult) {
                setHistory(prev => [{ input: expressionToCalculate, result: formattedResult, date: new Date() }, ...prev].slice(0, 20));
            }
            setInputWithHistory(formattedResult);
            setIsGemini(false);
        } catch (error) {
            try {
                const geminiResult = await calculateWithGemini(expressionToCalculate);
                if (geminiResult && geminiResult.result !== "Error") {
                    setResult(geminiResult.result);
                    setExplanation(geminiResult.explanation);
                    if (history.length === 0 || history[0].input !== expressionToCalculate || history[0].result !== geminiResult.result) {
                        setHistory(prev => [{ input: expressionToCalculate, result: geminiResult.result, date: new Date() }, ...prev].slice(0, 20));
                    }
                    setInputWithHistory(geminiResult.result);
                    setIsGemini(true);
                } else {
                    setResult('Error');
                    setExplanation(geminiResult.explanation); // Show explanation even for errors (e.g., rate limit)
                    if (!expressionOverride) {
                        setInputWithHistory('');
                    }
                    setErrorKey(k => k + 1);
                }
            } catch (apiError) {
                console.error("Gemini API Error:", apiError);
                setResult('API Error');
                 if (!expressionOverride) {
                    setInputWithHistory('');
                }
                setErrorKey(k => k + 1);
            }
        } finally {
            setIsLoading(false);
        }
    }, [input, isDegrees, setInputWithHistory, history]);
    
    const allThemes = [...PREDEFINED_THEMES, ...customThemes];

    const handleMicClick = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition is not supported by your browser.");
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            return;
        }
        
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        recognition.lang = navigator.language || 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onend = () => {
            setIsListening(false);
            recognitionRef.current = null;
        };
        
        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
             if (event.error !== 'aborted') {
                let errorMessage = `Speech recognition error: ${event.error}`;
                if (event.error === 'no-speech') {
                    errorMessage = "I didn't hear anything. Please tap the mic and try again.";
                } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    errorMessage = "Microphone access denied. Please allow microphone access in your browser settings to use voice input.";
                }
               alert(errorMessage);
            }
            setIsListening(false);
            recognitionRef.current = null;
        };

        recognition.onresult = async (event: any) => {
            const transcript = event.results[0][0].transcript;
            if (!transcript) {
                setIsListening(false);
                return;
            }

            setIsLoading(true);
            setStatusText('Understanding...');
            setIsMicCooldown(true);
            setTimeout(() => setIsMicCooldown(false), 4000);

            try {
                const classification = await classifyVoiceInput(transcript);
                
                switch (classification.intent) {
                    case 'calculate':
                        setInputWithHistory(classification.content);
                        await handleCalculate(classification.content);
                        break;

                    case 'ask_ai':
                        setAiSelectionState({ show: true, topic: classification.content });
                        setIsLoading(false);
                        break;
                    
                    case 'unknown':
                    default:
                         setIsLoading(false);
                         alert(`Sorry, I didn't understand that. Please try a calculation like "5 times 5" or ask a question like "what is the theory of relativity?".`);
                         break;
                }
            } catch (error: any) {
                setIsLoading(false);
                console.error("Error classifying voice command:", error);
                alert(`Sorry, there was an error trying to understand your speech: ${error.message}`);
            }
        };

        recognition.start();
    }, [isListening, setInputWithHistory, handleCalculate]);

    const handleButtonClick = useCallback((value: string) => {
        if (isLoading) return;

        const functions: { [key: string]: string } = {
            'sin': is2nd ? 'asin(' : 'sin(',
            'cos': is2nd ? 'acos(' : 'cos(',
            'tan': is2nd ? 'atan(' : 'tan(',
            'lg': is2nd ? '10^' : 'lg(',
            'ln': is2nd ? 'e^' : 'ln(',
            '√': is2nd ? '^2' : 'sqrt(',
        };

        if (functions[value]) {
            setInputWithHistory(prev => prev + functions[value]);
            return;
        }

        switch (value) {
            case 'AC': handleClear(); break;
            case '=': handleCalculate(); break;
            case '%':
                setInputWithHistory(prev => {
                    if (!prev) return '';
                    // This regex finds the last number in the string and the operator right before it.
                    const match = prev.match(/([+\-×÷])([0-9.]+)$/);

                    if (match && match.index !== undefined) {
                        // Case: "100+50", user presses %
                        const operator = match[1]; // e.g., "+"
                        const percentNumberStr = match[2]; // e.g., "50"
                        const baseStr = prev.substring(0, match.index); // e.g., "100"

                        try {
                            // Evaluate the base part which could be complex (e.g., "50*2")
                            const baseValue = evaluate(baseStr.replace(/×/g, '*').replace(/÷/g, '/'));
                            const percentValue = parseFloat(percentNumberStr);

                            if (isNaN(baseValue) || isNaN(percentValue)) return prev;

                            let calculatedPercentValue;
                            if (operator === '×' || operator === '÷') {
                                // For multiplication/division, 10% becomes 0.1
                                calculatedPercentValue = percentValue / 100;
                            } else { // '+' or '-'
                                // For addition/subtraction, 100 + 10% becomes 100 + (10% of 100)
                                calculatedPercentValue = (baseValue * percentValue) / 100;
                            }
                            
                            // Reconstruct the string with the calculated value
                            return `${baseStr}${operator}${calculatedPercentValue}`;
                        } catch {
                            // If base expression is invalid, do nothing
                            return prev;
                        }
                    } else {
                        // Case: "50", no preceding operator. Treat as simple percentage conversion.
                        try {
                             // Use evaluate to handle cases like "(50)"
                            const num = evaluate(prev.replace(/×/g, '*').replace(/÷/g, '/'));
                            if (isNaN(num)) return prev;
                            // Convert to decimal (50 becomes 0.5)
                            return (num / 100).toString();
                        } catch {
                            return prev;
                        }
                    }
                });
                break;
            case '(': setInputWithHistory(prev => prev + '('); break;
            case ')': setInputWithHistory(prev => prev + ')'); break;
            case 'Deg': setIsDegrees(prev => !prev); break;
            case '2nd': setIs2nd(prev => !prev); break;
            case 'x^y': setInputWithHistory(prev => prev + '^'); break;
            case 'e': setInputWithHistory(prev => prev + 'e'); break;
            case 'π': setInputWithHistory(prev => prev + 'π'); break;
            case 'MIC': handleMicClick(); break;
            case 'DEL': setInputWithHistory(prev => prev.slice(0, -1)); break;
            case 'RND': setShowRandomGenerator(true); break;
            case 'UNDO': handleUndo(); break;
            case 'REDO': handleRedo(); break;
            default:
                if (result !== '0' && input === result && !['+', '-', '×', '÷', '%', '^'].includes(value)) {
                    setInputWithHistory(value);
                } else {
                    setInputWithHistory(prev => prev + value);
                }
                break;
        }
    }, [isLoading, handleClear, handleCalculate, result, input, is2nd, handleMicClick, setInputWithHistory, handleUndo, handleRedo]);

    const handleHistoryClick = useCallback((value: string) => {
        setInputWithHistory(value);
        handleCalculate(value);
    }, [setInputWithHistory, handleCalculate]);

    const handleClearHistory = useCallback(() => {
        setHistory([]);
    }, []);
    
    const handleGenerateRandom = (min: number, max: number) => {
        const rand = Math.floor(Math.random() * (max - min + 1)) + min;
        setInputWithHistory(rand.toString());
        setResult(rand.toString());
        setShowRandomGenerator(false);
    };

    const handleShortcutResult = useCallback((shortcutResult: number) => {
        const formattedResult = Number(shortcutResult.toFixed(10)).toString();
        setInputWithHistory(formattedResult);
        setResult(formattedResult);
        setActiveView('calculator');
    }, [setInputWithHistory]);

    
    const LockIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
    );

    const UnlockIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
        </svg>
    );

    const isFuture50000Theme = activeTheme.name === 'Future 50000';

    return (
        <div className={`min-h-screen bg-[--color-background] text-[--color-textPrimary] flex items-center justify-center p-2 font-sans transition-colors duration-300 ${isFuture50000Theme ? 'theme-future-50000' : ''}`}>
             <style>{`
                 @keyframes animated-gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .theme-future-50000 {
                    background: linear-gradient(270deg, #0d0221, #241a54, #ff00c1, #00f6ff);
                    background-size: 400% 400%;
                    animation: animated-gradient 20s ease infinite;
                }
            `}</style>
            <div className="w-full max-w-sm mx-auto relative">
                <div className="bg-[--color-displayBackground]/50 backdrop-blur-xl rounded-3xl p-4 shadow-2xl shadow-black/20 transition-colors duration-300">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div className="flex items-center flex-wrap gap-2">
                            <button
                                onClick={() => setActiveView('calculator')}
                                className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${activeView === 'calculator' ? 'bg-[--color-accent] text-[--color-background]' : 'text-[--color-textSecondary] hover:text-[--color-textPrimary]'}`}
                                aria-pressed={activeView === 'calculator'}
                            >
                                Calculator
                            </button>
                             <button
                                onClick={() => setActiveView('graph')}
                                className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${activeView === 'graph' ? 'bg-[--color-accent] text-[--color-background]' : 'text-[--color-textSecondary] hover:text-[--color-textPrimary]'}`}
                                aria-pressed={activeView === 'graph'}
                            >
                                Graph
                            </button>
                            <button
                                onClick={() => setActiveView('converter')}
                                className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${activeView === 'converter' ? 'bg-[--color-accent] text-[--color-background]' : 'text-[--color-textSecondary] hover:text-[--color-textPrimary]'}`}
                                aria-pressed={activeView === 'converter'}
                            >
                                Converter
                            </button>
                             <button
                                onClick={() => setActiveView('shortcuts')}
                                className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${activeView === 'shortcuts' ? 'bg-[--color-accent] text-[--color-background]' : 'text-[--color-textSecondary] hover:text-[--color-textPrimary]'}`}
                                aria-pressed={activeView === 'shortcuts'}
                            >
                                Shortcuts
                            </button>
                            <button
                                onClick={() => setActiveView('aiChat')}
                                className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${activeView === 'aiChat' ? 'bg-[--color-accent] text-[--color-background]' : 'text-[--color-textSecondary] hover:text-[--color-textPrimary]'}`}
                                aria-pressed={activeView === 'aiChat'}
                            >
                                AI Chat
                            </button>
                        </div>
                        <div className="flex items-center">
                            <button
                                onClick={() => setIsLayoutEditable(p => !p)}
                                className="p-2 rounded-full text-[--color-textSecondary] hover:text-[--color-textPrimary] transition-colors"
                                aria-label="Toggle keypad layout editing"
                                aria-pressed={isLayoutEditable}
                            >
                                {isLayoutEditable ? <UnlockIcon /> : <LockIcon />}
                            </button>
                            <button
                                onClick={() => setShowAboutModal(true)}
                                className="p-2 rounded-full text-[--color-textSecondary] hover:text-[--color-textPrimary] transition-colors"
                                aria-label="About this application"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setShowThemeCustomizer(prev => !prev)}
                                className="p-2 rounded-full text-[--color-textSecondary] hover:text-[--color-textPrimary] transition-colors"
                                aria-label="Customize theme"
                                aria-expanded={showThemeCustomizer}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.706-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zM3 11a1 1 0 100-2H2a1 1 0 100 2h1z" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <ThemeCustomizer
                        show={showThemeCustomizer}
                        activeTheme={activeTheme}
                        setTheme={setTheme}
                        allThemes={allThemes}
                        onSaveTheme={saveCustomTheme}
                        onDeleteTheme={deleteCustomTheme}
                    />
                    
                    <div style={{ display: activeView === 'calculator' ? 'block' : 'none' }}>
                         <Display
                            input={input}
                            result={result}
                            isLoading={isLoading}
                            statusText={statusText}
                            isGemini={isGemini}
                            explanation={explanation}
                            errorKey={errorKey}
                            history={history}
                            onHistoryClick={handleHistoryClick}
                            isScientific={isScientific}
                            onToggleScientific={() => setIsScientific(p => !p)}
                            onToggleHistory={() => setShowHistory(true)}
                        />
                        <Keypad
                            onButtonClick={handleButtonClick}
                            isDegrees={isDegrees}
                            is2nd={is2nd}
                            isScientific={isScientific}
                            isListening={isListening}
                            isMicCooldown={isMicCooldown}
                            isLayoutEditable={isLayoutEditable}
                            basicButtonOrder={basicButtonOrder}
                            onBasicLayoutChange={setBasicButtonOrder}
                            scientificButtonOrder={scientificButtonOrder}
                            onScientificLayoutChange={setScientificButtonOrder}
                            canUndo={canUndo}
                            canRedo={canRedo}
                        />
                    </div>
                    
                    <div style={{ display: activeView === 'graph' ? 'block' : 'none' }}>
                        <div className="flex items-center justify-center gap-2 p-1 bg-[--color-displayBackground] rounded-full mb-4">
                             <button
                                onClick={() => setGraphMode('2D')}
                                className={`w-full px-3 py-1 text-sm font-semibold rounded-full transition-colors ${graphMode === '2D' ? 'bg-[--color-accent] text-[--color-background]' : 'text-[--color-textSecondary] hover:text-[--color-textPrimary]'}`}
                                aria-pressed={graphMode === '2D'}
                            >
                                2D Plot
                            </button>
                             <button
                                onClick={() => setGraphMode('3D')}
                                className={`w-full px-3 py-1 text-sm font-semibold rounded-full transition-colors ${graphMode === '3D' ? 'bg-[--color-accent] text-[--color-background]' : 'text-[--color-textSecondary] hover:text-[--color-textPrimary]'}`}
                                aria-pressed={graphMode === '3D'}
                            >
                                3D Plot
                            </button>
                        </div>
                        {graphMode === '2D' ? <Graph /> : <Graph3D />}
                    </div>

                    <div style={{ display: activeView === 'converter' ? 'block' : 'none' }}>
                        <Converter />
                    </div>

                    <div style={{ display: activeView === 'shortcuts' ? 'block' : 'none' }}>
                        <Shortcuts onShortcutResult={handleShortcutResult} />
                    </div>

                    <div style={{ display: activeView === 'aiChat' ? 'block' : 'none' }}>
                        <AiChat
                             initialState={initialChatState}
                             onPromptSent={() => setInitialChatState(null)}
                        />
                    </div>
                </div>
            </div>
             <History
                show={showHistory}
                onClose={() => setShowHistory(false)}
                history={history}
                onHistoryClick={(value) => {
                    handleHistoryClick(value);
                    setShowHistory(false);
                }}
                onClearHistory={handleClearHistory}
            />
            <RandomGenerator
                show={showRandomGenerator}
                onClose={() => setShowRandomGenerator(false)}
                onGenerate={handleGenerateRandom}
            />
            <AboutModal
                show={showAboutModal}
                onClose={() => setShowAboutModal(false)}
            />
            <AiSelectionModal
                show={aiSelectionState?.show ?? false}
                topic={aiSelectionState?.topic ?? ''}
                onClose={() => setAiSelectionState(null)}
                onSelectModel={(modelId) => {
                    if (aiSelectionState) {
                        setInitialChatState({ modelId, prompt: aiSelectionState.topic });
                        setActiveView('aiChat');
                        setAiSelectionState(null);
                    }
                }}
            />
        </div>
    );
};

export default App;
