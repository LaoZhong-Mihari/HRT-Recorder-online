import React, { createContext, useContext, useState, useCallback } from 'react';
import { useTranslation } from './LanguageContext';

type DialogType = 'alert' | 'confirm';

interface DialogContextType {
    showDialog: (type: DialogType, message: string, onConfirm?: () => void) => void;
}

const DialogContext = createContext<DialogContextType | null>(null);

export const useDialog = () => {
    const ctx = useContext(DialogContext);
    if (!ctx) throw new Error("useDialog must be used within DialogProvider");
    return ctx;
};

export const DialogProvider = ({ children }: { children: React.ReactNode }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [type, setType] = useState<DialogType>('alert');
    const [message, setMessage] = useState("");
    const [onConfirm, setOnConfirm] = useState<(() => void) | null>(null);

    const showDialog = useCallback((type: DialogType, message: string, onConfirm?: () => void) => {
        setType(type);
        setMessage(message);
        setOnConfirm(() => onConfirm || null);
        setIsOpen(true);
    }, []);

    const handleConfirm = () => {
        if (onConfirm) onConfirm();
        setIsOpen(false);
    };

    return (
        <DialogContext.Provider value={{ showDialog }}>
            {children}
            {isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" style={{ animation: 'dialogFadeIn 0.2s ease-out forwards' }}>
                    <style>{`
                        @keyframes dialogFadeIn { from { opacity: 0; } to { opacity: 1; } }
                        @keyframes dialogZoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                    `}</style>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100" style={{ animation: 'dialogZoomIn 0.2s ease-out forwards' }}>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                            {type === 'confirm' ? t('dialog.confirm_title') : t('dialog.alert_title')}
                        </h3>
                        <p className="text-gray-600 mb-6 leading-relaxed text-sm">{message}</p>
                        <div className="flex gap-3">
                            {type === 'confirm' && (
                                <button 
                                    onClick={() => setIsOpen(false)} 
                                    className="flex-1 py-3 text-gray-600 font-bold bg-gray-100 rounded-xl hover:bg-gray-200 transition"
                                >
                                    {t('btn.cancel')}
                                </button>
                            )}
                            <button 
                                onClick={handleConfirm} 
                                className="flex-1 py-3 bg-pink-400 text-white font-bold rounded-xl hover:bg-pink-500 shadow-lg shadow-pink-100 transition"
                            >
                                {t('btn.ok')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DialogContext.Provider>
    );
};
