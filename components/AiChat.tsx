import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, AiModel, AiChatSettings, PersonalizationSettings, Conversation } from '../types';
import { getChatStream, MODELS } from '../services/aiChatService';
import { checkForLocationIntent } from '../services/geminiService';
import PersonalizationModal from './PersonalizationModal';
import MemoryManagementModal from './MemoryManagementModal';
import ChatHistoryModal from './ChatHistoryModal';

// --- Preview Modal Component ---
interface PreviewModalProps {
    imageUrl: string;
    onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ imageUrl, onClose }) => {
    return (
        <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center transition-opacity animate-fade-in"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div
                className="relative max-w-4xl max-h-[90vh] p-4"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute -top-2 -right-2 bg-white/20 text-white rounded-full h-8 w-8 flex items-center justify-center text-lg z-10 hover:bg-white/40"
                    aria-label="Close image preview"
                >
                    &times;
                </button>
                <img src={imageUrl} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
            </div>
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out;
                }
            `}</style>
        </div>
    );
};


const SETTINGS_STORAGE_KEY = 'ai-chat-settings';
const MASTER_HISTORY_KEY = 'ai-chat-master-history';
type MasterHistory = Record<string, Conversation[]>;

const DEFAULT_PERSONALIZATION: PersonalizationSettings = {
    enabled: false,
    customInstructions: '',
    nickname: '',
    job: '',
    about: '',
};

const DEFAULT_SETTINGS: AiChatSettings = {
    personalization: DEFAULT_PERSONALIZATION,
    memoryEnabled: false,
    memoryItems: [],
};

const TypingIndicator = () => (
    <div className="flex items-center space-x-1.5 p-3">
        <style>{`
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
            }
            .animate-bounce-custom > div { animation: bounce 1s infinite; }
        `}</style>
        <div className="animate-bounce-custom flex items-center space-x-1.5">
            <div className="w-2 h-2 rounded-full bg-[--color-textSecondary]" style={{ animationDelay: '-0.3s' }}></div>
            <div className="w-2 h-2 rounded-full bg-[--color-textSecondary]" style={{ animationDelay: '-0.15s' }}></div>
            <div className="w-2 h-2 rounded-full bg-[--color-textSecondary]"></div>
        </div>
    </div>
);

const formatMathExpressions = (text: string): string => {
    let result = text;
    
    // This function is called before other markdown inline formatting.
    // The order of replacement matters. Complex structures first.

    // Sum/Int/Prod: sum_{lower}^{upper}(expr)
    result = result.replace(/(sum|int|prod)_\{(.*?)\}\^\{(.*?)\}\s*\((.*?)\)/g, (_match, op, lower, upper, expr) => {
        const opSymbol = { sum: '∑', int: '∫', prod: '∏' }[op];
        return `
          <span class="large-op">
            <span class="op-symbol">${opSymbol}</span>
            <span class="limits">
              <span class="upper">${upper}</span>
              <span class="lower">${lower}</span>
            </span>
            <span class="expression">${expr}</span>
          </span>
        `;
    });
     // Sum/Int/Prod without upper limit: int_{D}^{}(f(x,y))dA
     result = result.replace(/(sum|int|prod)_\{(.*?)\}\^\{\}\s*\((.*?)\)/g, (_match, op, lower, expr) => {
        const opSymbol = { sum: '∑', int: '∫', prod: '∏' }[op];
        // Special case for double integral symbol
        const displaySymbol = (op === 'int' && expr.startsWith('int')) ? '∬' : opSymbol;
        const displayExpr = expr.startsWith('int') ? expr.substring(3) : expr;
        return `
          <span class="large-op">
            <span class="op-symbol">${displaySymbol}</span>
            <span class="limits-single">
              <span class="lower">${lower}</span>
            </span>
            <span class="expression">${displayExpr}</span>
          </span>
        `;
    });

    // Limits: lim_{var->val}(expr)
    result = result.replace(/lim_\{(.*?)\}\s*\((.*?)\)/g, `
        <span class="limit">
            <span class="op">lim</span>
            <span class="sub">$1</span>
        </span>
        <span class="expression">$2</span>
    `);

    // Fractions: frac(numerator)(denominator)
    result = result.replace(/frac\((.*?)\)\((.*?)\)/g, `
      <span class="fraction">
        <span class="numerator">$1</span>
        <span class="denominator">$2</span>
      </span>
    `);

    // Nth Roots: root(n)(x) -> ⁿ√(x)
    result = result.replace(/root\((\d+)\)\(([^)]+)\)/g, (_match, n, x) => {
        const superscripts: {[key: string]: string} = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
        const nSup = n.toString().split('').map((char: string) => superscripts[char] || char).join('');
        return `${nSup}√(${x})`;
    });
    
    // Square Roots with overline: sqrt(content) -> √( content )
    result = result.replace(/sqrt\(([^)]+)\)/g, '√<span style="border-top: 1px solid currentColor; padding: 0 2px;">$1</span>');

    // Exponents: x^2, x^-1, x^{a+b}, (x+1)^2
    result = result.replace(/(\w+|\([^)]+\))\^\{([^}]+)\}/g, '$1<sup>$2</sup>');
    result = result.replace(/(\w+|\([^)]+\))\^(-?[\w.]+)/g, '$1<sup>$2</sup>');
    
    // Subscripts: y_1, y_{i+1}
    result = result.replace(/(\w+)\_\{([^}]+)\}/g, '$1<sub>$2</sub>');
    result = result.replace(/(\w+)\_(\w+)/g, '$1<sub>$2</sub>');
    
    // Symbols (keywords to unicode)
    const symbols: { [key: string]: string } = {
      'alpha': 'α', 'beta': 'β', 'gamma': 'γ', 'Gamma': 'Γ', 'delta': 'δ', 'Delta': 'Δ',
      'epsilon': 'ε', 'zeta': 'ζ', 'eta': 'η', 'theta': 'θ', 'Theta': 'Θ', 'iota': 'ι',
      'kappa': 'κ', 'lambda': 'λ', 'Lambda': 'Λ', 'mu': 'μ', 'nu': 'ν', 'xi': 'ξ',
      'Xi': 'Ξ', 'pi': 'π', 'Pi': 'Π', 'rho': 'ρ', 'sigma': 'σ', 'Sigma': 'Σ',
      'tau': 'τ', 'upsilon': 'υ', 'phi': 'φ', 'Phi': 'Φ', 'chi': 'χ', 'psi': 'ψ',
      'Psi': 'Ψ', 'omega': 'ω', 'Omega': 'Ω',
      'pm': '±', 'neq': '≠', 'in': '∈', 'notin': '∉', 'subset': '⊂', 'supset': '⊃',
      'subseteq': '⊆', 'supseteq': '⊇', 'forall': '∀', 'exists': '∃', 'nabla': '∇',
      'partial': '∂', 'inf': '∞', 'cdot': '·'
    };
    result = result.replace(new RegExp(`\\b(${Object.keys(symbols).join('|')})\\b|(!=)|(\\+/-)|(->)`, 'g'), (match) => {
        if (match === '!=') return '≠';
        if (match === '+/-') return '±';
        if (match === '->') return '→';
        return symbols[match as keyof typeof symbols] || match;
    });

    return result;
}


const parseMarkdown = (text: string): string => {
    // 1. Isolate and format code blocks first to protect them from other markdown processing.
    const codePlaceholders: string[] = [];
    let placeholderId = 0;
    let processedText = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const escapedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const htmlBlock = `<pre class="bg-black/20 p-3 my-2 rounded-lg overflow-x-auto"><code class="language-${lang} font-mono text-sm">${escapedCode}</code></pre>`;
        const placeholder = `__CODEBLOCK_${placeholderId}__`;
        codePlaceholders[placeholderId] = htmlBlock;
        placeholderId++;
        return placeholder;
    });

    // 2. Isolate and format markdown tables.
    const tablePlaceholders: string[] = [];
    let tablePlaceholderId = 0;
    // FIX: Improved regex to correctly capture header, separator, and body, including newlines.
    const tableRegex = /(^\|[^\n]+\|\r?\n)((?:\|:?--:?)+\|\r?\n)((?:\|[^\n]+\|\r?\n?)*)/gm;

    const processInline = (str: string) => str
        .replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>')
        .replace(/(\*|_)(.*?)\1/g, '<em>$2</em>')
        .replace(/`([^`]+)`/g, '<code class="bg-black/20 text-[--color-accent] px-1 py-0.5 rounded text-xs font-mono">$1</code>');

    processedText = processedText.replace(tableRegex, (match, headerLine, separatorLine, bodyLines) => {
        // FIX: Enhanced table styling to be theme-aware and more elegant.
        let tableHtml = `<table class="w-full my-2 border-collapse text-sm" style="border: 1px solid var(--color-buttonBackground);">`;
        
        const headers = headerLine.split('|').slice(1, -1).map(h => h.trim());
        tableHtml += `<thead style="background-color: var(--color-buttonBackground);"><tr>`;
        headers.forEach(header => {
            tableHtml += `<th class="p-2 text-left font-semibold" style="border: 1px solid var(--color-displayBackground);">${processInline(header)}</th>`;
        });
        tableHtml += '</tr></thead>';
        
        tableHtml += '<tbody>';
        const rows = bodyLines.trim().split('\n');
        rows.forEach(rowLine => {
            if (!rowLine.trim()) return;
            const cells = rowLine.split('|').slice(1, -1).map(c => c.trim());
            tableHtml += `<tr class="border-t" style="border-color: var(--color-buttonBackground);">`;
            cells.forEach(cell => {
                tableHtml += `<td class="p-2" style="border: 1px solid var(--color-displayBackground);">${processInline(cell)}</td>`;
            });
            tableHtml += '</tr>';
        });
        tableHtml += '</tbody></table>';

        const placeholder = `__TABLE_${tablePlaceholderId}__`;
        tablePlaceholders[tablePlaceholderId] = tableHtml;
        tablePlaceholderId++;
        return placeholder;
    });

    // 3. Process block-level elements (lists, headings).
    const lines = processedText.split('\n');
    const newLines = [];
    let inList = null; // null, 'ul', or 'ol'
    
    for (const line of lines) {
        const headingMatch = line.match(/^(#{1,6})\s(.*)/);
        if (headingMatch) {
            if (inList) { newLines.push(`</${inList}>`); inList = null; }
            const level = headingMatch[1].length;
            const sizes = ['text-xl', 'text-lg', 'text-base', 'text-base', 'text-sm', 'text-sm'];
            newLines.push(`<h${level} class="font-bold ${sizes[level - 1]} mt-2 mb-1">${headingMatch[2]}</h${level}>`);
            continue;
        }

        const ulMatch = line.match(/^[\*\-]\s(.*)/);
        if (ulMatch) {
            if (inList !== 'ul') {
                if (inList === 'ol') newLines.push('</ol>');
                newLines.push('<ul class="list-disc list-inside space-y-1 my-1 pl-2">');
                inList = 'ul';
            }
            newLines.push(`<li>${ulMatch[1]}</li>`);
            continue;
        }

        const olMatch = line.match(/^\d+\.\s(.*)/);
        if (olMatch) {
            if (inList !== 'ol') {
                if (inList === 'ul') newLines.push('</ul>');
                newLines.push('<ol class="list-decimal list-inside space-y-1 my-1 pl-2">');
                inList = 'ol';
            }
            newLines.push(`<li>${olMatch[1]}</li>`);
            continue;
        }
        
        if (inList) { newLines.push(`</${inList}>`); inList = null; }
        newLines.push(line);
    }
    if (inList) newLines.push(`</${inList}>`);

    let html = newLines.join('\n');
    
    // NEW STEP: Format mathematical expressions before handling markdown inline elements
    html = formatMathExpressions(html);

    // 4. Process remaining inline elements.
    html = html
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
            const safeUrl = url.trim().startsWith('javascript:') ? '#' : url;
            return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-[--color-accent] hover:underline">${text}</a>`;
        })
        .replace(/(\*\*\*|___)(.*?)\1/g, '<strong><em>$2</em></strong>')
        .replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>')
        .replace(/(\*|_)(.*?)\1/g, '<em>$2</em>')
        .replace(/~~(.*?)~~/g, '<del>$1</del>')
        .replace(/`([^`]+)`/g, '<code class="bg-black/20 text-[--color-accent] px-1 py-0.5 rounded text-sm font-mono">$1</code>')
        .replace(/\n/g, '<br />');

    // 5. Clean up extra <br /> tags around block elements.
    html = html.replace(/(<\/(?:h[1-6]|ul|ol|li|table)>)<br \/>/g, '$1');
    html = html.replace(/<br \/>(<(?:h[1-6]|ul|ol|li|table))/g, '$1');
    
    // 6. Restore placeholders.
    for (let i = 0; i < tablePlaceholders.length; i++) {
        const placeholderRegex = new RegExp(`(?:<br\\s*\\/?>)?\\s*__TABLE_${i}__\\s*(?:<br\\s*\\/?>)?`, 'g');
        html = html.replace(placeholderRegex, tablePlaceholders[i]);
    }
    for (let i = 0; i < codePlaceholders.length; i++) {
        const placeholderRegex = new RegExp(`(?:<br\\s*\\/?>)?\\s*__CODEBLOCK_${i}__\\s*(?:<br\\s*\\/?>)?`, 'g');
        html = html.replace(placeholderRegex, codePlaceholders[i]);
    }
    
    return html;
};

interface AiChatProps {
    initialState?: { modelId: string; prompt: string; } | null;
    onPromptSent?: () => void;
}

const AiChat: React.FC<AiChatProps> = ({ initialState, onPromptSent }) => {
    const [selectedModel, setSelectedModel] = useState<AiModel>(MODELS[0]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadedFile, setUploadedFile] = useState<{ data: string; mimeType: string; name: string; type: 'image' | 'text' } | null>(null);
    const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
    const initialMount = useRef(true);
    const loadSpecificChat = useRef<{ modelId: string, conversationId: string } | null>(null);
    
    // Settings state
    const [showPersonalization, setShowPersonalization] = useState(false);
    const [showMemory, setShowMemory] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [aiSettings, setAiSettings] = useState<Record<string, AiChatSettings>>({});
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // --- Data Loading and Saving ---

    const getMasterHistory = useCallback((): MasterHistory => {
        try {
            const saved = localStorage.getItem(MASTER_HISTORY_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error("Failed to load master history:", error);
            return {};
        }
    }, []);

    const saveMasterHistory = useCallback((history: MasterHistory) => {
        try {
            localStorage.setItem(MASTER_HISTORY_KEY, JSON.stringify(history));
        } catch (error) {
            console.error("Failed to save master history:", error);
        }
    }, []);

    // Load settings on mount
    useEffect(() => {
        try {
            const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
            setAiSettings(savedSettings ? JSON.parse(savedSettings) : {});
        } catch (error) {
            console.error("Failed to load AI settings:", error);
            setAiSettings({});
        }
    }, []);

    // Save conversation whenever messages change (and not loading)
    useEffect(() => {
        if (initialMount.current || isLoading) return;

        const masterHistory = getMasterHistory();
        let modelConversations = masterHistory[selectedModel.id] || [];

        if (currentConversationId) {
            const convoIndex = modelConversations.findIndex(c => c.id === currentConversationId);
            if (convoIndex > -1) {
                if (messages.length > 0) {
                    modelConversations[convoIndex].messages = messages;
                    modelConversations[convoIndex].timestamp = Date.now();
                } else {
                    // If messages are cleared, delete the conversation
                    modelConversations.splice(convoIndex, 1);
                }
            }
        } else if (messages.length > 0) {
            const firstUserMessage = messages.find(m => m.role === 'user');
            const newId = Date.now().toString();
            const newConversation: Conversation = {
                id: newId,
                timestamp: Date.now(),
                title: firstUserMessage?.content.substring(0, 40) || `Chat ${new Date().toLocaleTimeString()}`,
                messages: messages,
            };
            modelConversations.push(newConversation);
            setCurrentConversationId(newId);
        }

        masterHistory[selectedModel.id] = modelConversations;
        saveMasterHistory(masterHistory);

    }, [messages, selectedModel.id, currentConversationId, isLoading, getMasterHistory, saveMasterHistory]);

    // Switch conversation/model
    useEffect(() => {
        initialMount.current = false;
        const masterHistory = getMasterHistory();

        if (loadSpecificChat.current && loadSpecificChat.current.modelId === selectedModel.id) {
            const conversations = masterHistory[selectedModel.id] || [];
            const chatToLoad = conversations.find(c => c.id === loadSpecificChat.current?.conversationId);
            if (chatToLoad) {
                setMessages(chatToLoad.messages);
                setCurrentConversationId(chatToLoad.id);
            }
            loadSpecificChat.current = null;
        } else {
            const modelConversations = masterHistory[selectedModel.id] || [];
            if (modelConversations.length > 0) {
                const latestConversation = [...modelConversations].sort((a, b) => b.timestamp - a.timestamp)[0];
                setMessages(latestConversation.messages);
                setCurrentConversationId(latestConversation.id);
            } else {
                setMessages([]);
                setCurrentConversationId(null);
            }
        }
    }, [selectedModel, getMasterHistory]);
    
    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    // Handle incoming prompt from props
    useEffect(() => {
        if (initialState && onPromptSent) {
            const modelToUse = MODELS.find(m => m.id === initialState.modelId);
            if (modelToUse) {
                if (selectedModel.id !== modelToUse.id) {
                    setSelectedModel(modelToUse);
                }
                handleNewChat(false); // Start a new chat without confirmation
                setTimeout(() => handleSendMessage(initialState.prompt, modelToUse, null), 0);
            }
            onPromptSent();
        }
    }, [initialState, onPromptSent]);
    
    // --- Settings Management ---
    const getSettingsForModel = useCallback((modelId: string): AiChatSettings => {
        return aiSettings[modelId] || DEFAULT_SETTINGS;
    }, [aiSettings]);

    const updateSettingsForModel = useCallback((modelId: string, newModelSettings: AiChatSettings) => {
        setAiSettings(prev => {
            const updatedSettings = { ...prev, [modelId]: newModelSettings };
            try {
                localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings));
            } catch (error) {
                console.error("Failed to save AI settings:", error);
            }
            return updatedSettings;
        });
    }, []);

    const handleApplySettingsToAll = useCallback((settingsToApply: AiChatSettings) => {
        setAiSettings(prev => {
            const updatedSettings = { ...prev };
            MODELS.forEach(model => {
                updatedSettings[model.id] = settingsToApply;
            });

            try {
                localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings));
            } catch (error) {
                console.error("Failed to save AI settings:", error);
            }
            return updatedSettings;
        });
    }, []);

    // --- Core Chat Logic ---
    const handleSendMessage = useCallback(async (prompt: string, modelToUse: AiModel, fileToSend: typeof uploadedFile) => {
        if (!prompt.trim() && !fileToSend) return;

        const newUserMessage: ChatMessage = {
            role: 'user',
            content: prompt,
            file: fileToSend ? { data: fileToSend.data, mimeType: fileToSend.mimeType, name: fileToSend.name } : undefined,
        };
        const currentMessages = [...messages, newUserMessage];
        setMessages(currentMessages);
        setIsLoading(true);

        setInput('');
        setUploadedFile(null);
        const textarea = document.querySelector('textarea');
        if (textarea) textarea.style.height = 'auto';

        let finalPrompt = prompt;

        // Location check
        if (!fileToSend && prompt.trim()) {
             try {
                const { needsLocation } = await checkForLocationIntent(prompt);
                if (needsLocation) {
                    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                        if (!navigator.geolocation) return reject(new Error("Geolocation is not supported."));
                        navigator.geolocation.getCurrentPosition(resolve, reject);
                    });
                    const { latitude, longitude } = position.coords;
                    finalPrompt = `User is at Lat: ${latitude}, Lon: ${longitude}. Question: "${prompt}"`;
                }
            } catch (error: any) {
                let errorMessage;
                if (error instanceof Error && error.message.includes('rate limit exceeded')) {
                    errorMessage = `Error: Could not check for location due to an API error. Please try again.`;
                } else {
                    errorMessage = `I need your location to answer, but couldn't get it. ${error.code === error.PERMISSION_DENIED ? "Please enable location services in your browser." : error.message}`;
                }
                setMessages(prev => [...prev, { role: 'model', content: errorMessage }]);
                setIsLoading(false);
                return;
            }
        }
        
        const historyForApi = [...currentMessages.slice(0, -1), { ...newUserMessage, content: finalPrompt }];
        const uiMessages = [...currentMessages, { role: 'model', content: '' }];
        setMessages(uiMessages);

        try {
            const currentModelSettings = getSettingsForModel(modelToUse.id);
            const stream = await getChatStream({ model: modelToUse, history: historyForApi, settings: currentModelSettings });
            const reader = stream.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                setMessages(prev => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage?.role !== 'model') return prev;
                    const updatedLastMessage = { ...lastMessage, content: lastMessage.content + chunk };
                    return [...prev.slice(0, -1), updatedLastMessage];
                });
            }
        } catch (err: any) {
            const errorMessage = `Error: ${err.message || 'Failed to get a response from the AI.'}`;
            setMessages(prev => [...prev.slice(0, -1), { role: 'model', content: errorMessage }]);
        } finally {
            setIsLoading(false);
        }
    }, [messages, getSettingsForModel]);
    
    // --- UI Handlers ---
    const handleNewChat = (confirm = true) => {
        if (messages.length > 0 && confirm) {
            if (!window.confirm("Start a new chat? The current conversation will be saved.")) return;
        }
        setMessages([]);
        setCurrentConversationId(null);
    };

    const handleLoadChat = (modelId: string, conversationId: string) => {
        const modelToLoad = MODELS.find(m => m.id === modelId);
        if (modelToLoad) {
            loadSpecificChat.current = { modelId, conversationId };
            setSelectedModel(modelToLoad); // This triggers the useEffect
        }
        setShowHistoryModal(false);
    };

    const handleDeleteChat = (modelId: string, conversationId: string) => {
        const masterHistory = getMasterHistory();
        let modelConversations = masterHistory[modelId] || [];
        masterHistory[modelId] = modelConversations.filter(c => c.id !== conversationId);
        saveMasterHistory(masterHistory);

        if (currentConversationId === conversationId) {
            const remainingConversations = masterHistory[modelId];
            if (remainingConversations.length > 0) {
                const latest = [...remainingConversations].sort((a,b) => b.timestamp - a.timestamp)[0];
                handleLoadChat(modelId, latest.id);
            } else {
                handleNewChat(false);
            }
        }
        return getMasterHistory(); // Return updated history for modal to refresh
    };

    const handleClearAllHistory = () => {
        saveMasterHistory({});
        if (MODELS.some(m => m.id === selectedModel.id)) {
            setMessages([]);
            setCurrentConversationId(null);
        }
        setShowHistoryModal(false);
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const textarea = e.target;
        setInput(textarea.value);
        textarea.style.height = 'auto';
        const maxHeight = 5 * 24; // approx 5 rows
        textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSendMessage(input, selectedModel, uploadedFile);
    };
    
    const handleCopy = useCallback((content: string, index: number) => {
        navigator.clipboard.writeText(content).then(() => {
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        }).catch(err => console.error('Failed to copy text:', err));
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result;
            if (typeof result !== 'string') return;
            if (file.type.startsWith('image/')) {
                const base64Data = result.split(',')[1];
                setUploadedFile({ data: base64Data, mimeType: file.type, name: file.name, type: 'image' });
            } else {
                 setUploadedFile({ data: result, mimeType: file.type, name: file.name, type: 'text' });
            }
        };
        if (file.type.startsWith('image/')) reader.readAsDataURL(file);
        else reader.readAsText(file);
        e.target.value = '';
    };

    const isErrorMessage = (content: string) => content.startsWith('Error:') || content.startsWith('The AI could not') || content.startsWith("I need your location");
    
    const ModelIcon: React.FC<{ model: AiModel; className?: string }> = ({ model, className="h-4 w-4" }) => {
        if (model.provider === 'Google') {
            return <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm3.93 6.07L12 12l-3.93-3.93L12 4.14l3.93 3.93zM4.14 12l3.93 3.93L12 12l-3.93-3.93-3.93 3.93zm7.86 7.86L12 12l3.93 3.93L12 19.86z"></path></svg>;
        }
        return <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 012-2m14 0V9a2 2 0 00-2-2H5a2 2 0 00-2 2v2m14 0v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2" /></svg>;
    };

    const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
    const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
    const fileInputAccept = `text/plain,.md${selectedModel.supportsImages ? ',image/png,image/jpeg,image/webp' : ''}`;

    return (
        <div className="flex flex-col h-[492px] bg-[--color-displayBackground] rounded-lg">
            {/* Math Rendering Styles */}
            <style>{`
                .fraction { display: inline-flex; flex-direction: column; text-align: center; vertical-align: middle; line-height: 1.1; }
                .numerator { font-size: 0.9em; border-bottom: 1px solid currentColor; padding: 0 0.2em; }
                .denominator { font-size: 0.9em; padding: 0 0.2em; }
                .large-op { display: inline-flex; align-items: center; vertical-align: middle; }
                .op-symbol { font-size: 1.8em; margin-right: 0.1em; line-height: 1; }
                .limits { display: flex; flex-direction: column; text-align: left; font-size: 0.6em; line-height: 1.1; }
                .limits-single { display: flex; flex-direction: column; text-align: center; font-size: 0.6em; line-height: 1.1; margin-top: 0.5em; }
                .expression { margin-left: 0.2em; }
                .limit { display: inline-flex; flex-direction: column; text-align: center; vertical-align: bottom; margin-right: 0.2em; }
                .limit .op { line-height: 1; }
                .limit .sub { font-size: 0.7em; line-height: 1; margin-top: -0.2em; }
            `}</style>

            {/* Header */}
            <div className="flex-shrink-0 p-2 border-b border-white/10 flex items-center justify-between relative">
                 <button 
                    onClick={() => setIsModelSelectorOpen(prev => !prev)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                    <ModelIcon model={selectedModel} className="h-6 w-6" />
                    <div className="text-left leading-tight">
                        <span className="font-bold text-sm text-[--color-textPrimary]">{selectedModel.name}</span>
                        <span className="text-xs text-[--color-textSecondary] block">{selectedModel.provider}</span>
                    </div>
                     <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-[--color-textSecondary] transition-transform ${isModelSelectorOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>

                 {isModelSelectorOpen && (
                    <div className="absolute top-full left-2 mt-1 w-64 bg-[--color-background] border border-white/10 rounded-lg shadow-xl z-20 animate-fade-in-up-sm">
                        <p className="px-3 pt-3 pb-1 text-xs font-semibold text-[--color-textSecondary]">SELECT A MODEL</p>
                        {MODELS.map(model => (
                            <button key={model.id} onClick={() => { setSelectedModel(model); setIsModelSelectorOpen(false); }} className={`w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 ${selectedModel.id === model.id ? 'bg-white/10' : ''}`}>
                                <ModelIcon model={model} className="h-5 w-5 flex-shrink-0" />
                                <div className="flex-grow">
                                    <p className="font-semibold text-sm text-[--color-textPrimary]">{model.name}</p>
                                    <p className="text-xs text-[--color-textSecondary]">{model.description}</p>
                                </div>
                                {selectedModel.id === model.id && <CheckIcon />}
                            </button>
                        ))}
                    </div>
                )}
                <div className="flex items-center">
                    <button onClick={() => handleNewChat()} className="p-2 text-[--color-textSecondary] hover:text-[--color-textPrimary]" aria-label="New Chat">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002 2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => setShowHistoryModal(true)} className="p-2 text-[--color-textSecondary] hover:text-[--color-textPrimary]" aria-label="Chat History">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                    <button onClick={() => setShowPersonalization(true)} className="p-2 text-[--color-textSecondary] hover:text-[--color-textPrimary]" aria-label="Personalization Settings">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zM12 12a2 2 0 100 4 2 2 0 000-4z" clipRule="evenodd" /></svg>
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !isLoading && (
                     <div className="h-full flex flex-col items-center justify-center text-center text-[--color-textSecondary]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        <p className="font-semibold">AI Chat</p><p className="text-sm">Start a new conversation!</p>
                    </div>
                )}
                {messages.map((msg, index) => (
                    <div key={index} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'user' ? (
                            <div className="relative group max-w-[80%] p-3 rounded-2xl break-words bg-[--color-accent] text-[--color-background] rounded-br-lg">
                                {msg.file && (
                                    <div className="mb-2">
                                        {msg.file.mimeType.startsWith('image/') ? (
                                            <button onClick={() => setPreviewImage(`data:${msg.file.mimeType};base64,${msg.file.data}`)} className="block w-full">
                                                <img src={`data:${msg.file.mimeType};base64,${msg.file.data}`} alt={msg.file.name} className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-80 transition-opacity" />
                                            </button>
                                        ) : (
                                            <div className="bg-black/20 p-2 rounded-lg text-xs"><p className="font-semibold truncate">{msg.file.name}</p></div>
                                        )}
                                    </div>
                                )}
                                <span className="whitespace-pre-wrap">{msg.content}</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-start max-w-[80%]">
                                <div className="flex items-center gap-2 mb-1 ml-1">
                                    <ModelIcon model={selectedModel} className="h-4 w-4 text-[--color-textSecondary]" />
                                    <span className="text-xs font-semibold text-[--color-textSecondary]">{selectedModel.name}</span>
                                </div>
                                <div className={`relative group w-full p-3 rounded-2xl break-words bg-[--color-buttonBackground] text-[--color-textPrimary] rounded-bl-lg ${isErrorMessage(msg.content) ? 'text-red-400' : ''}`}>
                                    {msg.file && (
                                        <div className="mb-2">
                                            {msg.file.mimeType.startsWith('image/') ? (
                                                <button onClick={() => setPreviewImage(`data:${msg.file.mimeType};base64,${msg.file.data}`)} className="block w-full">
                                                    <img src={`data:${msg.file.mimeType};base64,${msg.file.data}`} alt={msg.file.name} className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-80 transition-opacity" />
                                                </button>
                                            ) : (
                                                 <div className="bg-black/20 p-2 rounded-lg text-xs"><p className="font-semibold truncate">{msg.file.name}</p></div>
                                            )}
                                        </div>
                                    )}
                                    {msg.content && !isErrorMessage(msg.content) && (<button onClick={() => handleCopy(msg.content, index)} className="absolute -top-2 -right-2 p-1.5 rounded-full bg-[--color-displayBackground] border border-white/10 text-[--color-textSecondary] opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Copy message">{copiedIndex === index ? <CheckIcon /> : <CopyIcon />}</button>)}
                                    {isLoading && index === messages.length - 1 && msg.content === '' ? <TypingIndicator /> : <div dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }} />}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="flex-shrink-0 p-2 border-t border-white/10">
                {uploadedFile && (<div className="mx-2 mb-2 p-2 bg-[--color-buttonBackground] rounded-lg flex items-center justify-between animate-fade-in-up-sm"><div className="flex items-center gap-2 overflow-hidden">{uploadedFile.type === 'image' ? <img src={`data:${uploadedFile.mimeType};base64,${uploadedFile.data}`} alt="upload preview" className="w-10 h-10 rounded object-cover" /> : <div className="w-10 h-10 flex-shrink-0 bg-[--color-displayBackground] rounded flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[--color-textSecondary]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>}<span className="text-sm text-[--color-textSecondary] truncate">{uploadedFile.name}</span></div><button onClick={() => setUploadedFile(null)} className="p-1 rounded-full hover:bg-white/10 text-[--color-textSecondary] flex-shrink-0"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>)}
                <form onSubmit={handleSubmit} className="flex items-end gap-2">
                     <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept={fileInputAccept} />
                     <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 bg-[--color-buttonBackground] hover:bg-[--color-buttonBackgroundHover] rounded-full text-[--color-textSecondary] hover:text-[--color-textPrimary] transition-colors flex-shrink-0" aria-label="Attach file"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg></button>
                    <textarea value={input} onChange={handleInput} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }} placeholder={`Ask ${selectedModel.name}...`} className="flex-grow bg-[--color-buttonBackground] rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[--color-accent] text-[--color-textPrimary]" rows={1} disabled={isLoading} />
                    <button type="submit" disabled={isLoading || (!input.trim() && !uploadedFile)} className="p-3 bg-[--color-accent] rounded-full text-[--color-background] disabled:opacity-50 transition-all flex-shrink-0"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg></button>
                </form>
            </div>
             <style>{`.animate-fade-in-up-sm { animation: fade-in-up-sm 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94); } @keyframes fade-in-up-sm { from { opacity: 0; transform: translateY(-10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
             <ChatHistoryModal show={showHistoryModal} onClose={() => setShowHistoryModal(false)} onLoadChat={handleLoadChat} onDeleteChat={handleDeleteChat} onClearAll={handleClearAllHistory} />
             <PersonalizationModal show={showPersonalization} onClose={() => setShowPersonalization(false)} settings={getSettingsForModel(selectedModel.id)} onSave={(newSettings) => updateSettingsForModel(selectedModel.id, newSettings)} onManageMemory={() => { setShowPersonalization(false); setShowMemory(true); }} onApplyToAll={handleApplySettingsToAll} />
            <MemoryManagementModal show={showMemory} onClose={() => setShowMemory(false)} memoryItems={getSettingsForModel(selectedModel.id).memoryItems} onSave={(newMemoryItems) => { const currentSettings = getSettingsForModel(selectedModel.id); updateSettingsForModel(selectedModel.id, { ...currentSettings, memoryItems: newMemoryItems }); }} />
            {previewImage && <PreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />}
        </div>
    );
};

export default AiChat;