import React, { useState, useMemo } from 'react';
import { MemoryItem } from '../types';

interface MemoryManagementModalProps {
    show: boolean;
    onClose: () => void;
    memoryItems: MemoryItem[];
    onSave: (newMemoryItems: MemoryItem[]) => void;
}

const MemoryManagementModal: React.FC<MemoryManagementModalProps> = ({ show, onClose, memoryItems, onSave }) => {
    const [items, setItems] = useState(memoryItems);
    const [searchTerm, setSearchTerm] = useState('');
    const [newItemContent, setNewItemContent] = useState('');

    const handleSaveAndClose = () => {
        onSave(items);
        onClose();
    };
    
    const handleAddItem = () => {
        if (!newItemContent.trim()) return;
        const newItem: MemoryItem = {
            id: `${Date.now()}-${Math.random()}`,
            content: newItemContent.trim(),
            timestamp: Date.now()
        };
        setItems(prev => [newItem, ...prev]);
        setNewItemContent('');
    };

    const handleDeleteItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const handleClearAll = () => {
        if (window.confirm("Are you sure you want to delete all memories? This action cannot be undone.")) {
            setItems([]);
        }
    };

    const filteredItems = useMemo(() => {
        if (!searchTerm.trim()) return items;
        return items.filter(item => item.content.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [items, searchTerm]);


    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col" role="dialog" aria-modal="true">
            <div className="bg-[--color-background] p-4 flex-shrink-0 flex items-center justify-between">
                 <button onClick={handleSaveAndClose} className="p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[--color-textPrimary]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="text-lg font-bold text-[--color-textPrimary]">Saved Memories</h2>
                <div className="w-8"></div>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                <input
                    type="text"
                    placeholder="Search memories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-3 bg-[--color-buttonBackground] rounded-lg text-[--color-textPrimary] text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
                />

                <div className="bg-[--color-displayBackground] p-3 rounded-lg flex gap-2">
                    <input
                        type="text"
                        placeholder="Add new memory..."
                        value={newItemContent}
                        onChange={(e) => setNewItemContent(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem(); }}
                        className="flex-grow bg-transparent focus:outline-none"
                    />
                    <button onClick={handleAddItem} className="bg-[--color-accent] text-[--color-background] rounded-md px-3 py-1 text-sm font-bold">Add</button>
                </div>


                {filteredItems.length > 0 ? (
                    <div className="space-y-3">
                        {filteredItems.map(item => (
                            <div key={item.id} className="bg-[--color-displayBackground] p-3 rounded-lg flex justify-between items-start gap-2">
                                <p className="text-sm text-[--color-textPrimary] flex-grow">{item.content}</p>
                                <button onClick={() => handleDeleteItem(item.id)} className="text-[--color-textSecondary] hover:text-red-500 flex-shrink-0 p-1">&times;</button>
                            </div>
                        ))}
                    </div>
                ) : (
                     <div className="text-center text-[--color-textSecondary] py-10">
                        <p>No memories found.</p>
                     </div>
                )}
            </div>

            <div className="flex-shrink-0 p-4 bg-[--color-background]">
                 <button 
                    onClick={handleClearAll}
                    disabled={items.length === 0}
                    className="w-full py-2 bg-[--color-buttonSpecial1Background] hover:bg-[--color-buttonSpecial1BackgroundHover] text-[--color-accent] rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                    Clear All Memories
                </button>
            </div>
        </div>
    );
};

export default MemoryManagementModal;