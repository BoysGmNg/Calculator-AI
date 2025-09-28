import React, { useState, useEffect, useCallback, useRef } from 'react';
import { parse } from 'mathjs';

// Add Plotly to the global window object for TypeScript
declare global {
    interface Window {
        Plotly: any;
    }
}

const Graph3D: React.FC = () => {
    const [funcStr, setFuncStr] = useState<string>('sin(x) * cos(y)');
    const [error, setError] = useState<string | null>(null);
    const plotContainerRef = useRef<HTMLDivElement>(null);
    const isPlotInitialized = useRef<boolean>(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loaderMessage, setLoaderMessage] = useState('Loading graphing library...');
    
    const [themeColors, setThemeColors] = useState({
        accent: '#ff9800',
        textPrimary: '#ffffff',
        textSecondary: '#a0a0a0',
        displayBackground: '#000000',
    });

    useEffect(() => {
        const rootStyles = getComputedStyle(document.documentElement);
        setThemeColors({
            accent: rootStyles.getPropertyValue('--color-accent').trim(),
            textPrimary: rootStyles.getPropertyValue('--color-textPrimary').trim(),
            textSecondary: rootStyles.getPropertyValue('--color-textSecondary').trim(),
            displayBackground: rootStyles.getPropertyValue('--color-displayBackground').trim(),
        });
    }, []);

    const plotFunction = useCallback(() => {
        if (!window.Plotly || !plotContainerRef.current) {
            return;
        }
        
        setLoaderMessage('Calculating plot...');
        setIsLoading(true);
        setError(null);
        
        setTimeout(() => {
            try {
                if (!funcStr.trim()) {
                    throw new Error("Function cannot be empty.");
                }
                const node = parse(funcStr);
                const code = node.compile();

                const size = 50;
                const x_vals = Array.from({ length: size }, (_, i) => -10 + 20 * i / (size - 1));
                const y_vals = Array.from({ length: size }, (_, i) => -10 + 20 * i / (size - 1));
                const z_vals: (number | null)[][] = [];

                for (let i = 0; i < size; i++) {
                    const y = y_vals[i];
                    const row: (number | null)[] = [];
                    for (let j = 0; j < size; j++) {
                        const x = x_vals[j];
                        try {
                            const z = code.evaluate({ x, y });
                            row.push((typeof z === 'number' && isFinite(z)) ? z : null);
                        } catch (e) {
                            row.push(null);
                        }
                    }
                    z_vals.push(row);
                }

                const data = [{
                    z: z_vals, x: x_vals, y: y_vals, type: 'surface',
                    colorscale: 'Viridis',
                    colorbar: {
                        tickfont: { color: themeColors.textSecondary },
                        titlefont: { color: themeColors.textSecondary }
                    }
                }];

                const layout = {
                    title: { text: `z = ${funcStr}`, font: { color: themeColors.textPrimary } },
                    autosize: true,
                    paper_bgcolor: themeColors.displayBackground,
                    plot_bgcolor: themeColors.displayBackground,
                    scene: {
                        xaxis: { title: 'X', color: themeColors.textSecondary, gridcolor: themeColors.textSecondary + '40' },
                        yaxis: { title: 'Y', color: themeColors.textSecondary, gridcolor: themeColors.textSecondary + '40' },
                        zaxis: { title: 'Z', color: themeColors.textSecondary, gridcolor: themeColors.textSecondary + '40' },
                    },
                    margin: { l: 0, r: 0, b: 0, t: 40 },
                };
                
                if (plotContainerRef.current) {
                    window.Plotly.newPlot(plotContainerRef.current, data, layout, { responsive: true, displaylogo: false });
                    isPlotInitialized.current = true;
                }
            } catch (err: any) {
                setError(err.message || 'Invalid function.');
                if (plotContainerRef.current && window.Plotly && isPlotInitialized.current) {
                    window.Plotly.purge(plotContainerRef.current);
                    isPlotInitialized.current = false;
                }
            } finally {
                setIsLoading(false);
            }
        }, 10);
    }, [funcStr, themeColors]);

    useEffect(() => {
        const checkAndPlot = () => {
            if (window.Plotly) {
                plotFunction();
            } else {
                const interval = setInterval(() => {
                    if (window.Plotly) {
                        clearInterval(interval);
                        plotFunction();
                    }
                }, 100);
                return () => clearInterval(interval);
            }
        };

        const cleanupSubscription = checkAndPlot();

        return () => {
            if (cleanupSubscription) cleanupSubscription();
            if (isPlotInitialized.current && plotContainerRef.current && window.Plotly) {
                window.Plotly.purge(plotContainerRef.current);
                isPlotInitialized.current = false;
            }
        };
    }, [plotFunction]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        plotFunction();
    };
    
    const handleExport = () => {
        if (isPlotInitialized.current && plotContainerRef.current && window.Plotly) {
            window.Plotly.downloadImage(plotContainerRef.current, {
                format: 'png',
                filename: `3d_plot_${funcStr.replace(/[^a-z0-9]/gi, '_')}`,
                height: 800,
                width: 800,
            });
        }
    };

    return (
        <div className="flex flex-col h-[492px] space-y-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
                 <div className="relative flex-grow">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[--color-textSecondary] font-mono">z =</span>
                    <input
                        type="text"
                        value={funcStr}
                        onChange={(e) => setFuncStr(e.target.value)}
                        className="w-full bg-[--color-buttonBackground] rounded-lg pl-12 pr-4 py-3 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-[--color-accent] text-[--color-textPrimary]"
                        aria-label="3D Function input"
                    />
                </div>
                <button type="submit" className="px-4 bg-[--color-accent] hover:bg-[--color-accentHover] text-[--color-background] rounded-lg font-bold transition-colors">
                    Plot
                </button>
            </form>
             {error && <div className="text-center text-red-400 bg-red-500/10 p-2 rounded-lg text-sm">{error}</div>}
            <div className="flex-grow relative bg-[--color-displayBackground] p-2 rounded-lg">
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <button onClick={handleExport} className="p-2 bg-[--color-buttonBackground] hover:bg-[--color-buttonBackgroundHover] rounded-full" aria-label="Export as PNG" disabled={!isPlotInitialized.current}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </button>
                 </div>
                <div ref={plotContainerRef} className="w-full h-full"></div>
                {isLoading && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-lg text-center">
                         <div className="w-8 h-8 border-4 border-[--color-accent] border-t-transparent rounded-full animate-spin"></div>
                         <p className="mt-3 text-sm text-[--color-textSecondary]">{loaderMessage}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Graph3D;