import React from 'react';

export interface HistoryItem {
  input: string;
  result: string;
  date: Date;
}

export interface GeminiResponse {
    result: string;
    explanation: string;
}

export interface ThemeColors {
    background: string;
    displayBackground: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
    accentHover: string;
    // Button backgrounds
    buttonBackground: string;
    buttonBackgroundHover: string;
    buttonOperatorBackground: string;
    buttonOperatorBackgroundHover: string;
    buttonAdvancedBackground: string;
    buttonAdvancedBackgroundHover: string;
    buttonSpecial1Background: string; // AC
    buttonSpecial1BackgroundHover: string;
    buttonSpecial2Background: string; // =
    buttonSpecial2BackgroundHover: string;
}

export interface Theme {
    name: string;
    colors: ThemeColors;
}

// --- Keypad Types ---
export type ButtonVariant = 'default' | 'number' | 'operator' | 'advanced' | 'special1' | 'special2' | 'toggleActive';

export interface ButtonConfig {
    label: string | React.ReactNode;
    value: string;
    variant?: ButtonVariant;
    className?: string;
    active?: boolean;
    disabled?: boolean;
}

// --- Converter Types ---
export interface Unit {
    name: string;
    symbol: string;
    toBase?: (value: number) => number;
    fromBase?: (value: number) => number;
}

export interface ConversionCategory {
    name: string;
    baseUnit: string;
    units: Unit[];
}

export type Categories = {
    [key: string]: ConversionCategory;
};

// --- Shortcuts Types ---
export interface ShortcutInput {
    name: string;
    label: string;
    type: 'number' | 'text';
    defaultValue?: string;
}

export interface Shortcut {
    name: string;
    description: string;
    icon: React.ReactNode;
    inputs: ShortcutInput[];
    calculate: (inputs: Record<string, string>) => number;
}

// --- AI Chat Types ---
export type ChatRole = 'user' | 'model';

export interface ChatMessage {
    role: ChatRole;
    content: string;
    file?: {
        data: string; // Base64 for images, raw text for text files
        mimeType: string;
        name: string;
    };
}

export interface Conversation {
    id: string;
    timestamp: number;
    title: string;
    messages: ChatMessage[];
}

export interface AiModel {
    id: string;
    name: string;
    provider: 'Google' | 'OpenRouter' | 'Puter';
    description: string;
    supportsImages: boolean;
}

export interface PersonalizationSettings {
    enabled: boolean;
    customInstructions: string;
    nickname: string;
    job: string;
    about: string;
}

export interface MemoryItem {
    id: string;
    content: string;
    timestamp: number;
}

export interface AiChatSettings {
    personalization: PersonalizationSettings;
    memoryEnabled: boolean;
    memoryItems: MemoryItem[];
}