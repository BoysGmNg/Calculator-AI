import { GoogleGenAI, Part } from "@google/genai";
import { ChatMessage, AiModel, AiChatSettings } from '../types';

// Add a global declaration for the puter.js library
declare global {
    interface Window {
        puter: any;
    }
}

// --- Model Definitions ---
export const MODELS: AiModel[] = [
    { id: 'gemini-2.5-flash', name: 'Gemini Flash', provider: 'Google', description: 'Google\'s fastest and most versatile model, ideal for multimodal tasks, general conversation, and speed-sensitive applications.', supportsImages: true },
    { id: 'nvidia/nemotron-nano-9b-v2:free', name: 'Nemotron Nano V2', provider: 'OpenRouter', description: 'NVIDIA\'s efficient model, fine-tuned for high-quality synthetic data generation and strong reasoning capabilities.', supportsImages: false },
    { id: 'x-ai/grok-4-fast:free', name: 'Grok 4 Fast', provider: 'OpenRouter', description: 'X AI\'s powerful model, known for its extensive knowledge base, unique personality, and proficiency in complex reasoning tasks.', supportsImages: false },
    { id: 'openrouter:anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Puter', description: 'A balanced model from Anthropic, excelling in creative writing, long-context understanding, and maintaining a helpful, safe tone.', supportsImages: false },
    { id: 'deepseek-chat', name: 'Deepseek Chat', provider: 'Puter', description: 'A strong, open-source model that provides excellent performance in general chat, coding assistance, and instruction following.', supportsImages: false },
    { id: 'deepseek-reasoner', name: 'Deepseek Reasoner', provider: 'Puter', description: 'Specialized for advanced, step-by-step reasoning. Ideal for complex math, logic puzzles, and planning tasks.', supportsImages: false },
];

// --- Gemini (Google) Setup ---
const geminiApiKey = process.env.API_KEY;
if (!geminiApiKey) {
    console.warn("Gemini API_KEY not set. Gemini chat will not work.");
}
const ai = new GoogleGenAI({ apiKey: geminiApiKey! });

// --- OpenRouter Setup ---
// FIX: Add a hardcoded fallback for the OpenRouter API key to ensure functionality
// even if the environment variable injection from the build process fails.
const openRouterApiKey = process.env.OPENROUTER_API_KEY || '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';
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

if (!openRouterApiKey) {
    console.warn("OpenRouter API key not set. OpenRouter models will not work.");
}

// --- Main Chat Function ---

interface ChatStreamOptions {
    model: AiModel;
    history: ChatMessage[];
    settings: AiChatSettings;
}

const CONTEXT_MESSAGE_LIMIT = 20; // Limit to the last 20 messages to manage token usage

const constructSystemPrompt = (settings: AiChatSettings): string => {
    // Start with the specific formatting rules requested by the user.
    let prompt = `
You are an expert in mathematics and a clear communicator. You MUST follow these formatting rules strictly in your responses:
1.  **Mathematical Expressions**: For any math, use the specified plain text format. The user's application will render it correctly.
    *   **Exponents/Superscripts**: Use caret (^) and curly braces for grouping. Examples: \`x^2\`, \`(x+y)^2\`, \`e^{i*pi}\`.
    *   **Subscripts**: Use underscore (_) and curly braces for grouping. Examples: \`y_1\`, \`log_{10}(100)\`, \`x_{i+1}\`.
    *   **Fractions**: Use \`frac(numerator)(denominator)\`. Example: for (a+b)/(c-d), write \`frac(a+b)(c-d)\`. For d²f/dx², write \`frac(d^2f)(dx^2)\`.
    *   **Square Roots**: Use \`sqrt(content)\`. Example: \`sqrt(x^2 - 4ac)\`.
    *   **Nth Roots**: Use \`root(n)(content)\`. Example: for ³√27, write \`root(3)(27)\`.
    *   **Summation (Sigma)**: Use \`sum_{from}^{to}(expression)\`. Example: for ∑ from i=1 to n of xᵢ, write \`sum_{i=1}^{n}(x_i)\`.
    *   **Product (Pi)**: Use \`prod_{from}^{to}(expression)\`. Example: for ∏ from j=1 to k of pⱼ, write \`prod_{j=1}^{k}(p_j)\`.
    *   **Integrals**: Use \`int_{from}^{to}(expression) d_variable\`. Example: for ∫ from 0 to 1 of x² dx, write \`int_{0}^{1}(x^2)dx\`. For double integral ∫∫ over D of f(x,y) dA, write \`int_{D}^{}(f(x,y))dA\`.
    *   **Limits**: Use \`lim_{variable -> value}(expression)\`. Example: for lim x->0 of (sin(x)/x), write \`lim_{x -> 0}(frac(sin(x))(x))\`.
    *   **Special Symbols**: Use keywords for symbols.
        - Greek letters: \`alpha\`, \`beta\`, \`gamma\`, \`Gamma\`, \`delta\`, \`Delta\`, \`pi\`, \`Pi\`, \`sigma\`, \`Sigma\`, etc.
        - Operators: \`pm\` (for ±), \`neq\` (for ≠), \`cdot\` (for ·), \`->\` (for →).
        - Set Theory: \`in\` (for ∈), \`notin\` (for ∉), \`subset\` (for ⊂), \`supset\` (for ⊃).
        - Logic: \`forall\` (for ∀), \`exists\` (for ∃).
        - Constants: \`inf\` (for ∞).
2.  **Tables**: Use markdown tables ONLY for comparing and contrasting information in a structured way. Do not use tables for lists. Table headers must be bold.
3.  **Lists**: Use standard markdown numbered or bulleted lists for sequential steps or items.
4.  **Matrices & Systems of Equations**: Use markdown tables to represent matrices and systems of equations for clear alignment. Enclose the system of equations with a single large curly brace at the start of the first line.

Example of a complex formula (Quadratic): \`x = frac(-b pm sqrt(b^2 - 4ac))(2a)\`

If the user provides a malformed or incomplete mathematical expression, identify it, explain the correction, and then provide the answer using the corrected expression. Recognize common shorthands or typos, for example, the user might type 'A t' or 'dt' to mean 'Δt' (Delta t).
`;
    const { personalization, memoryEnabled, memoryItems } = settings;

    if (personalization && personalization.enabled) {
        prompt += "\n--- Start of Custom Instructions ---\n";
        if (personalization.nickname) prompt += `The user's nickname is ${personalization.nickname}.\n`;
        if (personalization.job) prompt += `The user works as a ${personalization.job}.\n`;
        if (personalization.about) prompt += `About the user: ${personalization.about}\n`;
        if (personalization.customInstructions) prompt += `Follow these instructions: ${personalization.customInstructions}\n`;
        prompt += "--- End of Custom Instructions ---\n\n";
    }

    if (memoryEnabled && memoryItems.length > 0) {
        prompt += "--- Start of Memory ---\n";
        prompt += "Remember the following facts and context:\n";
        memoryItems.forEach(item => {
            prompt += `- ${item.content}\n`;
        });
        prompt += "--- End of Memory ---\n\n";
    }

    return prompt.trim();
};


/**
 * Handles streaming chat with the selected AI model.
 * Returns a ReadableStream of Uint8Array chunks.
 */
export async function getChatStream({ model, history, settings }: ChatStreamOptions): Promise<ReadableStream<Uint8Array>> {
    const systemPrompt = constructSystemPrompt(settings);
    
    const lastMessage = history[history.length - 1];
    if (lastMessage.file && lastMessage.file.mimeType.startsWith('image/') && !model.supportsImages) {
        throw new Error(`The selected model (${model.name}) does not support image uploads.`);
    }

    const truncatedHistory = history.length > CONTEXT_MESSAGE_LIMIT
        ? history.slice(history.length - CONTEXT_MESSAGE_LIMIT)
        : history;

    if (model.provider === 'Google') {
        return streamWithGemini(truncatedHistory, systemPrompt);
    } else if (model.provider === 'OpenRouter') {
        return streamWithOpenRouter(model.id, truncatedHistory, systemPrompt);
    } else if (model.provider === 'Puter') {
        return streamWithPuter(model.id, truncatedHistory, systemPrompt);
    } else {
        throw new Error(`Unsupported model provider: ${model.provider}`);
    }
}


// --- Gemini Implementation ---
async function streamWithGemini(history: ChatMessage[], systemPrompt: string): Promise<ReadableStream<Uint8Array>> {
    if (!geminiApiKey) {
        throw new Error("Gemini API key is not configured.");
    }
    
    const geminiHistory = history.slice(0, -1).map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }] // Note: Old history items with images aren't handled here, simplifying for single-turn image context
    }));

    const lastMessage = history[history.length - 1];
    if (lastMessage.role !== 'user') {
        throw new Error("Last message must be from the user.");
    }

    const userParts: Part[] = [];
    let userPrompt = lastMessage.content;
    
    if (lastMessage.file) {
        if (lastMessage.file.mimeType.startsWith('image/')) {
            userParts.push({
                inlineData: {
                    mimeType: lastMessage.file.mimeType,
                    data: lastMessage.file.data
                }
            });
        } else { // It's a text file
            userPrompt = `The user has uploaded a file named "${lastMessage.file.name}" with the following content:\n\n---\n${lastMessage.file.data}\n---\n\nNow, regarding this file, the user's prompt is:\n\n${lastMessage.content}`;
        }
    }
    userParts.push({ text: userPrompt });

    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        history: geminiHistory,
        config: {
            systemInstruction: systemPrompt,
            temperature: 0.03,
            tools: [{ googleSearch: {} }],
        },
    });
    
    const result = await chat.sendMessageStream({ message: userParts });
    const encoder = new TextEncoder();
    const allGroundingChunks: any[] = [];

    return new ReadableStream<Uint8Array>({
        async start(controller) {
            try {
                for await (const chunk of result) {
                    if (chunk.text) {
                        controller.enqueue(encoder.encode(chunk.text));
                    }
                    const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
                    if (groundingChunks) {
                        allGroundingChunks.push(...groundingChunks);
                    }
                }

                if (allGroundingChunks.length > 0) {
                    const uniqueSources = Array.from(new Map(allGroundingChunks.map(item => [item.web.uri, item])).values());
                    
                    let sourcesText = '\n\n---\n**Sources:**\n';
                    uniqueSources.forEach((source, index) => {
                        const title = source.web.title?.trim() || source.web.uri;
                        const uri = source.web.uri;
                        sourcesText += `${index + 1}. [${title}](${uri})\n`;
                    });
                    controller.enqueue(encoder.encode(sourcesText));
                }
                
                controller.close();
            } catch (error) {
                console.error("Error in Gemini stream", error);
                controller.error(error);
            }
        }
    });
}

// --- OpenRouter Implementation ---
async function streamWithOpenRouter(modelId: string, history: ChatMessage[], systemPrompt: string): Promise<ReadableStream<Uint8Array>> {
    if (!openRouterApiKey) {
        throw new Error("OpenRouter API key is not configured.");
    }

    // FIX: Map 'model' role to 'assistant' for OpenRouter API compatibility.
    let openRouterHistory: {role: string; content: string | any[]}[] = history.map(msg => {
        let content: string | any[] = msg.content;
        
        // Handle potential file in the last user message for text-based prepending
        if (msg.role === 'user' && msg.file && !msg.file.mimeType.startsWith('image/')) {
            content = `The user has uploaded a file named "${msg.file.name}" with the following content:\n\n---\n${msg.file.data}\n---\n\nNow, regarding this file, the user's prompt is:\n\n${msg.content}`;
        }
        
        return {
            role: msg.role === 'model' ? 'assistant' : msg.role,
            content: content
        };
    });

    if (systemPrompt) {
        openRouterHistory.unshift({ role: 'system', content: systemPrompt });
    }
    
    const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${openRouterApiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ai.studio/",
            "X-Title": "Gemini Universal Calculator AI",
        },
        body: JSON.stringify({
            model: modelId,
            messages: openRouterHistory,
            stream: true,
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        try {
            const errorJson = JSON.parse(errorText);
            const errorMessage = errorJson?.error?.message || 'An unknown error occurred.';
            
            if (response.status === 429) {
                 // A more user-friendly message for rate limiting
                throw new Error("You've reached the daily limit for free models on OpenRouter. Please try again tomorrow or consider adding credits to your OpenRouter account for higher limits.");
            }
            
            throw new Error(`OpenRouter API Error: ${errorMessage}`);
        } catch (e) {
            // If parsing fails, fall back to the original error format
            throw new Error(`OpenRouter API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }
    }

    if (!response.body) {
        throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    
    return new ReadableStream<Uint8Array>({
        async pull(controller) {
            while (true) {
                try {
                    const { done, value } = await reader.read();
                    if (done) {
                        controller.close();
                        break;
                    }
                    const textChunk = decoder.decode(value, { stream: true });
                    const lines = textChunk.split('\n').filter(line => line.trim().startsWith('data:'));

                    for (const line of lines) {
                        const jsonStr = line.replace('data: ', '');
                        if (jsonStr.trim() === '[DONE]') continue;
                        
                        try {
                            const chunk = JSON.parse(jsonStr);
                            if (chunk.choices && chunk.choices[0].delta.content) {
                                controller.enqueue(encoder.encode(chunk.choices[0].delta.content));
                            }
                        } catch (e) {
                           // This can happen if a chunk is incomplete, just wait for the next one
                           console.warn("Could not parse stream chunk:", jsonStr, e);
                        }
                    }
                } catch (error) {
                    console.error("Error reading from OpenRouter stream", error);
                    controller.error(error);
                    break;
                }
            }
        }
    });
}

// --- Puter.js Implementation ---
async function streamWithPuter(modelId: string, history: ChatMessage[], systemPrompt: string): Promise<ReadableStream<Uint8Array>> {
    if (typeof window.puter === 'undefined' || typeof window.puter.ai === 'undefined') {
        throw new Error("Puter.js library is not loaded or initialized.");
    }

    const lastMessage = history[history.length - 1];
    if (lastMessage.file && lastMessage.file.mimeType.startsWith('image/')) {
        throw new Error(`The selected model (${modelId}) does not support image uploads.`);
    }

    // FIX: Reformat the prompt into a standard conversational log for better model comprehension.
    // Instead of a custom "System Instructions" block, integrate it as context at the beginning.
    const promptParts: string[] = [];

    if (systemPrompt) {
        // Add system instructions as the initial context without any special headers.
        promptParts.push(systemPrompt);
    }

    history.forEach(msg => {
        let content = msg.content;
        if (msg.role === 'user' && msg.file && !msg.file.mimeType.startsWith('image/')) {
            // Prepend file context clearly to the user's message.
            content = `The user has uploaded a file named "${msg.file.name}" with the following content:\n\n---\n${msg.file.data}\n---\n\nNow, regarding this file, the user's prompt is:\n\n${msg.content}`;
        }
        // Use standard "User:" and "Assistant:" roles.
        const role = msg.role === 'model' ? 'Assistant' : 'User';
        promptParts.push(`${role}: ${content}`);
    });

    const fullPrompt = promptParts.join('\n\n');

    try {
        const chatResponse = await window.puter.ai.chat(fullPrompt, {
            model: modelId,
            stream: true
        });

        const encoder = new TextEncoder();
        
        return new ReadableStream<Uint8Array>({
            async start(controller) {
                try {
                    for await (const part of chatResponse) {
                        if (part?.text) {
                            controller.enqueue(encoder.encode(part.text));
                        }
                    }
                    controller.close();
                } catch (error) {
                    console.error("Error in Puter.js stream", error);
                    controller.error(error);
                }
            }
        });

    } catch (error: any) {
        console.error("Error calling Puter.js AI API:", JSON.stringify(error, null, 2));
        let customMessage = 'An unknown error occurred with the Puter.js AI service.';
        if (error?.error?.delegate === 'usage-limited-chat' || (error?.message && error.message.includes('Permission denied'))) {
            customMessage = "The free daily limit for this model has been reached. Please try again tomorrow or select a different model.";
        } else if (error?.message) {
            customMessage = error.message;
        }
    
        throw new Error(customMessage);
    }
}