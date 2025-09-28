
import { Categories, Unit } from '../types';

export const CONVERSION_CATEGORIES: Categories = {
    Length: {
        name: 'Length',
        baseUnit: 'm',
        units: [
            { name: 'Meter', symbol: 'm', toBase: v => v, fromBase: v => v },
            { name: 'Kilometer', symbol: 'km', toBase: v => v * 1000, fromBase: v => v / 1000 },
            { name: 'Centimeter', symbol: 'cm', toBase: v => v / 100, fromBase: v => v * 100 },
            { name: 'Millimeter', symbol: 'mm', toBase: v => v / 1000, fromBase: v => v * 1000 },
            { name: 'Mile', symbol: 'mi', toBase: v => v * 1609.34, fromBase: v => v / 1609.34 },
            { name: 'Yard', symbol: 'yd', toBase: v => v * 0.9144, fromBase: v => v / 0.9144 },
            { name: 'Foot', symbol: 'ft', toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
            { name: 'Inch', symbol: 'in', toBase: v => v * 0.0254, fromBase: v => v / 0.0254 },
        ]
    },
    Mass: {
        name: 'Mass',
        baseUnit: 'kg',
        units: [
            { name: 'Kilogram', symbol: 'kg', toBase: v => v, fromBase: v => v },
            { name: 'Gram', symbol: 'g', toBase: v => v / 1000, fromBase: v => v * 1000 },
            { name: 'Milligram', symbol: 'mg', toBase: v => v / 1e6, fromBase: v => v * 1e6 },
            { name: 'Tonne', symbol: 't', toBase: v => v * 1000, fromBase: v => v / 1000 },
            { name: 'Pound', symbol: 'lb', toBase: v => v * 0.453592, fromBase: v => v / 0.453592 },
            { name: 'Ounce', symbol: 'oz', toBase: v => v * 0.0283495, fromBase: v => v / 0.0283495 },
        ]
    },
    Temperature: {
        name: 'Temperature',
        baseUnit: 'C',
        units: [
            { name: 'Celsius', symbol: '°C', toBase: v => v, fromBase: v => v },
            { name: 'Fahrenheit', symbol: '°F', toBase: v => (v - 32) * 5 / 9, fromBase: v => (v * 9 / 5) + 32 },
            { name: 'Kelvin', symbol: 'K', toBase: v => v - 273.15, fromBase: v => v + 273.15 },
        ]
    },
    Area: {
        name: 'Area',
        baseUnit: 'm²',
        units: [
            { name: 'Square Meter', symbol: 'm²', toBase: v => v, fromBase: v => v },
            { name: 'Square Kilometer', symbol: 'km²', toBase: v => v * 1e6, fromBase: v => v / 1e6 },
            { name: 'Square Mile', symbol: 'mi²', toBase: v => v * 2.59e6, fromBase: v => v / 2.59e6 },
            { name: 'Hectare', symbol: 'ha', toBase: v => v * 10000, fromBase: v => v / 10000 },
            { name: 'Acre', symbol: 'acre', toBase: v => v * 4046.86, fromBase: v => v / 4046.86 },
        ]
    },
    Volume: {
        name: 'Volume',
        baseUnit: 'L',
        units: [
            { name: 'Liter', symbol: 'L', toBase: v => v, fromBase: v => v },
            { name: 'Milliliter', symbol: 'mL', toBase: v => v / 1000, fromBase: v => v * 1000 },
            { name: 'Cubic Meter', symbol: 'm³', toBase: v => v * 1000, fromBase: v => v / 1000 },
            { name: 'Gallon (US)', symbol: 'gal', toBase: v => v * 3.78541, fromBase: v => v / 3.78541 },
            { name: 'Pint (US)', symbol: 'pt', toBase: v => v * 0.473176, fromBase: v => v / 0.473176 },
        ]
    },
    Time: {
        name: 'Time',
        baseUnit: 's',
        units: [
            { name: 'Second', symbol: 's', toBase: v => v, fromBase: v => v },
            { name: 'Minute', symbol: 'min', toBase: v => v * 60, fromBase: v => v / 60 },
            { name: 'Hour', symbol: 'h', toBase: v => v * 3600, fromBase: v => v / 3600 },
            { name: 'Day', symbol: 'd', toBase: v => v * 86400, fromBase: v => v / 86400 },
            { name: 'Week', symbol: 'wk', toBase: v => v * 604800, fromBase: v => v / 604800 },
            { name: 'Month', symbol: 'mo', toBase: v => v * 2.628e+6, fromBase: v => v / 2.628e+6 }, // Average
            { name: 'Year', symbol: 'yr', toBase: v => v * 3.154e+7, fromBase: v => v / 3.154e+7 }, // Average
        ]
    },
    'Data Storage': {
        name: 'Data Storage',
        baseUnit: 'B',
        units: [
            { name: 'Byte', symbol: 'B', toBase: v => v, fromBase: v => v },
            { name: 'Kilobyte', symbol: 'KB', toBase: v => v * 1024, fromBase: v => v / 1024 },
            { name: 'Megabyte', symbol: 'MB', toBase: v => v * 1024**2, fromBase: v => v / 1024**2 },
            { name: 'Gigabyte', symbol: 'GB', toBase: v => v * 1024**3, fromBase: v => v / 1024**3 },
            { name: 'Terabyte', symbol: 'TB', toBase: v => v * 1024**4, fromBase: v => v / 1024**4 },
            { name: 'Bit', symbol: 'bit', toBase: v => v / 8, fromBase: v => v * 8 },
        ]
    },
    Speed: {
        name: 'Speed',
        baseUnit: 'm/s',
        units: [
            { name: 'Meter/second', symbol: 'm/s', toBase: v => v, fromBase: v => v },
            { name: 'Kilometer/hour', symbol: 'km/h', toBase: v => v / 3.6, fromBase: v => v * 3.6 },
            { name: 'Mile/hour', symbol: 'mph', toBase: v => v * 0.44704, fromBase: v => v / 0.44704 },
            { name: 'Knot', symbol: 'kn', toBase: v => v * 0.514444, fromBase: v => v / 0.514444 },
            { name: 'Foot/second', symbol: 'ft/s', toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
        ]
    },
};

export const convert = (value: number, fromUnit: Unit, toUnit: Unit): number => {
    if (fromUnit.name === toUnit.name) {
        return value;
    }
    // Ensure conversion functions exist
    if (!fromUnit.toBase || !toUnit.fromBase) {
        throw new Error("Conversion functions are missing for one of the units.");
    }

    const baseValue = fromUnit.toBase(value);
    const result = toUnit.fromBase(baseValue);
    // Use toPrecision to avoid floating point inaccuracies and long decimals
    return parseFloat(result.toPrecision(12));
};
