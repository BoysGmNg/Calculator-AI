import React from 'react';
import { MODELS } from '../services/aiChatService';
import type { AiModel } from '../types';

interface AiSelectionModalProps {
    show: boolean;
    topic: string;
    onClose: () => void;
    onSelectModel: (modelId: string) => void;
}

const ModelIcon: React.FC<{ model: AiModel }> = ({ model }) => {
    if (model.provider === 'Google') {
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm3.93 6.07L12 12l-3.93-3.93L12 4.14l3.93 3.93zM4.14 12l3.93 3.93L12 12l-3.93-3.93-3.93 3.93zm7.86 7.86L12 12l3.93 3.93L12 19.86z"></path></svg>;
    }
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 012-2m14 0V9a2 2 0 00-2-2H5a2 2 0 00-2 2v2m14 0v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2" /></svg>;
};

const AiSelectionModal: React.FC<AiSelectionModalProps> = ({ show, topic, onClose, onSelectModel }) => {
    if (!show) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center transition-opacity"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-[--color-displayBackground] w-full max-w-sm rounded-2xl p-6 flex flex-col shadow-2xl animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold text-[--color-textPrimary] text-center">Continue with AI Chat?</h2>
                <p className="text-sm text-[--color-textSecondary] text-center mt-2 mb-6">
                    Your query, "{topic}", is best handled by our AI Chat. Please select a model to continue.
                </p>

                <div className="space-y-3">
                    {MODELS.map((model) => (
                        <button 
                            key={model.id}
                            onClick={() => onSelectModel(model.id)}
                            className="w-full flex items-center gap-4 p-3 bg-[--color-buttonBackground] hover:bg-[--color-buttonBackgroundHover] rounded-xl transition-colors text-left"
                        >
                            <div className="flex-shrink-0 text-[--color-accent]">
                                <ModelIcon model={model} />
                            </div>
                            <div className="flex-grow">
                                <p className="font-bold text-[--color-textPrimary]">{model.name}</p>
                                <p className="text-xs text-[--color-textSecondary]">{model.description}</p>
                            </div>
                        </button>
                    ))}
                </div>

                <button 
                    onClick={onClose}
                    className="mt-6 w-full py-2 bg-[--color-buttonSpecial1Background]/20 hover:bg-[--color-buttonSpecial1Background]/40 text-[--color-accent] rounded-lg font-semibold transition-colors"
                >
                    Cancel
                </button>
            </div>
             <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                }
            `}</style>
        </div>
    );
};

export default AiSelectionModal;