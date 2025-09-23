import React, { useState, useEffect, useCallback } from 'react';
import { CONVERSION_CATEGORIES, convert } from '../services/conversionService';
import { fetchCurrencies, fetchRates } from '../services/currencyService';
import { Unit } from '../types';

const Converter: React.FC = () => {
    const categoryNames = Object.keys(CONVERSION_CATEGORIES);
    const [activeCategory, setActiveCategory] = useState<string>(categoryNames[0]);
    
    const [units, setUnits] = useState<Unit[]>(CONVERSION_CATEGORIES[activeCategory].units);
    const [fromUnit, setFromUnit] = useState<Unit>(units[0]);
    const [toUnit, setToUnit] = useState<Unit>(units[1] || units[0]);
    const [fromValue, setFromValue] = useState<string>('1');
    const [toValue, setToValue] = useState<string>('');

    const [rates, setRates] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const performConversion = useCallback((val: number, from: Unit, to: Unit) => {
        if (activeCategory === 'Currency') {
            if (from.symbol === to.symbol) return val;
            const rate = rates[to.symbol];
            return rate ? parseFloat((val * rate).toPrecision(12)) : 0;
        } else {
            return convert(val, from, to);
        }
    }, [activeCategory, rates]);
    
    useEffect(() => {
        const initialValue = 1;
        const initialFrom = CONVERSION_CATEGORIES[activeCategory].units[0];
        const initialTo = CONVERSION_CATEGORIES[activeCategory].units[1] || initialFrom;
        const result = performConversion(initialValue, initialFrom, initialTo);
        setToValue(result.toString());
    }, [performConversion, activeCategory]);


    useEffect(() => {
        const loadCurrencyData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const currencyUnits = await fetchCurrencies();
                setUnits(currencyUnits);
                const newFromUnit = currencyUnits.find(u => u.symbol === 'USD') || currencyUnits[0];
                const newToUnit = currencyUnits.find(u => u.symbol === 'EUR') || currencyUnits[1];
                setFromUnit(newFromUnit);
                setToUnit(newToUnit);

                const fetchedRates = await fetchRates(newFromUnit.symbol);
                setRates(fetchedRates);

                const result = parseFloat((1 * (fetchedRates[newToUnit.symbol] || 0)).toPrecision(12));
                setToValue(result.toString());

            } catch (err) {
                setError('Failed to load currency data.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        if (activeCategory === 'Currency') {
            loadCurrencyData();
        } else {
            const newUnits = CONVERSION_CATEGORIES[activeCategory].units;
            setUnits(newUnits);
            const newFromUnit = newUnits[0];
            const newToUnit = newUnits[1] || newUnits[0];
            setFromUnit(newFromUnit);
            setToUnit(newToUnit);
            setFromValue('1');
        }
    }, [activeCategory]);
    
     useEffect(() => {
        const updateRates = async () => {
            if (activeCategory === 'Currency' && fromUnit.symbol) {
                setIsLoading(true);
                try {
                    const fetchedRates = await fetchRates(fromUnit.symbol);
                    setRates(fetchedRates);
                    const numericValue = parseFloat(fromValue) || 0;
                    const result = parseFloat((numericValue * (fetchedRates[toUnit.symbol] || 0)).toPrecision(12));
                    setToValue(result.toString());
                } catch (err) {
                     setError('Failed to update rates.');
                } finally {
                    setIsLoading(false);
                }
            }
        };
        updateRates();
    }, [fromUnit, activeCategory]);

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setActiveCategory(e.target.value);
    };

    const handleUnitChange = (type: 'from' | 'to', newUnitSymbol: string) => {
        const newUnit = units.find(u => u.symbol === newUnitSymbol);
        if (!newUnit) return;

        if (type === 'from') {
            setFromUnit(newUnit);
            // Rate update is handled by useEffect on fromUnit change
        } else {
            setToUnit(newUnit);
            const result = performConversion(parseFloat(fromValue) || 0, fromUnit, newUnit);
            setToValue(result.toString());
        }
    };
    
    const handleValueChange = (type: 'from' | 'to', value: string) => {
        const numericValue = parseFloat(value);
        if (value === '' || isNaN(numericValue)) {
            setFromValue(type === 'from' ? value : '');
            setToValue(type === 'to' ? value : '');
            return;
        }

        if (type === 'from') {
            setFromValue(value);
            const result = performConversion(numericValue, fromUnit, toUnit);
            setToValue(result.toString());
        } else {
            setToValue(value);
            const result = performConversion(numericValue, toUnit, fromUnit);
            setFromValue(result.toString());
        }
    };

    const handleSwap = () => {
        setFromUnit(toUnit);
        setToUnit(fromUnit);
        setFromValue(toValue);
        // Let useEffect handle recalculation of toValue based on new fromUnit
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

    const ConversionInput = ({ unit, onUnitChange, value, onValueChange, unitList }: { unit: Unit, onUnitChange: (symbol: string) => void, value: string, onValueChange: (value: string) => void, unitList: Unit[] }) => (
        <div className="bg-[--color-displayBackground] p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-[--color-textSecondary]">{unit.name}</span>
                <UnitSelector selectedUnit={unit} onChange={onUnitChange} unitList={unitList} />
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
