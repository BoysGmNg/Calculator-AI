import React from 'react';
import { Shortcut } from '../types';

const LoanIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
    </svg>
);

const BMIIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const DiscountIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A2 2 0 013 8V5a2 2 0 012-2z" />
    </svg>
);

const MoneyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
    </svg>
);

const CompoundInterestIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);

const StatsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const parseNumbersList = (input: string): number[] => {
    if (!input) return [];
    return input.split(/[, ]+/).map(s => s.trim()).filter(s => s !== '').map(s => parseFloat(s)).filter(n => !isNaN(n));
};

export const SHORTCUTS: Shortcut[] = [
    {
        name: 'Loan & Mortgage Payment',
        description: 'Calculate monthly loan payments.',
        icon: <LoanIcon />,
        inputs: [
            { name: 'principal', label: 'Principal Loan Amount ($)', type: 'number', defaultValue: '200000' },
            { name: 'rate', label: 'Annual Interest Rate (%)', type: 'number', defaultValue: '5' },
            { name: 'years', label: 'Loan Term (Years)', type: 'number', defaultValue: '30' },
        ],
        calculate: (inputs) => {
            const principal = parseFloat(inputs.principal) || 0;
            const rate = parseFloat(inputs.rate) || 0;
            const years = parseFloat(inputs.years) || 0;

            const monthlyRate = (rate / 100) / 12;
            const numberOfPayments = years * 12;
            if (monthlyRate === 0) return principal / numberOfPayments;
            const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
            return payment;
        }
    },
    {
        name: 'Compound Interest',
        description: 'Calculate future investment value.',
        icon: <CompoundInterestIcon />,
        inputs: [
            { name: 'principal', label: 'Principal Amount ($)', type: 'number', defaultValue: '1000' },
            { name: 'rate', label: 'Annual Interest Rate (%)', type: 'number', defaultValue: '7' },
            { name: 'years', label: 'Number of Years', type: 'number', defaultValue: '10' },
            { name: 'compoundsPerYear', label: 'Compounds per Year', type: 'number', defaultValue: '12' },
        ],
        calculate: (inputs) => {
            const principal = parseFloat(inputs.principal) || 0;
            const rate = parseFloat(inputs.rate) || 0;
            const years = parseFloat(inputs.years) || 0;
            const compoundsPerYear = parseFloat(inputs.compoundsPerYear) || 0;

            const annualRateDecimal = rate / 100;
            const n = compoundsPerYear < 1 ? 1 : compoundsPerYear;
            const t = years;
            const amount = principal * Math.pow(1 + (annualRateDecimal / n), n * t);
            return amount;
        }
    },
    {
        name: 'Tip Calculator',
        description: 'Calculate the total bill including tip.',
        icon: <MoneyIcon />,
        inputs: [
            { name: 'bill', label: 'Bill Amount ($)', type: 'number', defaultValue: '50' },
            { name: 'tip', label: 'Tip Percentage (%)', type: 'number', defaultValue: '15' },
        ],
        calculate: (inputs) => {
            const bill = parseFloat(inputs.bill) || 0;
            const tip = parseFloat(inputs.tip) || 0;
            const total = bill * (1 + (tip / 100));
            return total;
        }
    },
    {
        name: 'Discount & Tax',
        description: 'Calculate the final price after discount and tax.',
        icon: <DiscountIcon />,
        inputs: [
            { name: 'price', label: 'Original Price ($)', type: 'number', defaultValue: '100' },
            { name: 'discount', label: 'Discount (%)', type: 'number', defaultValue: '10' },
            { name: 'tax', label: 'Sales Tax (%)', type: 'number', defaultValue: '8' },
        ],
        calculate: (inputs) => {
            const price = parseFloat(inputs.price) || 0;
            const discount = parseFloat(inputs.discount) || 0;
            const tax = parseFloat(inputs.tax) || 0;
            const discountedPrice = price * (1 - (discount / 100));
            const finalPrice = discountedPrice * (1 + (tax / 100));
            return finalPrice;
        }
    },
    {
        name: 'Body Mass Index (BMI)',
        description: 'Calculate your body mass index.',
        icon: <BMIIcon />,
        inputs: [
            { name: 'weight', label: 'Weight (kg)', type: 'number', defaultValue: '70' },
            { name: 'height', label: 'Height (cm)', type: 'number', defaultValue: '175' },
        ],
        calculate: (inputs) => {
            const weight = parseFloat(inputs.weight) || 0;
            const height = parseFloat(inputs.height) || 0;
            if (height === 0) return 0;
            const heightInMeters = height / 100;
            const bmi = weight / (heightInMeters * heightInMeters);
            return bmi;
        }
    },
    {
        name: 'Median',
        description: 'Find the median of a list of numbers.',
        icon: <StatsIcon />,
        inputs: [
            { name: 'numbers', label: 'Numbers (comma or space separated)', type: 'text', defaultValue: '1, 5, 2, 8, 7' },
        ],
        calculate: (inputs) => {
            const numbers = parseNumbersList(inputs.numbers);
            if (numbers.length === 0) return 0;

            const sorted = [...numbers].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);

            return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        }
    },
    {
        name: 'Variance',
        description: 'Calculate the variance of a list of numbers.',
        icon: <StatsIcon />,
        inputs: [
            { name: 'numbers', label: 'Numbers (comma or space separated)', type: 'text', defaultValue: '1, 2, 3, 4, 5' },
        ],
        calculate: (inputs) => {
            const numbers = parseNumbersList(inputs.numbers);
            if (numbers.length < 2) return 0;

            const mean = numbers.reduce((a, b) => a + b) / numbers.length;
            const variance = numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numbers.length;
            return variance;
        }
    },
    {
        name: 'Standard Deviation',
        description: 'Calculate the standard deviation of a list of numbers.',
        icon: <StatsIcon />,
        inputs: [
            { name: 'numbers', label: 'Numbers (comma or space separated)', type: 'text', defaultValue: '1, 2, 3, 4, 5' },
        ],
        calculate: (inputs) => {
            const numbers = parseNumbersList(inputs.numbers);
            if (numbers.length < 2) return 0;

            const mean = numbers.reduce((a, b) => a + b) / numbers.length;
            const variance = numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numbers.length;
            return Math.sqrt(variance);
        }
    },
];