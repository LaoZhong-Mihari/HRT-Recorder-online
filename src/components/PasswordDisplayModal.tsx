import React, { useState } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { Copy } from 'lucide-react';

const PasswordDisplayModal = ({ isOpen, onClose, password }: { isOpen: boolean, onClose: () => void, password: string }) => {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100">
                <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">{t('export.password_title')}</h3>
                <p className="text-sm text-gray-500 mb-6 text-center">{t('export.password_desc')}</p>
                
                <div className="bg-gray-100 p-4 rounded-xl mb-6 flex items-center justify-between">
                    <span className="font-mono text-lg font-bold text-gray-800 tracking-wider">{password}</span>
                    <button onClick={handleCopy} className="p-2 hover:bg-gray-200 rounded-lg transition text-gray-600">
                        {copied ? <span className="text-xs font-bold text-green-600">{t('qr.copied')}</span> : <Copy size={20} />}
                    </button>
                </div>

                <button onClick={onClose} className="w-full py-3.5 bg-pink-400 text-white font-bold rounded-xl hover:bg-pink-500 shadow-lg shadow-pink-100 transition">
                    {t('btn.ok')}
                </button>
            </div>
        </div>
    );
};

export default PasswordDisplayModal;
