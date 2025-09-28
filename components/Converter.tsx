
import React, { useState, useEffect, useCallback } from 'react';
import { CONVERSION_CATEGORIES, convert } from '../services/conversionService';
import { getAvailableCurrencies, getCurrencyRate } from '../services/geminiService';
import { Unit } from '../types';

const Converter: React.FC = () => {
    const categoryNames = ['Currency', ...Object.keys(CONVERSION_CATEGORIES)];
    const [activeCategory, setActiveCategory] = useState<string>(categoryNames[0]);
    
    const [units, setUnits] = useState<Unit[]>([]);
    const [fromUnit, setFromUnit] = useState<Unit | null>(null);
    const [toUnit, setToUnit] = useState<Unit | null>(null);
    const [fromValue, setFromValue] = useState<string>('1');
    const [toValue, setToValue] = useState<string>('');

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const performConversion = useCallback(async (val: number, from: Unit, to: Unit): Promise<string> => {
        if (val === 0) return '0';
        if (from.symbol === to.symbol) return val.toString();
        
        if (activeCategory === 'Currency') {
            setIsLoading(true);
            setError(null);
            try {
                const rate = await getCurrencyRate(from.symbol, to.symbol);
                if (rate > 0) {
                    const result = parseFloat((val * rate).toPrecision(12));
                    return result.toString();
                } else {
                    setError('Could not get a valid conversion rate.');
                    return '';
                }
            } catch (err) {
                setError('Failed to perform currency conversion.');
                return '';
            } finally {
                setIsLoading(false);
            }
        } else {
            const result = convert(val, from, to);
            return result.toString();
        }
    }, [activeCategory]);
    
    useEffect(() => {
        const loadCategoryData = async () => {
            setIsLoading(true);
            setError(null);
            setFromValue('1');
            
            let newUnits: Unit[] = [];
            if (activeCategory === 'Currency') {
                try {
                    newUnits = await getAvailableCurrencies();
                } catch (err) {
                    setError('Failed to load currency data.');
                    console.error(err);
                    newUnits = [{ name: 'US Dollar', symbol: 'USD' }]; // Minimal fallback
                }
            } else {
                newUnits = CONVERSION_CATEGORIES[activeCategory].units;
            }

            setUnits(newUnits);
            const newFromUnit = newUnits[0];
            const newToUnit = newUnits[1] || newUnits[0];
            setFromUnit(newFromUnit);
            setToUnit(newToUnit);
            
            // Trigger initial conversion
            if (newFromUnit && newToUnit) {
                 const result = await performConversion(1, newFromUnit, newToUnit);
                 setToValue(result);
            } else {
                 setToValue('');
            }
            setIsLoading(false);
        };

        loadCategoryData();
    }, [activeCategory, performConversion]);

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setActiveCategory(e.target.value);
    };

    const handleUnitChange = async (type: 'from' | 'to', newUnitSymbol: string) => {
        const newUnit = units.find(u => u.symbol === newUnitSymbol);
        if (!newUnit) return;
        
        const numericValue = parseFloat(fromValue) || 0;
        
        if (type === 'from') {
            setFromUnit(newUnit);
            if (toUnit) {
                const result = await performConversion(numericValue, newUnit, toUnit);
                setToValue(result);
            }
        } else {
            setToUnit(newUnit);
            if (fromUnit) {
                const result = await performConversion(numericValue, fromUnit, newUnit);
                setToValue(result);
            }
        }
    };
    
    const handleValueChange = async (type: 'from' | 'to', value: string) => {
        const numericValue = parseFloat(value);
        if (value === '' || isNaN(numericValue)) {
            setFromValue(type === 'from' ? value : '');
            setToValue(type === 'to' ? value : '');
            return;
        }

        if (type === 'from') {
            setFromValue(value);
            if (fromUnit && toUnit) {
                const result = await performConversion(numericValue, fromUnit, toUnit);
                setToValue(result);
            }
        } else {
            setToValue(value);
            if (fromUnit && toUnit) {
                const result = await performConversion(numericValue, toUnit, fromUnit);
                setFromValue(result);
            }
        }
    };

    const handleSwap = () => {
        if (!fromUnit || !toUnit) return;
        const oldFromUnit = fromUnit;
        const oldToUnit = toUnit;
        const oldFromValue = fromValue;
        const oldToValue = toValue;
        
        setFromUnit(oldToUnit);
        setToUnit(oldFromUnit);
        setFromValue(oldToValue);
        setToValue(oldFromValue);
    };

    const UnitSelector = ({ selectedUnit, onChange, unitList }: { selectedUnit: Unit, onChange: (symbol: string) => void, unitList: Unit[] }) => (
        <select
            value={selectedUnit.symbol}
            onChange={(e) => onChange(e.target.value)}
            className="bg-[--color-buttonBackground] text-[--color-textPrimary] rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
            disabled={isLoading}
        >
            {unitList.map(unit => (
                <option key={unit.symbol} value={unit.symbol}>{unit.name} ({unit.symbol})</option>
            ))}
        </select>
    );

    const ConversionInput = ({ unit, onUnitChange, value, onValueChange, unitList }: { unit: Unit | null, onUnitChange: (symbol: string) => void, value: string, onValueChange: (value: string) => void, unitList: Unit[] }) => (
        <div className="bg-[--color-displayBackground] p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-[--color-textSecondary]">{unit?.name || '...'}</span>
                {unit && <UnitSelector selectedUnit={unit} onChange={onUnitChange} unitList={unitList} />}
            </div>
            <input
                type="number"
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
                className="w-full bg-transparent text-4xl font-bold text-right focus:outline-none"
                placeholder="0"
                disabled={isLoading}
            />
        </div>
    );
    
    return (
        <div className="space-y-4 min-h-[492px] relative">
             {isLoading && (
                <div className="absolute inset-0 bg-black/30 z-10 flex items-center justify-center rounded-lg">
                    <div className="w-8 h-8 border-4 border-[--color-accent] border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            {error && <div className="text-center text-red-500 bg-red-500/10 p-2 rounded-lg">{error}</div>}

            <select 
                value={activeCategory}
                onChange={handleCategoryChange}
                className="w-full bg-[--color-buttonBackground] text-[--color-textPrimary] rounded-lg px-4 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
            >
                {categoryNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                ))}
            </select>
            
            <ConversionInput 
                unit={fromUnit}
                onUnitChange={(symbol) => handleUnitChange('from', symbol)}
                value={fromValue}
                onValueChange={(val) => handleValueChange('from', val)}
                unitList={units}
            />

            <div className="flex justify-center">
                 <button onClick={handleSwap} className="p-2 rounded-full bg-[--color-buttonBackground] hover:bg-[--color-buttonBackgroundHover] text-[--color-textSecondary] hover:text-[--color-textPrimary] transition-all transform hover:rotate-180 disabled:opacity-50" disabled={isLoading}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 12l-4-4m4 4l4-4m6 8v-4m0 0l4-4m-4 4l-4-4" />
                    </svg>
                </button>
            </div>

             <ConversionInput 
                unit={toUnit}
                onUnitChange={(symbol) => handleUnitChange('to', symbol)}
                value={toValue}
                onValueChange={(val) => handleValueChange('to', val)}
                unitList={units}
            />
        </div>
    );
};

export default Converter;
