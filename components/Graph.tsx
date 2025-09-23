// FIX: Import 'useCallback' from React to resolve 'Cannot find name' errors.
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ChartOptions,
    ChartData
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { parse } from 'mathjs';

// Register Chart.js components and plugins
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    zoomPlugin
);

const GRAPH_STORAGE_KEY = 'calculator-graph-state';

interface GraphState {
    funcStr: string;
    scales?: {
        xMin: number;
        xMax: number;
        yMin: number;
        yMax: number;
    }
}

const Graph: React.FC = () => {
    const [funcStr, setFuncStr] = useState<string>('x^2');
    const [error, setError] = useState<string | null>(null);
    const chartRef = useRef<ChartJS<'line'>>(null);
    const [savedScales, setSavedScales] = useState<GraphState['scales'] | undefined>(undefined);

    // Load state from localStorage on component mount
    useEffect(() => {
        try {
            const savedStateJSON = localStorage.getItem(GRAPH_STORAGE_KEY);
            if (savedStateJSON) {
                const savedState: GraphState = JSON.parse(savedStateJSON);
                setFuncStr(savedState.funcStr || 'x^2');
                if (savedState.scales) {
                    setSavedScales(savedState.scales);
                }
            }
        } catch (e) {
            console.error("Failed to load graph state from localStorage", e);
        }
    }, []);

    const saveGraphState = useCallback(() => {
        try {
            const chart = chartRef.current;
            const scales = chart ? {
                xMin: chart.scales.x.min,
                xMax: chart.scales.x.max,
                yMin: chart.scales.y.min,
                yMax: chart.scales.y.max,
            } : savedScales;

            const state: GraphState = { funcStr, scales };
            localStorage.setItem(GRAPH_STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.error("Failed to save graph state to localStorage", e);
        }
    }, [funcStr, savedScales]);

    useEffect(() => {
        // Save state whenever the function string changes
        saveGraphState();
    }, [funcStr, saveGraphState]);


    // State to hold theme colors from CSS variables
    const [themeColors, setThemeColors] = useState({
        accent: '#ff9800',
        textPrimary: '#ffffff',
        textSecondary: '#a0a0a0',
        grid: 'rgba(128, 128, 128, 0.2)',
    });

    // Effect to read CSS variables and update colors
    useEffect(() => {
        const rootStyles = getComputedStyle(document.documentElement);
        setThemeColors({
            accent: rootStyles.getPropertyValue('--color-accent').trim(),
            textPrimary: rootStyles.getPropertyValue('--color-textPrimary').trim(),
            textSecondary: rootStyles.getPropertyValue('--color-textSecondary').trim(),
            grid: rootStyles.getPropertyValue('--color-textSecondary').trim() + '33', // Add alpha for grid
        });
    }, []); // This runs on mount. Relies on App's key prop to re-mount on theme change.

    const [chartData, setChartData] = useState<ChartData<'line'>>({
        labels: [],
        datasets: [
            {
                label: 'y = f(x)',
                data: [],
                borderColor: themeColors.accent,
                tension: 0.1,
                pointRadius: 0,
                borderWidth: 2,
            },
        ],
    });

    const plotFunction = useCallback(() => {
        try {
            if (!funcStr.trim()) {
                setError("Function cannot be empty.");
                return;
            }
            setError(null);
            const node = parse(funcStr);
            const code = node.compile();

            const xValues = [];
            const yValues = [];
            const range = 20;
            const step = 0.25;

            for (let i = -range; i <= range; i += step) {
                const x = parseFloat(i.toFixed(3));
                xValues.push(x);
                try {
                    const y = code.evaluate({ x });
                    if (typeof y !== 'number' || !isFinite(y)) {
                        yValues.push(null); // Handle discontinuities
                    } else {
                        yValues.push(y);
                    }
                } catch (e) {
                    yValues.push(null);
                }
            }

            setChartData(prevData => ({
                ...prevData,
                labels: xValues,
                datasets: [
                    {
                        ...prevData.datasets[0],
                        label: `y = ${funcStr || 'f(x)'}`,
                        data: yValues,
                        borderColor: themeColors.accent,
                    },
                ],
            }));
        } catch (err: any) {
            setError(err.message || 'Invalid function.');
        }
    }, [funcStr, themeColors.accent]);
    
    // Plot function on mount, when function changes, or when theme changes
    useEffect(() => {
        plotFunction();
    }, [plotFunction]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        plotFunction();
    };

    const handleResetZoom = () => {
        chartRef.current?.resetZoom();
        setSavedScales(undefined);
        // Remove only the scales from localStorage, keep the function string
        try {
            const savedStateJSON = localStorage.getItem(GRAPH_STORAGE_KEY);
            if (savedStateJSON) {
                const savedState: GraphState = JSON.parse(savedStateJSON);
                delete savedState.scales;
                localStorage.setItem(GRAPH_STORAGE_KEY, JSON.stringify(savedState));
            }
        } catch(e) {
             console.error("Failed to clear graph scales from localStorage", e);
        }
    };
    
    const handleZoomOrPanComplete = ({ chart }: { chart: ChartJS }) => {
        const newScales = {
            xMin: chart.scales.x.min,
            xMax: chart.scales.x.max,
            yMin: chart.scales.y.min,
            yMax: chart.scales.y.max,
        };
        setSavedScales(newScales);
        saveGraphState();
    };
    
    const handleExport = () => {
        const chart = chartRef.current;
        if (chart) {
            // Temporarily set background color for export
            const canvas = chart.canvas;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.save();
                ctx.globalCompositeOperation = 'destination-over';
                const rootStyles = getComputedStyle(document.documentElement);
                ctx.fillStyle = rootStyles.getPropertyValue('--color-displayBackground').trim();
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.restore();
            }

            const image = chart.toBase64Image('image/png', 1);
            const link = document.createElement('a');
            link.href = image;
            link.download = `plot_of_${funcStr.replace(/[^a-z0-9]/gi, '_')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Re-render chart to remove background
            chart.update();
        }
    };

    const chartOptions: ChartOptions<'line'> = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: 'linear',
                title: { display: true, text: 'x', color: themeColors.textSecondary },
                ticks: { color: themeColors.textSecondary },
                grid: { color: (context) => context.tick.value === 0 ? themeColors.textSecondary : themeColors.grid },
                position: 'center',
                min: savedScales?.xMin,
                max: savedScales?.xMax,
            },
            y: {
                title: { display: true, text: 'y', color: themeColors.textSecondary },
                ticks: { color: themeColors.textSecondary },
                grid: { color: (context) => context.tick.value === 0 ? themeColors.textSecondary : themeColors.grid },
                position: 'center',
                min: savedScales?.yMin,
                max: savedScales?.yMax,
            },
        },
        plugins: {
            legend: {
                labels: { color: themeColors.textPrimary },
            },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.7)',
                titleColor: themeColors.textPrimary,
                bodyColor: themeColors.textPrimary,
            },
            zoom: {
                pan: { enabled: true, mode: 'xy', onPanComplete: handleZoomOrPanComplete },
                zoom: { 
                    wheel: { enabled: true }, 
                    pinch: { enabled: true }, 
                    mode: 'xy',
                    onZoomComplete: handleZoomOrPanComplete
                },
            },
        },
    }), [themeColors, savedScales, saveGraphState]);

    return (
        <div className="flex flex-col h-[492px] space-y-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
                <div className="relative flex-grow">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[--color-textSecondary] font-mono">y =</span>
                    <input
                        type="text"
                        value={funcStr}
                        onChange={(e) => setFuncStr(e.target.value)}
                        className="w-full bg-[--color-buttonBackground] rounded-lg pl-12 pr-4 py-3 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-[--color-accent] text-[--color-textPrimary]"
                        aria-label="Function input"
                    />
                </div>
                <button type="submit" className="px-4 bg-[--color-accent] hover:bg-[--color-accentHover] text-[--color-background] rounded-lg font-bold transition-colors">
                    Plot
                </button>
            </form>
             {error && <div className="text-center text-red-400 bg-red-500/10 p-2 rounded-lg text-sm">{error}</div>}
            <div className="flex-grow relative bg-[--color-displayBackground] p-2 rounded-lg">
                 <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <button onClick={handleExport} className="p-2 bg-[--color-buttonBackground] hover:bg-[--color-buttonBackgroundHover] rounded-full" aria-label="Export as PNG">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </button>
                    <button onClick={handleResetZoom} className="p-2 bg-[--color-buttonBackground] hover:bg-[--color-buttonBackgroundHover] rounded-full" aria-label="Reset zoom">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 10V3m0 7H3" />
                        </svg>
                    </button>
                 </div>
                <Line ref={chartRef} options={chartOptions} data={chartData} />
            </div>
        </div>
    );
};

export default Graph;