import React from 'react';

interface AboutModalProps {
    show: boolean;
    onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ show, onClose }) => {
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
                className="bg-[--color-displayBackground] w-full max-w-sm rounded-2xl p-6 flex flex-col items-center text-center shadow-2xl animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute top-2 right-2">
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-full text-[--color-textSecondary] hover:text-[--color-textPrimary] transition-colors"
                        aria-label="Close about modal"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <h2 className="text-2xl font-bold text-[--color-textPrimary]">Gemini Universal Calculator AI</h2>
                <p className="text-sm text-[--color-textSecondary] mb-4">Version 1.0.0</p>
                
                <p className="text-[--color-textSecondary] mb-6">
                    A sleek, modern calculator powered by Gemini. It handles everything from simple arithmetic to complex queries, providing instant and accurate answers.
                </p>

                <div className="mb-6">
                    <p className="text-sm text-[--color-textSecondary]">Created by</p>
                    <a 
                        href="https://www.youtube.com/@doratanosub" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[--color-accent] font-bold text-lg hover:underline"
                    >
                        Dora-ta-no Sub
                    </a>
                </div>

                <a href="#privacy" className="text-xs text-[--color-textSecondary] hover:text-[--color-textPrimary] underline">
                    Privacy Policy
                </a>
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

export default AboutModal;
