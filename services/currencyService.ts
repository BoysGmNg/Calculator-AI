import { Unit } from '../types';

const API_BASE_URL = 'https://api.frankfurter.app';

export const fetchCurrencies = async (): Promise<Unit[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/currencies`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data: Record<string, string> = await response.json();
        return Object.entries(data).map(([symbol, name]) => ({ name, symbol }));
    } catch (error) {
        console.error("Failed to fetch currencies:", error);
        throw error;
    }
};

export const fetchRates = async (baseCurrency: string): Promise<Record<string, number>> => {
    if (!baseCurrency) return {};
    try {
        const response = await fetch(`${API_BASE_URL}/latest?from=${baseCurrency}`);
         if (!response.ok) {
            throw new Error(`Failed to fetch rates for ${baseCurrency}`);
        }
        const data = await response.json();
        return data.rates;
    } catch (error) {
        console.error("Failed to fetch rates:", error);
        throw error;
    }
};
