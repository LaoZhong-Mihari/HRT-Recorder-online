import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { QRCodeCanvas } from 'qrcode.react';
import { encryptData, DoseEvent } from '../../logic';
import { X, QrCode, Download, Lock, Copy } from 'lucide-react';

const ExportModal = ({ isOpen, onClose, onExport, events, weight }: { isOpen: boolean, onClose: () => void, onExport: (encrypt: boolean) => void, events: DoseEvent[], weight: number }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'qr' | 'json'>('qr');
    const [isEncrypted, setIsEncrypted] = useState(false);
    const [displayData, setDisplayData] = useState("");
    const [password, setPassword] = useState("");
    const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

    const rawDataString = useMemo(() => events.length ? JSON.stringify({ weight, events }) : '', [events, weight]);

    useEffect(() => {
        if (!isOpen) {
            setIsEncrypted(false);
            setActiveTab('qr');
        }
    }, [isOpen]);

    useEffect(() => {
        let active = true;
        const update = async () => {
            if (!isOpen || !rawDataString) {
                if (active) setDisplayData("");
                return;
            }
            if (isEncrypted) {
                const { data, password: pw } = await encryptData(rawDataString);
                if (active) {
                    setDisplayData(data);
                    setPassword(pw);
                }
            } else {
                if (active) {
                    setDisplayData(rawDataString);
                    setPassword("");
                }
            }
        };
        update();
        return () => { active = false; };
    }, [isOpen, isEncrypted, rawDataString]);

    const handleCopy = async () => {
        if (!displayData) return;
        try {
            await navigator.clipboard.writeText(displayData);
            setCopyState('copied');
            setTimeout(() => setCopyState('idle'), 2000);
        } catch (err) {
            console.error(err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 transform transition-all scale-100 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">{t('export.title')}</h3>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex p-1 bg-gray-100 rounded-xl mb-6 shrink-0">
                    <button
                        onClick={() => setActiveTab('qr')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'qr' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
                    >
                        <QrCode size={16} />
                        QR Code
                    </button>
                    <button
                        onClick={() => setActiveTab('json')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'json' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
                    >
                        <Download size={16} />
                        JSON
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0">
                    {activeTab === 'qr' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl">
                                <label className="text-sm font-bold text-gray-700">{t('qr.encrypt_label')}</label>
                                <div 
                                    className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${isEncrypted ? 'bg-pink-400' : 'bg-gray-300'}`} 
                                    onClick={() => setIsEncrypted(!isEncrypted)}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${isEncrypted ? 'translate-x-4' : ''}`} />
                                </div>
                            </div>

                            {displayData ? (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative">
                                        <QRCodeCanvas value={displayData} size={200} includeMargin level="M" />
                                        {isEncrypted && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <Lock className="text-pink-400/20 w-24 h-24" />
                                            </div>
                                        )}
                                    </div>
                                    
                                    {isEncrypted && password && (
                                        <div className="w-full bg-pink-50 border border-pink-100 p-3 rounded-xl text-center">
                                            <p className="text-xs text-pink-400 font-bold uppercase mb-1">{t('export.password_title')}</p>
                                            <p className="font-mono font-bold text-gray-800 text-lg select-all">{password}</p>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleCopy}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition"
                                    >
                                        <Copy size={16} /> {copyState === 'copied' ? t('qr.copied') : t('qr.copy')}
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-400">
                                    <p>{t('qr.export.empty')}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'json' && (
                        <div className="space-y-3">
                            <button onClick={() => onExport(false)} className="w-full py-4 bg-gray-50 border border-gray-200 text-gray-800 font-bold rounded-xl hover:bg-gray-100 hover:border-gray-300 transition flex items-center justify-center gap-2">
                                <Download size={20} />
                                JSON
                            </button>
                            <button onClick={() => onExport(true)} className="w-full py-4 bg-pink-50 border border-pink-200 text-pink-600 font-bold rounded-xl hover:bg-pink-100 hover:border-pink-300 transition flex items-center justify-center gap-2">
                                <Lock size={20} />
                                JSON ({t('qr.encrypt_label')})
                            </button>
                            <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
                                {t('drawer.save_hint')}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
