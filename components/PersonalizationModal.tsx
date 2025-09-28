import React, { useState, useEffect } from 'react';
import { AiChatSettings } from '../types';

interface PersonalizationModalProps {
    show: boolean;
    onClose: () => void;
    settings: AiChatSettings;
    onSave: (newSettings: AiChatSettings) => void;
    onManageMemory: () => void;
    onApplyToAll: (settingsToApply: AiChatSettings) => void;
}

const Toggle: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
    <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${checked ? 'bg-[--color-accent]' : 'bg-[--color-buttonBackground]'}`}
    >
        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);


const PersonalizationModal: React.FC<PersonalizationModalProps> = ({ show, onClose, settings, onSave, onManageMemory, onApplyToAll }) => {
    const [currentSettings, setCurrentSettings] = useState(settings);
    const [justApplied, setJustApplied] = useState(false);

    useEffect(() => {
        setCurrentSettings(settings);
    }, [settings, show]);

    const handleSaveAndClose = () => {
        onSave(currentSettings);
        onClose();
    };
    
    const handleApplyToAll = () => {
        onApplyToAll(currentSettings);
        setJustApplied(true);
        setTimeout(() => setJustApplied(false), 2000);
    };

    const handleSettingChange = <K extends keyof AiChatSettings>(key: K, value: AiChatSettings[K]) => {
        setCurrentSettings(prev => ({ ...prev, [key]: value }));
    };

    const handlePersonalizationChange = <K extends keyof AiChatSettings['personalization']>(key: K, value: AiChatSettings['personalization'][K]) => {
        setCurrentSettings(prev => ({
            ...prev,
            personalization: {
                ...prev.personalization,
                [key]: value
            }
        }));
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col" role="dialog" aria-modal="true">
            <div className="bg-[--color-background] p-4 flex-shrink-0 flex items-center justify-between">
                <button onClick={handleSaveAndClose} className="p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[--color-textPrimary]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="text-lg font-bold text-[--color-textPrimary]">Personalization</h2>
                <div className="w-8"></div>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-6">
                <div className="flex justify-end -mt-2 mb-2">
                     <button
                        onClick={handleApplyToAll}
                        className="text-xs font-semibold px-3 py-1.5 border border-white/20 text-[--color-textSecondary] rounded-full hover:border-[--color-accent] hover:text-[--color-accent] transition-colors disabled:opacity-50"
                        disabled={justApplied}
                     >
                        {justApplied ? "Applied to all!" : "Apply to all models"}
                    </button>
                </div>
                
                <div className="bg-[--color-displayBackground] p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-semibold text-[--color-textPrimary]">Enable Personalization</h3>
                            <p className="text-sm text-[--color-textSecondary]">Customize how the AI responds.</p>
                        </div>
                        <Toggle checked={currentSettings.personalization.enabled} onChange={checked => handlePersonalizationChange('enabled', checked)} />
                    </div>
                </div>

                <div className={`space-y-4 ${!currentSettings.personalization.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div>
                        <label className="text-sm font-medium text-[--color-textSecondary]">Custom instructions</label>
                        <textarea
                            placeholder="e.g., Be friendly and professional. Use markdown for formatting."
                            value={currentSettings.personalization.customInstructions}
                            onChange={(e) => handlePersonalizationChange('customInstructions', e.target.value)}
                            className="w-full mt-1 p-3 bg-[--color-buttonBackground] rounded-lg text-[--color-textPrimary] text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent] min-h-[100px]"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-[--color-textSecondary]">What should the AI call you?</label>
                        <input
                            type="text"
                            placeholder="Nickname"
                            value={currentSettings.personalization.nickname}
                            onChange={(e) => handlePersonalizationChange('nickname', e.target.value)}
                            className="w-full mt-1 p-3 bg-[--color-buttonBackground] rounded-lg text-[--color-textPrimary] text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-[--color-textSecondary]">What do you do for work?</label>
                        <input
                            type="text"
                            placeholder="Engineer, student, etc."
                            value={currentSettings.personalization.job}
                            onChange={(e) => handlePersonalizationChange('job', e.target.value)}
                            className="w-full mt-1 p-3 bg-[--color-buttonBackground] rounded-lg text-[--color-textPrimary] text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-[--color-textSecondary]">More about you</label>
                        <textarea
                            placeholder="Interests, values, or preferences to remember"
                            value={currentSettings.personalization.about}
                            onChange={(e) => handlePersonalizationChange('about', e.target.value)}
                            className="w-full mt-1 p-3 bg-[--color-buttonBackground] rounded-lg text-[--color-textPrimary] text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent] min-h-[100px]"
                        />
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-[--color-textPrimary] mb-2">Memory</h3>
                     <div className="bg-[--color-displayBackground] p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="font-semibold text-[--color-textPrimary]">Use Memory</h3>
                                <p className="text-sm text-[--color-textSecondary]">Allow the AI to save and use memories.</p>
                            </div>
                            <Toggle checked={currentSettings.memoryEnabled} onChange={checked => handleSettingChange('memoryEnabled', checked)} />
                        </div>
                        <button 
                            onClick={onManageMemory}
                            className="w-full py-2 bg-[--color-buttonBackground] hover:bg-[--color-buttonBackgroundHover] text-[--color-textPrimary] rounded-lg font-semibold transition-colors"
                        >
                            Manage Memory
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default PersonalizationModal;