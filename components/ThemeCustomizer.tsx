
import React, { useState, useEffect } from 'react';
import { Theme, ThemeColors } from '../types';
import { PREDEFINED_THEMES } from '../themes';

interface ThemeCustomizerProps {
    show: boolean;
    activeTheme: Theme;
    setTheme: (theme: Theme) => void;
    allThemes: Theme[];
    onSaveTheme: (theme: Theme) => void;
    onDeleteTheme: (themeName: string) => void;
}

const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({ show, activeTheme, setTheme, allThemes, onSaveTheme, onDeleteTheme }) => {
    const [newThemeName, setNewThemeName] = useState('');

    useEffect(() => {
        if (activeTheme.name === 'Custom') {
            setNewThemeName('');
        }
    }, [activeTheme.name]);

    const handleCustomColorChange = (colorName: keyof ThemeColors, value: string) => {
        const newCustomTheme: Theme = {
            name: "Custom",
            colors: {
                ...activeTheme.colors,
                [colorName]: value,
            }
        };
        setTheme(newCustomTheme);
    };

    const handleSave = () => {
        if (!newThemeName.trim()) {
            alert("Please enter a name for your theme.");
            return;
        }
        if (allThemes.some(t => t.name.toLowerCase() === newThemeName.trim().toLowerCase())) {
            alert("A theme with this name already exists. Please choose a different name.");
            return;
        }
        onSaveTheme({ ...activeTheme, name: newThemeName.trim() });
        setNewThemeName('');
    };
    
    const colorInputs: { label: string, key: keyof ThemeColors }[] = [
        { label: "Background", key: "background"},
        { label: "Display", key: "displayBackground"},
        { label: "Primary Text", key: "textPrimary"},
        { label: "Secondary Text", key: "textSecondary"},
        { label: "Accent", key: "accent"},
        { label: "Number Btn", key: "buttonBackground"},
        { label: "Operator Btn", key: "buttonOperatorBackground"},
        { label: "AC Btn", key: "buttonSpecial1Background"},
        { label: "= Btn", key: "buttonSpecial2Background"},
    ];

    const predefinedThemeNames = PREDEFINED_THEMES.map(t => t.name);

    return (
        <div className={`grid transition-all duration-500 ease-in-out ${show ? 'grid-rows-[1fr] mb-4' : 'grid-rows-[0fr]'}`}>
            <style>{`
                .theme-scrollbar::-webkit-scrollbar {
                    height: 6px;
                }
                .theme-scrollbar::-webkit-scrollbar-track {
                    background: rgba(0,0,0,0.1);
                    border-radius: 3px;
                }
                .theme-scrollbar::-webkit-scrollbar-thumb {
                    background-color: var(--color-accent);
                    border-radius: 3px;
                }
                /* For Firefox */
                .theme-scrollbar {
                   scrollbar-width: thin;
                   scrollbar-color: var(--color-accent) rgba(0,0,0,0.1);
                }
            `}</style>
            <div className="min-h-0 overflow-hidden">
                <div className="border-b border-white/10 pb-4 mb-4">
                    <p className="text-sm font-bold mb-3 text-[--color-textSecondary]">AVAILABLE THEMES</p>
                    <div className="flex items-center gap-3 overflow-x-auto pb-3 theme-scrollbar">
                        {allThemes.map(theme => (
                            <div key={theme.name} className="relative group flex-shrink-0">
                                <button
                                    onClick={() => setTheme(theme)}
                                    className={`whitespace-nowrap pl-3 pr-3 py-1 rounded-full text-sm font-semibold transition-all duration-150 transform active:scale-95 focus:outline-none ${activeTheme.name === theme.name ? 'bg-[--color-accent] text-[--color-background] ring-2 ring-offset-2 ring-[--color-accent] ring-offset-[--color-background]' : 'bg-white/10 hover:bg-white/20'}`}
                                >
                                    {theme.name}
                                </button>
                                {!predefinedThemeNames.includes(theme.name) && (
                                    <button 
                                        onClick={() => onDeleteTheme(theme.name)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                        aria-label={`Delete ${theme.name} theme`}
                                    >
                                        &times;
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <p className="text-sm font-bold mb-3 text-[--color-textSecondary]">THEME EDITOR</p>
                     {activeTheme.name === 'Custom' && (
                        <div className="bg-black/20 p-3 rounded-lg mb-4 flex items-center gap-2">
                            <input 
                                type="text"
                                placeholder="Enter theme name..."
                                value={newThemeName}
                                onChange={(e) => setNewThemeName(e.target.value)}
                                className="bg-transparent w-full text-sm focus:outline-none"
                            />
                            <button onClick={handleSave} className="bg-[--color-accent] text-[--color-background] rounded-md px-3 py-1 text-sm font-bold">
                                Save
                            </button>
                        </div>
                    )}
                    <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                        {colorInputs.map(({label, key}) => (
                             <div key={key} className="flex items-center justify-between bg-black/20 p-2 rounded-md">
                                <label htmlFor={`color-${key}`} className="text-xs mr-2 text-[--color-textPrimary] truncate">{label}</label>
                                <input
                                    type="color"
                                    id={`color-${key}`}
                                    value={activeTheme.colors[key]}
                                    onChange={(e) => handleCustomColorChange(key, e.target.value)}
                                    className="w-6 h-6 p-0 border-none rounded cursor-pointer bg-transparent"
                                    style={{'WebkitAppearance': 'none', 'MozAppearance': 'none', 'appearance': 'none'}}
                                />
                            </div>
                        ))}
                    </div>
                </div>
                 <style>{`
                    input[type="color"]::-webkit-color-swatch-wrapper {
                        padding: 0;
                    }
                    input[type="color"]::-webkit-color-swatch {
                        border: 1px solid var(--color-textSecondary);
                        border-radius: 0.25rem;
                    }
                     input[type="color"]::-moz-color-swatch {
                        border: 1px solid var(--color-textSecondary);
                        border-radius: 0.25rem;
                    }
                `}</style>
            </div>
        </div>
    );
};

export default ThemeCustomizer;
