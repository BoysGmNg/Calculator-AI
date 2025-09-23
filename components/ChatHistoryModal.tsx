import React, { useState, useEffect, useMemo } from 'react';
import { AiModel, Conversation } from '../types';
import { MODELS } from '../services/aiChatService';

type MasterHistory = Record<string, Conversation[]>;

const ModelIcon: React.FC<{ model: AiModel | undefined }> = ({ model }) => {
    const className = "h-6 w-6 text-[--color-accent]";
    if (!model) return <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    if (model.provider === 'Google') return <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm3.93 6.07L12 12l-3.93-3.93L12 4.14l3.93 3.93zM4.14 12l3.93 3.93L12 12l-3.93-3.93-3.93 3.93zm7.86 7.86L12 12l3.93 3.93L12 19.86z"></path></svg>;
    return <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 012-2m14 0V9a2 2 0 00-2-2H5a2 2 0 00-2 2v2m14 0v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2" /></svg>;
};

interface ChatHistoryModalProps {
    show: boolean;
    onClose: () => void;
    onLoadChat: (modelId: string, conversationId: string) => void;
    onDeleteChat: (modelId: string, conversationId: string) => MasterHistory;
    onClearAll: () => void;
}

const DateFilterButton: React.FC<{ label: string; active: boolean; onClick: () => void; }> = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${active ? 'bg-[--color-accent] text-[--color-background]' : 'bg-[--color-buttonBackground] text-[--color-textSecondary] hover:text-[--color-textPrimary]'}`}
        aria-pressed={active}
    >
        {label}
    </button>
);

const ChatHistoryModal: React.FC<ChatHistoryModalProps> = ({ show, onClose, onLoadChat, onDeleteChat, onClearAll }) => {
    const [history, setHistory] = useState<MasterHistory>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days'>('all');

    const loadHistory = () => {
        try {
            const saved = localStorage.getItem('ai-chat-master-history');
            const parsed = saved ? JSON.parse(saved) : {};
            // Sort conversations within each model by timestamp descending
            for (const modelId in parsed) {
                if(Array.isArray(parsed[modelId])) {
                    parsed[modelId].sort((a: Conversation, b: Conversation) => b.timestamp - a.timestamp);
                }
            }
            setHistory(parsed);
        } catch (e) {
            console.error("Failed to parse history", e);
            setHistory({});
        }
    };

    useEffect(() => {
        if (show) {
            loadHistory();
        }
    }, [show]);
    
    const filteredHistory = useMemo(() => {
        if (!history) return {};
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const sevenDaysAgo = today - 6 * 24 * 60 * 60 * 1000;

        const newFilteredHistory: MasterHistory = {};

        for (const modelId in history) {
            if (Object.prototype.hasOwnProperty.call(history, modelId) && Array.isArray(history[modelId])) {
                let conversations = history[modelId];

                // 1. Filter by date
                if (dateFilter === 'today') {
                    conversations = conversations.filter(c => c.timestamp >= today);
                } else if (dateFilter === '7days') {
                    conversations = conversations.filter(c => c.timestamp >= sevenDaysAgo);
                }

                // 2. Filter by search term
                if (searchTerm.trim() !== '') {
                    conversations = conversations.filter(c => 
                        c.title.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                }
                
                if (conversations.length > 0) {
                    newFilteredHistory[modelId] = conversations;
                }
            }
        }
        return newFilteredHistory;
    }, [history, searchTerm, dateFilter]);

    const handleDelete = (e: React.MouseEvent, modelId: string, conversationId: string) => {
        e.stopPropagation();
        const modelName = MODELS.find(m => m.id === modelId)?.name || 'this';
        if (window.confirm(`Delete this conversation from ${modelName}?`)) {
            const updatedHistory = onDeleteChat(modelId, conversationId);
            setHistory(updatedHistory);
        }
    };
    
    const handleClearAll = () => {
        if (window.confirm("Are you sure you want to delete ALL chat histories? This cannot be undone.")) {
            onClearAll();
            setHistory({});
        }
    };
    
    const historyExists = typeof history === 'object' && history !== null && Object.values(history).some(conversations => Array.isArray(conversations) && conversations.length > 0);
    const filteredHistoryExists = typeof filteredHistory === 'object' && filteredHistory !== null && Object.values(filteredHistory).some(conversations => Array.isArray(conversations) && conversations.length > 0);


    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col" role="dialog" aria-modal="true">
            <div className="bg-[--color-background] p-4 flex-shrink-0 flex items-center justify-between">
                <button onClick={onClose} className="p-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[--color-textPrimary]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                <h2 className="text-lg font-bold text-[--color-textPrimary]">Chat History</h2>
                <div className="w-8"></div>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-6">
                 <div className="space-y-3">
                    <input
                        type="text"
                        placeholder="Search by title..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-3 bg-[--color-displayBackground] rounded-lg text-[--color-textPrimary] text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
                    />
                    <div className="flex items-center justify-center gap-2">
                         <DateFilterButton label="All time" active={dateFilter === 'all'} onClick={() => setDateFilter('all')} />
                         <DateFilterButton label="Today" active={dateFilter === 'today'} onClick={() => setDateFilter('today')} />
                         <DateFilterButton label="Last 7 days" active={dateFilter === '7days'} onClick={() => setDateFilter('7days')} />
                    </div>
                </div>
                {filteredHistoryExists ? (
                    Object.entries(filteredHistory).map(([modelId, conversations]) => {
                        if (!Array.isArray(conversations) || conversations.length === 0) return null;
                        const model = MODELS.find(m => m.id === modelId);
                        return (
                            <div key={modelId}>
                                <h3 className="text-sm font-semibold text-[--color-textSecondary] px-2 mb-2 flex items-center gap-2">
                                    <ModelIcon model={model} />
                                    {model?.name || 'Unknown Model'}
                                </h3>
                                <div className="space-y-2">
                                    {conversations.map(chat => (
                                        <button key={chat.id} onClick={() => onLoadChat(modelId, chat.id)} className="w-full flex items-center gap-4 p-3 bg-[--color-displayBackground] hover:bg-[--color-buttonBackground] rounded-xl transition-colors text-left group">
                                            <div className="flex-grow overflow-hidden">
                                                <p className="font-bold text-[--color-textPrimary] text-sm truncate">{chat.title}</p>
                                                <p className="text-xs text-[--color-textSecondary] truncate">{new Date(chat.timestamp).toLocaleString()}</p>
                                            </div>
                                            <button onClick={(e) => handleDelete(e, modelId, chat.id)} className="p-2 rounded-full text-[--color-textSecondary] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" aria-label={`Delete chat`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center text-[--color-textSecondary] py-10 flex flex-col items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        <p className="font-semibold">{historyExists ? 'No Matching Chats' : 'No Saved Chats'}</p>
                        <p className="text-sm">{historyExists ? 'Try adjusting your search or filters.' : 'Your saved conversations will appear here.'}</p>
                    </div>
                )}
            </div>
             {historyExists && (
                 <div className="flex-shrink-0 p-4 bg-[--color-background]">
                     <button onClick={handleClearAll} className="w-full py-2 bg-[--color-buttonSpecial1Background] hover:bg-[--color-buttonSpecial1BackgroundHover] text-[--color-accent] rounded-lg font-semibold transition-colors">
                        Clear All History
                    </button>
                </div>
             )}
        </div>
    );
};

export default ChatHistoryModal;