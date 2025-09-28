
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiResponse } from '../types';

const GEMINI_MODEL = 'gemini-2.5-flash';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        result: {
            type: Type.STRING,
            description: "The final numerical or short text answer. No extra words or commentary."
        },
        explanation: {
            type: Type.STRING,
            description: "A clear and user-friendly sentence explaining how the result was calculated. This should be easy for anyone to understand."
        }
    },
    required: ["result", "explanation"]
};


export const calculateWithGemini = async (query: string): Promise<GeminiResponse> => {
    try {
        const systemInstruction = `
            You are a highly advanced calculator. Your sole purpose is to evaluate mathematical expressions, perform unit conversions, handle currency conversions, solve complex word problems, solve simple algebraic equations, and perform basic data analysis, then return the result in a structured JSON format.

            Strictly adhere to the following rules:
            1. **Primary Goal**: Calculate the final answer for the user's query. This includes:
                - **Algebra**: Solving for variables (e.g., 'solve 2x + 5 = 15 for x' should result in 'x = 5').
                - **Data Analysis**: Calculating statistical values (e.g., 'average of 1, 2, 3, 4, 5' should result in '3').
            2. **Output Format**: ALWAYS respond with a JSON object that matches the provided schema.
            3. **Result Value**: The "result" value must be only the final numerical answer or a short, direct text answer. Do not add any extra words, prefixes, or commentary. For example, if the answer is 42, the value should be "42", not "The answer is 42".
            4. **Explanation Value**: The "explanation" must be a clear, user-friendly, and complete sentence describing how the result was obtained. It should be easy for a non-technical person to understand. For example, for 'what is 15% of 200', a good explanation is "Calculated 15 percent of 200." For a currency conversion, it could be "Converted 100 US Dollars to Euros based on current exchange rates." The explanation must always be populated with a meaningful description.
            5. **Error Handling**: If the query is nonsensical, cannot be calculated, or is not a calculation/conversion request, respond with JSON where "result" is "Error" and "explanation" is "Invalid query."
            
            Do not deviate from this JSON format.
        `;

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: query,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema,
                temperature: 0,
            },
        });

        const jsonText = response.text.trim();
        const parsedResponse: GeminiResponse = JSON.parse(jsonText);
        return parsedResponse;
        
    } catch (error: any) {
        console.error('Error calling Gemini API:', error);
        if (error.toString().includes('RESOURCE_EXHAUSTED')) {
            return { result: 'Error', explanation: 'API rate limit exceeded. Please try again in a moment.' };
        }
        return { result: 'Error', explanation: 'Failed to communicate with the API.' };
    }
};

export const getAvailableCurrencies = async (): Promise<{symbol: string, name: string}[]> => {
    try {
        const systemInstruction = `
            You are a currency data provider. Your only task is to return a list of major world currencies.
            Respond ONLY with a valid JSON object matching the provided schema.
            The list should include at least USD, EUR, JPY, GBP, AUD, CAD, CHF, CNH, HKD, NZD.
            Sort the list alphabetically by currency name.
        `;
        const schema = {
            type: Type.OBJECT,
            properties: {
                currencies: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            symbol: { type: Type.STRING, description: "The 3-letter currency symbol (e.g., USD)." },
                            name: { type: Type.STRING, description: "The full name of the currency (e.g., United States Dollar)." }
                        },
                        required: ["symbol", "name"]
                    }
                }
            },
            required: ["currencies"]
        };
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: "List major world currencies.",
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0,
            },
        });
        const jsonText = response.text.trim();
        const parsedResponse = JSON.parse(jsonText);
        return parsedResponse.currencies;
    } catch (error) {
        console.error('Error fetching currencies from Gemini:', error);
        // Provide a fallback list on error
        return [
            { name: 'US Dollar', symbol: 'USD' },
            { name: 'Euro', symbol: 'EUR' },
            { name: 'Japanese Yen', symbol: 'JPY' },
            { name: 'British Pound', symbol: 'GBP' },
        ];
    }
};

export const getCurrencyRate = async (from: string, to: string): Promise<number> => {
    try {
        const systemInstruction = `
            You are a currency conversion rate provider. Your only task is to provide the conversion rate from one currency to another based on the latest available data.
            The user will provide a "from" and "to" currency.
            You must respond with a JSON object containing only the numerical conversion rate.
            For example, if 1 USD = 0.92 EUR, and the user asks for USD to EUR, the result should be 0.92.
        `;
        const schema = {
            type: Type.OBJECT,
            properties: {
                rate: {
                    type: Type.NUMBER,
                    description: "The numerical conversion rate. For example, if 1 FROM = X TO, this value is X."
                }
            },
            required: ["rate"]
        };
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: `What is the conversion rate from ${from} to ${to}?`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0,
            },
        });
        const jsonText = response.text.trim();
        const parsedResponse = JSON.parse(jsonText);
        return parsedResponse.rate;
    } catch (error) {
        console.error(`Error fetching rate for ${from} to ${to} from Gemini:`, error);
        return 0;
    }
};


export const checkForLocationIntent = async (query: string): Promise<{ needsLocation: boolean }> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            needsLocation: {
                type: Type.BOOLEAN,
                description: "Set to true if the query asks about real-time, location-specific information like local weather, nearby traffic, or things 'around me'. Otherwise, set to false."
            }
        },
        required: ["needsLocation"]
    };

    try {
        const systemInstruction = `
            You are an intent detection system. Analyze the user's query. Your only task is to determine if the query requires the user's current geographical location to be answered accurately and in real-time.

            Examples that NEED location:
            - "What's the weather like?"
            - "How is the traffic nearby?"
            - "show me restaurants around here"
            - "cuaca hari ini" (Indonesian for "today's weather")
            - "lalu lintas di jakarta" (This specifies a city, but for real-time traffic, current location within the city is best. So, it needs location).

            Examples that DO NOT need location:
            - "What is the capital of France?"
            - "Explain quantum physics."
            - "What was the weather like yesterday in Tokyo?" (historical, not real-time)
            - "Tell me a story."

            Respond ONLY with a valid JSON object matching the provided schema.
        `;

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: query,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0,
            },
        });

        const jsonText = response.text.trim();
        const parsedResponse = JSON.parse(jsonText);
        return parsedResponse;

    } catch (error: any) {
        console.error('Error in checkForLocationIntent:', error);
        if (error.toString().includes('RESOURCE_EXHAUSTED')) {
            throw new Error('API rate limit exceeded while checking for location.');
        }
        return { needsLocation: false }; // Default to not needing location on error
    }
};

export interface VoiceInputClassification {
    intent: 'calculate' | 'ask_ai' | 'unknown';
    content: string;
}

const classificationSchema = {
    type: Type.OBJECT,
    properties: {
        intent: {
            type: Type.STRING,
            description: "The user's intent. Must be 'calculate' for math expressions or 'ask_ai' for general questions.",
            enum: ['calculate', 'ask_ai', 'unknown']
        },
        content: {
            type: Type.STRING,
            description: "If 'calculate', the mathematical expression as a string. If 'ask_ai', the full user question. If 'unknown', the original query."
        }
    },
    required: ["intent", "content"]
};

export const classifyVoiceInput = async (query: string): Promise<VoiceInputClassification> => {
    try {
        const systemInstruction = `
            You are a voice command classifier for a calculator app. Your task is to determine if the user's query is a mathematical calculation or a general question intended for an AI assistant.

            Rules:
            1.  **If the query is a clear mathematical problem, unit conversion, or anything that can be directly computed**, set the intent to 'calculate' and extract the precise mathematical expression into the 'content' field.
                - Examples: "what is 5 times 5", "square root of 81", "25% of 200", "how many dollars is 50 euros"
            2.  **If the query is a general knowledge question, a request for explanation, or a conversational statement**, set the intent to 'ask_ai' and put the entire, unmodified query into the 'content' field.
                - Examples: "explain the theory of relativity", "tell me a joke", "siapa presiden indonesia saat ini?", "how does photosynthesis work?"
            3.  **If the query is ambiguous or nonsensical**, set the intent to 'unknown' and the content to the original query.
            4.  **Respond ONLY with a valid JSON object matching the provided schema.**

            Examples:
            - User Input: "what is five hundred divided by two" -> Output: { "intent": "calculate", "content": "500 / 2" }
            - User Input: "show me a graph of x squared" -> Output: { "intent": "ask_ai", "content": "show me a graph of x squared" }
            - User Input: "jelaskan cara kerja fotosintesis" -> Output: { "intent": "ask_ai", "content": "jelaskan cara kerja fotosintesis" }
            - User Input: "hello how are you" -> Output: { "intent": "ask_ai", "content": "hello how are you" }
        `;
        
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: query,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: classificationSchema,
                temperature: 0,
            }
        });

        const jsonText = response.text.trim();
        const parsedResponse: VoiceInputClassification = JSON.parse(jsonText);
        return parsedResponse;

    } catch (error: any) {
        console.error('Error in classifyVoiceInput:', error);
        if (error.toString().includes('RESOURCE_EXHAUSTED')) {
            throw new Error('API rate limit exceeded. Please wait a moment and try your command again.');
        }
        // Fallback on error to treat as unknown
        return { intent: 'unknown', content: query };
    }
};
