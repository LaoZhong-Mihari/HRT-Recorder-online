import React, { useState, useEffect } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useDialog } from '../contexts/DialogContext';
import { Info } from 'lucide-react';

const WeightEditorModal = ({ isOpen, onClose, currentWeight, onSave }: any) => {
    const { t } = useTranslation();
    const { showDialog } = useDialog();
    const [weightStr, setWeightStr] = useState(currentWeight.toString());

    useEffect(() => setWeightStr(currentWeight.toString()), [currentWeight, isOpen]);

    const handleSave = () => {
        const val = parseFloat(weightStr);
        if (!isNaN(val) && val > 0) {
            onSave(val);
            onClose();
        } else {
            showDialog('alert', t('error.nonPositive'));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">{t('modal.weight.title')}</h3>
                
                <div className="flex justify-center mb-8">
                    <div className="relative flex flex-col items-center">
                        <input 
                            type="number" 
                            inputMode="decimal"
                            value={weightStr}
                            onChange={(e) => setWeightStr(e.target.value)}
                            className="text-5xl font-black text-pink-400 tabular-nums w-48 text-center bg-transparent border-b-2 border-pink-100 focus:border-pink-400 outline-none transition-colors pb-2"
                            placeholder="0.0"
                            autoFocus
                        />
                        <div className="text-sm font-medium text-gray-400 mt-2">kg</div>
                    </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl mb-6 flex gap-3 items-start">
                    <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                        {t('modal.weight.desc')}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3.5 text-gray-600 font-bold bg-gray-100 rounded-xl hover:bg-gray-200 transition">{t('btn.cancel')}</button>
                    <button onClick={handleSave} className="flex-1 py-3.5 bg-pink-400 text-white font-bold rounded-xl hover:bg-pink-500 shadow-lg shadow-pink-100 transition">{t('btn.save')}</button>
                </div>
            </div>
        </div>
    );
};

export default WeightEditorModal;
