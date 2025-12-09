import React, { useState, useEffect, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Settings, Plus, Activity, Calendar, Languages, Upload, Download, Trash2, Info, Github } from 'lucide-react';
import { useTranslation, LanguageProvider } from './contexts/LanguageContext';
import { useDialog, DialogProvider } from './contexts/DialogContext';
import { APP_VERSION } from './constants';
import { DoseEvent, Route, Ester, ExtraKey, SimulationResult, runSimulation, interpolateConcentration, encryptData, decryptData, getToE2Factor } from '../logic';
import { formatDate, formatTime, getRouteIcon } from './utils/helpers';
import { Lang } from './i18n/translations';
import ResultChart from './components/ResultChart';
import WeightEditorModal from './components/WeightEditorModal';
import DoseFormModal from './components/DoseFormModal';
import ImportModal from './components/ImportModal';
import ExportModal from './components/ExportModal';
import PasswordDisplayModal from './components/PasswordDisplayModal';
import PasswordInputModal from './components/PasswordInputModal';
import CustomSelect from './components/CustomSelect';

const AppContent = () => {
    const { t, lang, setLang } = useTranslation();
    const { showDialog } = useDialog();

    const [events, setEvents] = useState<DoseEvent[]>(() => {
        const saved = localStorage.getItem('hrt-events');
        return saved ? JSON.parse(saved) : [];
    });
    const [weight, setWeight] = useState<number>(() => {
        const saved = localStorage.getItem('hrt-weight');
        return saved ? parseFloat(saved) : 70.0;
    });

    const [simulation, setSimulation] = useState<SimulationResult | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<DoseEvent | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState("");
    const [isPasswordDisplayOpen, setIsPasswordDisplayOpen] = useState(false);
    const [isPasswordInputOpen, setIsPasswordInputOpen] = useState(false);

    const [currentView, setCurrentView] = useState<'home' | 'history' | 'settings'>('home');
    const mainScrollRef = useRef<HTMLDivElement>(null);

    const languageOptions = useMemo(() => ([
        { value: 'zh', label: '简体中文', icon: <span className="text-lg" role="img" aria-label="CN">🇨🇳</span> },
        { value: 'zh-TW', label: '正體中文', icon: <span className="text-lg" role="img" aria-label="TW">🤔</span> },
        { value: 'yue', label: '粵語', icon: <span className="text-lg" role="img" aria-label="HK">🇭🇰</span> },
        { value: 'en', label: 'English', icon: <span className="text-lg" role="img" aria-label="US">🇺🇸</span> },
        { value: 'ru', label: 'Русский', icon: <span className="text-lg" role="img" aria-label="RU">🇷🇺</span> },
        { value: 'uk', label: 'Українська', icon: <span className="text-lg" role="img" aria-label="UA">🇺🇦</span> },
    ]), []);

    useEffect(() => {
        const shouldLock = isExportModalOpen || isPasswordDisplayOpen || isPasswordInputOpen || isWeightModalOpen || isFormOpen || isImportModalOpen;
        document.body.style.overflow = shouldLock ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isExportModalOpen, isPasswordDisplayOpen, isPasswordInputOpen, isWeightModalOpen, isFormOpen, isImportModalOpen]);
    const [pendingImportText, setPendingImportText] = useState<string | null>(null);

    useEffect(() => { localStorage.setItem('hrt-events', JSON.stringify(events)); }, [events]);
    useEffect(() => { localStorage.setItem('hrt-weight', weight.toString()); }, [weight]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Reset scroll when switching tabs to avoid carrying over deep scroll positions
    useEffect(() => {
        const el = mainScrollRef.current;
        if (el) el.scrollTo({ top: 0, behavior: 'auto' });
    }, [currentView]);

    useEffect(() => {
        if (events.length > 0) {
            const res = runSimulation(events, weight);
            setSimulation(res);
        } else {
            setSimulation(null);
        }
    }, [events, weight]);

    const currentLevel = useMemo(() => {
        if (!simulation) return 0;
        const h = currentTime.getTime() / 3600000;
        return interpolateConcentration(simulation, h) || 0;
    }, [simulation, currentTime]);

    const groupedEvents = useMemo(() => {
        const sorted = [...events].sort((a, b) => b.timeH - a.timeH);
        const groups: Record<string, DoseEvent[]> = {};
        sorted.forEach(e => {
            const d = formatDate(new Date(e.timeH * 3600000), lang);
            if (!groups[d]) groups[d] = [];
            groups[d].push(e);
        });
        return groups;
    }, [events, lang]);

    const sanitizeImportedEvents = (raw: any): DoseEvent[] => {
        if (!Array.isArray(raw)) throw new Error('Invalid format');
        return raw
            .map((item: any) => {
                if (!item || typeof item !== 'object') return null;
                const { route, timeH, doseMG, ester, extras } = item;
                if (!Object.values(Route).includes(route)) return null;
                const timeNum = Number(timeH);
                if (!Number.isFinite(timeNum)) return null;
                const doseNum = Number(doseMG);
                const validEster = Object.values(Ester).includes(ester) ? ester : Ester.E2;
                const sanitizedExtras = (extras && typeof extras === 'object') ? extras : {};
                return {
                    id: typeof item.id === 'string' ? item.id : uuidv4(),
                    route,
                    timeH: timeNum,
                    doseMG: Number.isFinite(doseNum) ? doseNum : 0,
                    ester: validEster,
                    extras: sanitizedExtras
                } as DoseEvent;
            })
            .filter((item): item is DoseEvent => item !== null);
    };

    const processImportedData = (parsed: any): boolean => {
        try {
            let newEvents: DoseEvent[] = [];
            let newWeight: number | undefined = undefined;

            if (Array.isArray(parsed)) {
                newEvents = sanitizeImportedEvents(parsed);
            } else if (typeof parsed === 'object' && parsed !== null) {
                if (Array.isArray(parsed.events)) {
                    newEvents = sanitizeImportedEvents(parsed.events);
                }
                if (typeof parsed.weight === 'number' && parsed.weight > 0) {
                    newWeight = parsed.weight;
                }
            }

            if (!newEvents.length && !newWeight) throw new Error('No valid entries');
            
            if (newEvents.length > 0) setEvents(newEvents);
            if (newWeight !== undefined) setWeight(newWeight);

            showDialog('alert', t('drawer.import_success'));
            return true;
        } catch (err) {
                console.error(err);
                showDialog('alert', t('drawer.import_error'));
                return false;
        }
    };

    const importEventsFromJson = (text: string): boolean => {
        try {
            const parsed = JSON.parse(text);
            
            if (parsed.encrypted && parsed.iv && parsed.salt && parsed.data) {
                setPendingImportText(text);
                setIsPasswordInputOpen(true);
                return true; 
            }

            return processImportedData(parsed);
        } catch (err) {
            console.error(err);
            showDialog('alert', t('drawer.import_error'));
            return false;
        }
    };

    const handleAddEvent = () => {
        setEditingEvent(null);
        setIsFormOpen(true);
    };

    const handleEditEvent = (e: DoseEvent) => {
        setEditingEvent(e);
        setIsFormOpen(true);
    };

    const handleSaveEvent = (e: DoseEvent) => {
        setEvents(prev => {
            const exists = prev.find(p => p.id === e.id);
            if (exists) {
                return prev.map(p => p.id === e.id ? e : p);
            }
            return [...prev, e];
        });
    };

    const handleDeleteEvent = (id: string) => {
        showDialog('confirm', t('timeline.delete_confirm'), () => {
            setEvents(prev => prev.filter(e => e.id !== id));
        });
    };

    const handleClearAllEvents = () => {
        if (!events.length) return;
        showDialog('confirm', t('drawer.clear_confirm'), () => {
            setEvents([]);
        });
    };

    const handleSaveDosages = () => {
        if (events.length === 0) {
            showDialog('alert', t('drawer.empty_export'));
            return;
        }
        setIsExportModalOpen(true);
    };

    const downloadFile = (data: string, filename: string) => {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleExportConfirm = async (encrypt: boolean) => {
        setIsExportModalOpen(false);
        const exportData = {
            meta: { version: 1, exportedAt: new Date().toISOString() },
            weight: weight,
            events: events
        };
        const json = JSON.stringify(exportData, null, 2);
        
        if (encrypt) {
            const { data, password } = await encryptData(json);
            setGeneratedPassword(password);
            setIsPasswordDisplayOpen(true);
            downloadFile(data, `hrt-dosages-encrypted-${new Date().toISOString().split('T')[0]}.json`);
        } else {
            downloadFile(json, `hrt-dosages-${new Date().toISOString().split('T')[0]}.json`);
        }
    };

    const handlePasswordSubmit = async (password: string) => {
        if (!pendingImportText) return;
        const decrypted = await decryptData(pendingImportText, password);
        if (decrypted) {
            setIsPasswordInputOpen(false);
            setPendingImportText(null);
            try {
                const parsed = JSON.parse(decrypted);
                processImportedData(parsed);
            } catch (e) {
                showDialog('alert', t('import.decrypt_error'));
            }
        } else {
            showDialog('alert', t('import.decrypt_error'));
        }
    };

    return (
        <div className="h-screen w-full bg-white flex flex-col font-sans text-gray-900 select-none overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden w-full max-w-lg mx-auto bg-white shadow-2xl">
                {/* Header */}
                {currentView === 'home' && (
                    <header className="bg-white px-8 pt-12 pb-8 rounded-b-[2.5rem] shadow-xl shadow-gray-100 z-10 sticky top-0">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h1 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{t('status.estimate')}</h1>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-6xl font-black text-gray-900 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700">
                                        {currentLevel.toFixed(0)}
                                    </span>
                                    <span className="text-xl font-bold text-gray-400">pg/mL</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 items-end" />
                        </div>
                        <div className="flex gap-4">
                             <button onClick={() => setIsWeightModalOpen(true)} className="flex items-center gap-2 bg-gray-50 pl-3 pr-4 py-2 rounded-full text-sm font-bold text-gray-600 hover:bg-gray-100 transition">
                                <Settings size={16} className="text-gray-400" />
                                {t('status.weight')}: {weight} kg
                            </button>
                        </div>
                    </header>
                )}

                <main ref={mainScrollRef} className="flex-1 overflow-y-auto bg-white w-full scrollbar-hide px-6 py-8">
                    {/* Chart */}
                    {currentView === 'home' && (
                        <ResultChart sim={simulation} />
                    )}

                    {/* Timeline */}
                    {currentView === 'history' && (
                        <div className="space-y-6 pt-8">
                            <div className="flex items-center justify-between px-2">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                                   <Activity size={24} className="text-pink-400" /> {t('timeline.title')}
                                </h2>
                                <button 
                                    onClick={handleAddEvent}
                                    className="bg-gray-900 text-white px-4 py-2 rounded-full shadow-lg shadow-gray-900/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform"
                                >
                                    <Plus size={16} />
                                    <span className="font-bold text-sm">{t('btn.add')}</span>
                                </button>
                            </div>

                            {Object.keys(groupedEvents).length === 0 && (
                                <div className="text-center py-12 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
                                   <p>{t('timeline.empty')}</p>
                                </div>
                            )}

                            {Object.entries(groupedEvents).map(([date, items]) => (
                                <div key={date} className="relative">
                                    <div className="sticky top-0 bg-gray-50/95 backdrop-blur py-2 px-2 z-0 flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-pink-200"></div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{date}</span>
                                    </div>
                                    <div className="space-y-3">
                                        {(items as DoseEvent[]).map(ev => (
                                            <div 
                                                key={ev.id} 
                                                onClick={() => handleEditEvent(ev)}
                                                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md hover:border-pink-100 transition-all cursor-pointer group relative overflow-hidden"
                                            >
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${ev.route === Route.injection ? 'bg-pink-50' : 'bg-gray-50'}`}>
                                                    {getRouteIcon(ev.route)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-bold text-gray-900 text-sm truncate">
                                                            {ev.route === Route.patchRemove ? t('route.patchRemove') : t(`ester.${ev.ester}`)}
                                                        </span>
                                                        <span className="font-mono text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                                                            {formatTime(new Date(ev.timeH * 3600000))}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 font-medium space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="truncate">{t(`route.${ev.route}`)}</span>
                                                            {ev.extras[ExtraKey.releaseRateUGPerDay] && (
                                                                <>
                                                                    <span className="text-gray-300">•</span>
                                                                    <span className="text-gray-700">{`${ev.extras[ExtraKey.releaseRateUGPerDay]} µg/d`}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                        {ev.route !== Route.patchRemove && !ev.extras[ExtraKey.releaseRateUGPerDay] && (
                                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-700">
                                                                <span>{`${t('timeline.dose_label')}: ${ev.doseMG.toFixed(2)} mg`}</span>
                                                                {ev.ester !== Ester.E2 && (
                                                                    <span className="text-gray-500 text-xs">
                                                                        {`(${ (ev.doseMG * getToE2Factor(ev.ester)).toFixed(2) } mg E2)`}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteEvent(ev.id); }} 
                                                    className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent flex items-center justify-end pr-4 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 size={18} className="text-pink-400 hover:text-pink-500" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Settings */}
                    {currentView === 'settings' && (
                        <div className="space-y-8 pt-4">
                            <div className="px-2">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                                    <Settings size={24} className="text-pink-400" /> {t('nav.settings')}
                                </h2>
                            </div>

                            {/* General Settings */}
                            <div className="space-y-3">
                                <h3 className="px-2 text-xs font-bold text-gray-400 uppercase tracking-wider">{t('settings.group.general')}</h3>
                                <div className="w-full p-4 rounded-2xl border border-gray-200 bg-white space-y-3">
                                    <div className="flex items-start gap-3">
                                        <Languages className="text-blue-500" size={20} />
                                        <div className="text-left">
                                            <p className="font-bold text-gray-900 text-sm">{t('drawer.lang')}</p>
                                            <p className="text-xs text-gray-500">{t('drawer.lang_hint')}</p>
                                        </div>
                                        <div className="ml-auto text-xs font-bold text-gray-500">{lang.toUpperCase()}</div>
                                    </div>
                                    <CustomSelect
                                        value={lang}
                                        onChange={(val) => setLang(val as Lang)}
                                        options={languageOptions}
                                    />
                                </div>
                            </div>

                            {/* Data Management */}
                            <div className="space-y-3">
                                <h3 className="px-2 text-xs font-bold text-gray-400 uppercase tracking-wider">{t('settings.group.data')}</h3>
                                <div className="space-y-3">
                                    <button
                                        onClick={() => setIsImportModalOpen(true)}
                                        className="w-full flex items-center gap-3 p-4 rounded-2xl border border-gray-200 hover:border-teal-200 hover:bg-teal-50 transition bg-white"
                                    >
                                        <Upload className="text-teal-500" size={20} />
                                        <div className="text-left">
                                            <p className="font-bold text-gray-900 text-sm">{t('import.title')}</p>
                                            <p className="text-xs text-gray-500">{t('drawer.import_hint')}</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={handleSaveDosages}
                                        className="w-full flex items-center gap-3 p-4 rounded-2xl border border-gray-200 hover:border-pink-200 hover:bg-pink-50 transition bg-white"
                                    >
                                        <Download className="text-pink-400" size={20} />
                                        <div className="text-left">
                                            <p className="font-bold text-gray-900 text-sm">{t('export.title')}</p>
                                            <p className="text-xs text-gray-500">{t('drawer.save_hint')}</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={handleClearAllEvents}
                                        disabled={!events.length}
                                        className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition bg-white ${events.length ? 'border-gray-200 hover:border-red-200 hover:bg-red-50' : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'}`}
                                    >
                                        <Trash2 className="text-red-400" size={20} />
                                        <div className="text-left">
                                            <p className="font-bold text-gray-900 text-sm">{t('drawer.clear')}</p>
                                            <p className="text-xs text-gray-500">{t('drawer.clear_confirm')}</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* About */}
                            <div className="space-y-3">
                                <h3 className="px-2 text-xs font-bold text-gray-400 uppercase tracking-wider">{t('settings.group.about')}</h3>
                                <div className="space-y-3">
                                    <button
                                        onClick={() => {
                                            showDialog('confirm', t('drawer.model_confirm'), () => {
                                                window.open('https://misaka23323.com/articles/estrogen-model-summary', '_blank');
                                            });
                                        }}
                                        className="w-full flex items-center gap-3 p-4 rounded-2xl border border-gray-200 hover:border-purple-200 hover:bg-purple-50 transition bg-white"
                                    >
                                        <Info className="text-purple-500" size={20} />
                                        <div className="text-left">
                                            <p className="font-bold text-gray-900 text-sm">{t('drawer.model_title')}</p>
                                            <p className="text-xs text-gray-500">{t('drawer.model_desc')}</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            showDialog('confirm', t('drawer.github_confirm'), () => {
                                                window.open('https://github.com/SmirnovaOyama/Oyama-s-HRT-recorder', '_blank');
                                            });
                                        }}
                                        className="w-full flex items-center gap-3 p-4 rounded-2xl border border-gray-200 hover:border-gray-800 hover:bg-gray-50 transition bg-white"
                                    >
                                        <Github className="text-gray-700" size={20} />
                                        <div className="text-left">
                                            <p className="font-bold text-gray-900 text-sm">{t('drawer.github')}</p>
                                            <p className="text-xs text-gray-500">{t('drawer.github_desc')}</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Version Footer */}
                            <div className="pt-4 pb-8 flex justify-center">
                                <p className="text-xs font-medium text-gray-300">
                                    {APP_VERSION}
                                </p>
                            </div>
                        </div>
                    )}
                </main>

                {/* Bottom Navigation */}
                <nav className="bg-white border-t border-gray-100 px-6 py-4 flex justify-around items-center z-20 safe-area-pb shrink-0">
                    <button 
                        onClick={() => setCurrentView('home')}
                        className={`flex flex-col items-center gap-1 transition-colors ${currentView === 'home' ? 'text-pink-500' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Activity size={24} />
                        <span className="text-xs font-bold">{t('nav.home')}</span>
                    </button>
                    <button 
                        onClick={() => setCurrentView('history')}
                        className={`flex flex-col items-center gap-1 transition-colors ${currentView === 'history' ? 'text-pink-500' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Calendar size={24} />
                        <span className="text-xs font-bold">{t('nav.history')}</span>
                    </button>
                    <button 
                        onClick={() => setCurrentView('settings')}
                        className={`flex flex-col items-center gap-1 transition-colors ${currentView === 'settings' ? 'text-pink-500' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Settings size={24} />
                        <span className="text-xs font-bold">{t('nav.settings')}</span>
                    </button>
                </nav>
            </div>

            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onExport={handleExportConfirm}
                events={events}
                weight={weight}
            />

            <PasswordDisplayModal
                isOpen={isPasswordDisplayOpen}
                onClose={() => setIsPasswordDisplayOpen(false)}
                password={generatedPassword}
            />

            <PasswordInputModal
                isOpen={isPasswordInputOpen}
                onClose={() => setIsPasswordInputOpen(false)}
                onConfirm={handlePasswordSubmit}
            />

            <WeightEditorModal 
                isOpen={isWeightModalOpen} 
                onClose={() => setIsWeightModalOpen(false)} 
                currentWeight={weight} 
                onSave={setWeight} 
            />
            
            <DoseFormModal 
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                eventToEdit={editingEvent}
                onSave={handleSaveEvent}
            />

            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImportJson={(payload) => {
                    const ok = importEventsFromJson(payload);
                    return ok;
                }}
            />
        </div>
    );
};

const App = () => (
    <LanguageProvider>
        <DialogProvider>
            <AppContent />
        </DialogProvider>
    </LanguageProvider>
);

export default App;
