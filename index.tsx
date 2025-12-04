
import React, { useState, useEffect, useMemo, createContext, useContext, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { v4 as uuidv4 } from 'uuid';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart
} from 'recharts';
import { 
    Plus, Trash2, Syringe, Pill, Droplet, Sticker, X, 
    Settings, ChevronDown, ChevronUp, Save, Clock, Languages, Calendar,
    Activity, Info, ZoomIn, RotateCcw, Menu, Download, Upload
} from 'lucide-react';
import {
    DoseEvent, Route, Ester, ExtraKey, SimulationResult,
    runSimulation, interpolateConcentration, getToE2Factor, EsterInfo, SublingualTierParams, CorePK, SL_TIER_ORDER
} from './logic.ts';

// --- Localization ---

type Lang = 'zh' | 'en';

const TRANSLATIONS = {
    zh: {
        "app.title": "HRT 模拟记录",
        "status.estimate": "当前估算浓度",
        "status.weight": "体重",
        "chart.title": "雌二醇浓度 (pg/mL)",
        "chart.tooltip.conc": "浓度",
        "chart.tooltip.time": "时间",
        "chart.now": "现在",
        "chart.reset": "重置缩放",
        "timeline.title": "用药记录",
        "timeline.empty": "暂无记录，请点击右下角添加",
        "timeline.delete_confirm": "确定删除这条记录吗？",
        "drawer.title": "剂量管理工具",
        "drawer.desc": "导出、备份、清空或导入剂量记录。",
        "drawer.clear": "清空所有剂量",
        "drawer.clear_confirm": "确定要删除所有剂量记录吗？此操作无法撤销。",
        "drawer.save": "保存剂量 JSON",
        "drawer.save_hint": "下载当前剂量记录的 JSON 备份。",
        "drawer.import": "导入剂量 JSON",
        "drawer.import_hint": "从 JSON 文件导入剂量记录并覆盖当前数据。",
        "drawer.empty_export": "当前没有可保存的剂量记录。",
        "drawer.import_error": "导入失败，请确认文件内容有效。",
        "drawer.import_success": "导入成功，已更新剂量记录。",
        "drawer.close": "关闭侧栏",
        
        "btn.add": "新增给药",
        "btn.save": "保存记录",
        "btn.cancel": "取消",
        "btn.edit": "编辑",

        "modal.weight.title": "设置体重",
        "modal.weight.desc": "体重用于计算分布容积 (Vd ≈ 2.0 L/kg)，直接影响血药浓度的峰值估算。",
        "modal.dose.add_title": "新增用药",
        "modal.dose.edit_title": "编辑用药",

        "field.time": "给药时间",
        "field.route": "给药途径",
        "field.ester": "药物种类",
        "field.dose_raw": "药物剂量 (mg)",
        "field.dose_e2": "等效 E2 (mg)",
        "field.patch_mode": "输入模式",
        "field.patch_rate": "释放速率 (µg/天)",
        "field.patch_total": "总剂量 (mg)",
        "field.sl_duration": "含服时长",
        "field.sl_custom": "自定义 θ",
        
        "sl.instructions": "按照建议的含服时间尽量少吞咽口水，并且在药物完全溶解后也继续含着溶解药物的唾液直至达到自己的目标时间。",
        "sl.mode.quick": "快速 (2m)",
        "sl.mode.casual": "随意 (5m)",
        "sl.mode.standard": "标准 (10m)",
        "sl.mode.strict": "严格 (15m)",
        
        "route.injection": "肌注 (Injection)",
        "route.oral": "口服 (Oral)",
        "route.sublingual": "舌下 (Sublingual)",
        "route.gel": "凝胶 (Gel)",
        "route.patchApply": "贴片 (Patch Apply)",
        "route.patchRemove": "移除贴片 (Remove)",

        "ester.E2": "雌二醇 (E2)",
        "ester.EV": "戊酸雌二醇 (EV)",
        "ester.EB": "苯甲酸雌二醇 (EB)",
        "ester.EC": "环戊丙酸雌二醇 (EC)",
        "ester.EN": "庚酸雌二醇 (EN)",
    },
    en: {
        "app.title": "HRT Recorder",
        "status.estimate": "Current Estimate",
        "status.weight": "Weight",
        "chart.title": "E2 Concentration Graph (pg/mL)",
        "chart.tooltip.conc": "Conc.",
        "chart.tooltip.time": "Time",
        "chart.now": "NOW",
        "chart.reset": "Reset Zoom",
        "timeline.title": "Dose History",
        "timeline.empty": "No records yet. Tap + to add.",
        "timeline.delete_confirm": "Are you sure you want to delete this record?",
        "drawer.title": "Dose Utilities",
        "drawer.desc": "Export, backup, clear, or import your dosage history.",
        "drawer.clear": "Clear All Dosages",
        "drawer.clear_confirm": "Clear every dosage entry? This cannot be undone.",
        "drawer.save": "Save Dosages (JSON)",
        "drawer.save_hint": "Download a JSON backup of the current list.",
        "drawer.import": "Import Dosages (JSON)",
        "drawer.import_hint": "Load dosages from a JSON file and replace the current list.",
        "drawer.empty_export": "There are no dosages to export yet.",
        "drawer.import_error": "Import failed. Please check that the file is valid.",
        "drawer.import_success": "Imported dosages successfully.",
        "drawer.close": "Close Panel",

        "btn.add": "Add Dose",
        "btn.save": "Save Record",
        "btn.cancel": "Cancel",
        "btn.edit": "Edit",

        "modal.weight.title": "Body Weight",
        "modal.weight.desc": "Weight is used to calculate volume of distribution (Vd ≈ 2.0 L/kg), affecting peak concentration estimates.",
        "modal.dose.add_title": "Add Dose",
        "modal.dose.edit_title": "Edit Dose",

        "field.time": "Time",
        "field.route": "Route",
        "field.ester": "Compound",
        "field.dose_raw": "Dose (mg)",
        "field.dose_e2": "E2 Equivalent (mg)",
        "field.patch_mode": "Input Mode",
        "field.patch_rate": "Rate (µg/day)",
        "field.patch_total": "Total Dose (mg)",
        "field.sl_duration": "Hold Duration",
        "field.sl_custom": "Custom θ",

        "sl.instructions": "While holding the tablet for the suggested time, try to swallow as little saliva as possible and continue holding the dissolved saliva even after the tablet fully melts until you reach your target time.",
        "sl.mode.quick": "Quick (2m)",
        "sl.mode.casual": "Casual (5m)",
        "sl.mode.standard": "Standard (10m)",
        "sl.mode.strict": "Strict (15m)",

        "route.injection": "Injection",
        "route.oral": "Oral",
        "route.sublingual": "Sublingual",
        "route.gel": "Gel",
        "route.patchApply": "Patch Apply",
        "route.patchRemove": "Patch Remove",

        "ester.E2": "Estradiol (E2)",
        "ester.EV": "Estradiol Valerate (EV)",
        "ester.EB": "Estradiol Benzoate (EB)",
        "ester.EC": "Estradiol Cypionate (EC)",
        "ester.EN": "Estradiol Enanthate (EN)",
    }
};

const LanguageContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string } | null>(null);

const useTranslation = () => {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error("useTranslation must be used within LanguageProvider");
    return ctx;
};

const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
    const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('hrt-lang') as Lang) || 'zh');

    useEffect(() => {
        localStorage.setItem('hrt-lang', lang);
        document.title = lang === 'zh' ? "HRT 模拟记录" : "HRT Recorder";
    }, [lang]);

    const t = (key: string) => {
        return (TRANSLATIONS[lang] as any)[key] || key;
    };

    return (
        <LanguageContext.Provider value={{ lang, setLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

// --- Helper Functions ---

const formatDate = (date: Date, lang: Lang) => {
    return date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
};

const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
};

const getRouteIcon = (route: Route) => {
    switch (route) {
        case Route.injection: return <Syringe className="w-5 h-5 text-pink-400" />;
        case Route.oral: return <Pill className="w-5 h-5 text-blue-500" />;
        case Route.sublingual: return <Pill className="w-5 h-5 text-teal-500" />;
        case Route.gel: return <Droplet className="w-5 h-5 text-cyan-500" />;
        case Route.patchApply: return <Sticker className="w-5 h-5 text-orange-500" />;
        case Route.patchRemove: return <X className="w-5 h-5 text-gray-400" />;
    }
};

// --- Components ---

const WeightEditorModal = ({ isOpen, onClose, currentWeight, onSave }: any) => {
    const { t } = useTranslation();
    const [weight, setWeight] = useState(currentWeight);

    useEffect(() => setWeight(currentWeight), [currentWeight, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">{t('modal.weight.title')}</h3>
                <div className="flex items-center justify-between mb-8 px-4">
                    <button onClick={() => setWeight((w: number) => Math.max(30, Number((w - 0.5).toFixed(1))))} className="p-4 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 transition">
                        <ChevronDown size={24} />
                    </button>
                    <div className="text-center">
                        <div className="text-5xl font-black text-pink-400 tabular-nums">{weight.toFixed(1)}</div>
                        <div className="text-sm font-medium text-gray-400 mt-1">kg</div>
                    </div>
                    <button onClick={() => setWeight((w: number) => Math.min(200, Number((w + 0.5).toFixed(1))))} className="p-4 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 transition">
                        <ChevronUp size={24} />
                    </button>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl mb-6 flex gap-3 items-start">
                    <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                        {t('modal.weight.desc')}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3.5 text-gray-600 font-bold bg-gray-100 rounded-xl hover:bg-gray-200 transition">{t('btn.cancel')}</button>
                    <button onClick={() => { onSave(weight); onClose(); }} className="flex-1 py-3.5 bg-pink-400 text-white font-bold rounded-xl hover:bg-pink-500 shadow-lg shadow-pink-100 transition">{t('btn.save')}</button>
                </div>
            </div>
        </div>
    );
};

const DoseFormModal = ({ isOpen, onClose, eventToEdit, onSave }: any) => {
    const { t } = useTranslation();
    
    // Form State
    const [dateStr, setDateStr] = useState("");
    const [route, setRoute] = useState<Route>(Route.injection);
    const [ester, setEster] = useState<Ester>(Ester.EV);
    
    const [rawDose, setRawDose] = useState("");
    const [e2Dose, setE2Dose] = useState("");
    
    const [patchMode, setPatchMode] = useState<"dose" | "rate">("dose");
    const [patchRate, setPatchRate] = useState("");

    const [slTier, setSlTier] = useState(2);
    const [useCustomTheta, setUseCustomTheta] = useState(false);
    const [customTheta, setCustomTheta] = useState("");

    useEffect(() => {
        if (isOpen) {
            if (eventToEdit) {
                const d = new Date(eventToEdit.timeH * 3600000);
                const iso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                setDateStr(iso);
                setRoute(eventToEdit.route);
                setEster(eventToEdit.ester);
                
                if (eventToEdit.route === Route.patchApply && eventToEdit.extras[ExtraKey.releaseRateUGPerDay]) {
                    setPatchMode("rate");
                    setPatchRate(eventToEdit.extras[ExtraKey.releaseRateUGPerDay].toString());
                    setE2Dose("");
                    setRawDose("");
                } else {
                    setPatchMode("dose");
                    setE2Dose(eventToEdit.doseMG.toFixed(3));
                    if (eventToEdit.ester !== Ester.E2) {
                        const factor = getToE2Factor(eventToEdit.ester);
                        setRawDose((eventToEdit.doseMG / factor).toFixed(3));
                    } else {
                        setRawDose(eventToEdit.doseMG.toFixed(3));
                    }
                }

                if (eventToEdit.route === Route.sublingual) {
                    if (eventToEdit.extras[ExtraKey.sublingualTier] !== undefined) {
                         setSlTier(eventToEdit.extras[ExtraKey.sublingualTier]);
                         setUseCustomTheta(false);
                    } else if (eventToEdit.extras[ExtraKey.sublingualTheta] !== undefined) {
                        setUseCustomTheta(true);
                        setCustomTheta(eventToEdit.extras[ExtraKey.sublingualTheta].toString());
                    }
                }

            } else {
                const now = new Date();
                const iso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                setDateStr(iso);
                setRoute(Route.injection);
                setEster(Ester.EV);
                setRawDose("");
                setE2Dose("");
                setPatchMode("dose");
                setPatchRate("");
                setSlTier(2);
                setUseCustomTheta(false);
            }
        }
    }, [isOpen, eventToEdit]);

    const handleRawChange = (val: string) => {
        setRawDose(val);
        const v = parseFloat(val);
        if (!isNaN(v)) {
            const factor = getToE2Factor(ester);
            setE2Dose((v * factor).toFixed(3));
        } else {
            setE2Dose("");
        }
    };

    const handleE2Change = (val: string) => {
        setE2Dose(val);
        const v = parseFloat(val);
        if (!isNaN(v)) {
            if (ester === Ester.E2) {
                setRawDose(val);
            } else {
                const factor = getToE2Factor(ester);
                setRawDose((v / factor).toFixed(3));
            }
        }
    };

    useEffect(() => {
        if (rawDose) handleRawChange(rawDose);
    }, [ester]);

    const handleSave = () => {
        let timeH = new Date(dateStr).getTime() / 3600000;
        if (isNaN(timeH)) {
            timeH = new Date().getTime() / 3600000;
        }
        
        let finalDose = parseFloat(e2Dose);
        if (isNaN(finalDose)) finalDose = 0;

        const extras: any = {};

        if (route === Route.patchApply && patchMode === "rate") {
            finalDose = 0;
            extras[ExtraKey.releaseRateUGPerDay] = parseFloat(patchRate) || 0;
        }

        if (route === Route.sublingual) {
            if (useCustomTheta) {
                extras[ExtraKey.sublingualTheta] = parseFloat(customTheta) || 0.11;
            } else {
                extras[ExtraKey.sublingualTier] = slTier;
            }
        }

        const newEvent: DoseEvent = {
            id: eventToEdit?.id || uuidv4(),
            route,
            ester: (route === Route.patchRemove || route === Route.patchApply || route === Route.gel) ? Ester.E2 : ester,
            timeH,
            doseMG: finalDose,
            extras
        };

        onSave(newEvent);
        onClose();
    };

    // Calculate availableEsters unconditionally
    const availableEsters = useMemo(() => {
        switch (route) {
            case Route.injection: return [Ester.EB, Ester.EV, Ester.EC, Ester.EN];
            case Route.oral: 
            case Route.sublingual: return [Ester.E2, Ester.EV];
            default: return [Ester.E2];
        }
    }, [route]);

    // Ensure ester is valid when route changes (e.g. switching from Injection to Gel should force E2)
    useEffect(() => {
        if (!availableEsters.includes(ester)) {
            setEster(availableEsters[0]);
        }
    }, [availableEsters, ester]);

    if (!isOpen) return null;

    const tierKey = SL_TIER_ORDER[slTier] || "standard";
    const currentTheta = SublingualTierParams[tierKey]?.theta || 0.11;

    const activeTheta = useCustomTheta ? (parseFloat(customTheta) || 0) : currentTheta;
    const doseVal = parseFloat(e2Dose) || 0;
    const effectiveDose = doseVal * (activeTheta + (1 - activeTheta) * 0.03);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto transform transition-all scale-100 flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-xl font-bold text-gray-900">
                        {eventToEdit ? t('modal.dose.edit_title') : t('modal.dose.add_title')}
                    </h3>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                    {/* Time */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">{t('field.time')}</label>
                        <div className="relative">
                            <input 
                                type="datetime-local" 
                                value={dateStr} 
                                onChange={e => setDateStr(e.target.value)} 
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent outline-none font-medium text-gray-800"
                            />
                            <Calendar className="absolute right-4 top-4 text-gray-400 pointer-events-none" size={20} />
                        </div>
                    </div>

                    {/* Route */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">{t('field.route')}</label>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.values(Route).map(r => (
                                <button
                                    key={r}
                                    onClick={() => setRoute(r)}
                                    className={`p-3 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-2
                                        ${route === r 
                                            ? 'bg-pink-50 border-pink-300 text-pink-500 shadow-sm' 
                                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                >
                                    {getRouteIcon(r)}
                                    {t(`route.${r}`).split('(')[0].trim()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {route !== Route.patchRemove && (
                        <>
                            {/* Ester Selection */}
                            {availableEsters.length > 1 && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-700">{t('field.ester')}</label>
                                    <select 
                                        value={ester} 
                                        onChange={e => setEster(e.target.value as Ester)} 
                                        className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 outline-none appearance-none"
                                    >
                                        {availableEsters.map(e => (
                                            <option key={e} value={e}>{t(`ester.${e}`)}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Patch Mode */}
                            {route === Route.patchApply && (
                                <div className="p-1 bg-gray-100 rounded-xl flex">
                                    <button 
                                        onClick={() => setPatchMode("dose")} 
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${patchMode === "dose" ? "bg-white shadow text-gray-800" : "text-gray-500"}`}
                                    >
                                        {t('field.patch_total')}
                                    </button>
                                    <button 
                                        onClick={() => setPatchMode("rate")} 
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${patchMode === "rate" ? "bg-white shadow text-gray-800" : "text-gray-500"}`}
                                    >
                                        {t('field.patch_rate')}
                                    </button>
                                </div>
                            )}

                            {/* Dose Inputs */}
                            {(route !== Route.patchApply || patchMode === "dose") && (
                                <div className="grid grid-cols-2 gap-4">
                                    {ester !== Ester.E2 && (
                                        <div className="space-y-2">
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">{t('field.dose_raw')}</label>
                                            <input 
                                                type="number" inputMode="decimal"
                                                value={rawDose} onChange={e => handleRawChange(e.target.value)} 
                                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 outline-none font-mono" 
                                                placeholder="0.0"
                                            />
                                        </div>
                                    )}
                                    <div className={`space-y-2 ${ester === Ester.E2 ? "col-span-2" : ""}`}>
                                        <label className="block text-xs font-bold text-pink-400 uppercase tracking-wider">
                                            {ester === Ester.E2 ? t('field.dose_raw') : t('field.dose_e2')}
                                        </label>
                                        <input 
                                            type="number" inputMode="decimal"
                                            value={e2Dose} onChange={e => handleE2Change(e.target.value)} 
                                            className="w-full p-4 bg-pink-50 border border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-300 outline-none font-bold text-pink-500 font-mono" 
                                            placeholder="0.0"
                                        />
                                    </div>
                                </div>
                            )}

                            {route === Route.patchApply && patchMode === "rate" && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-700">{t('field.patch_rate')}</label>
                                    <input type="number" inputMode="decimal" value={patchRate} onChange={e => setPatchRate(e.target.value)} className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 outline-none" placeholder="e.g. 50" />
                                </div>
                            )}

                            {/* Sublingual Specifics */}
                            {route === Route.sublingual && (
                                <div className="bg-teal-50 p-4 rounded-2xl border border-teal-100 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-bold text-teal-800 flex items-center gap-2">
                                            <Clock size={16} /> {t('field.sl_duration')}
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-teal-600">{t('field.sl_custom')}</span>
                                            <div className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${useCustomTheta ? 'bg-teal-500' : 'bg-gray-300'}`} onClick={() => setUseCustomTheta(!useCustomTheta)}>
                                                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${useCustomTheta ? 'translate-x-4' : ''}`} />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {!useCustomTheta ? (
                                        <div className="space-y-3">
                                            <input 
                                                type="range" min="0" max="3" step="1" 
                                                value={slTier} onChange={e => setSlTier(parseInt(e.target.value))} 
                                                className="w-full h-2 bg-teal-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                                            />
                                            <div className="flex justify-between text-xs font-medium text-teal-700">
                                                <span>{t('sl.mode.quick')}</span>
                                                <span>{t('sl.mode.casual')}</span>
                                                <span>{t('sl.mode.standard')}</span>
                                                <span>{t('sl.mode.strict')}</span>
                                            </div>
                                            <div className="text-xs text-teal-600 bg-white/50 p-2 rounded-lg flex justify-between items-center">
                                                <span>Absorption θ ≈ {currentTheta}</span>
                                                <span className="font-bold" title="Estimated Bioavailable Dose">Eff. ≈ {effectiveDose.toFixed(3)} mg</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <input type="number" step="0.01" max="1" min="0" value={customTheta} onChange={e => setCustomTheta(e.target.value)} className="w-full p-3 border border-teal-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" placeholder="0.0 - 1.0" />
                                            <div className="text-xs text-teal-600 bg-white/50 p-2 rounded-lg flex justify-end">
                                                <span className="font-bold" title="Estimated Bioavailable Dose">Eff. ≈ {effectiveDose.toFixed(3)} mg</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-3 items-start p-3 bg-white rounded-xl border border-teal-100">
                                        <Info className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-teal-700 leading-relaxed text-justify">
                                            {t('sl.instructions')}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-3xl">
                    <button onClick={handleSave} className="w-full py-4 bg-pink-400 text-white text-lg font-bold rounded-xl hover:bg-pink-500 shadow-lg shadow-pink-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                        <Save size={20} /> {t('btn.save')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ResultChart = ({ sim }: { sim: SimulationResult | null }) => {
    const { t, lang } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const [xDomain, setXDomain] = useState<[number, number] | null>(null);
    const [isZoomed, setIsZoomed] = useState(false);

    // Track pointers for touch interaction
    const lastTouchRef = useRef<{ dist: number; center: number } | null>(null);
    const lastPanRef = useRef<number | null>(null);

    const data = useMemo(() => {
        if (!sim || sim.timeH.length === 0) return [];
        return sim.timeH.map((t, i) => ({
            time: t * 3600000, 
            conc: sim.concPGmL[i]
        }));
    }, [sim]);

    // Update domain when data loads, only if not zoomed
    useEffect(() => {
        if (data.length > 0 && !isZoomed) {
            setXDomain([data[0].time, data[data.length - 1].time]);
        }
    }, [data, isZoomed]);

    // Setup event listeners for the container to handle wheel/touch events passively/actively
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            if (!xDomain) return;

            const scale = e.deltaY > 0 ? 1.1 : 0.9;
            const [min, max] = xDomain;
            const domainWidth = max - min;
            const rect = el.getBoundingClientRect();
            
            // Calculate mouse position ratio (0 to 1) relative to chart width
            // Assuming standard padding in Recharts, but simple approximation works well for UX
            const mouseX = e.clientX - rect.left;
            const chartWidth = rect.width;
            
            // Recharts has some padding, let's approximate the drawing area (usually like 60px left, 20px right)
            // A simple 0-1 ratio based on full width is usually "good enough" for center-zoom feels
            const ratio = Math.max(0, Math.min(1, mouseX / chartWidth));
            
            const mouseTime = min + domainWidth * ratio;
            
            const MIN_ZOOM = 24 * 3600 * 1000; // 24 hours
            // Calculate max zoom based on data range
            const dataMin = data.length > 0 ? data[0].time : 0;
            const dataMax = data.length > 0 ? data[data.length - 1].time : 0;
            const MAX_ZOOM = Math.max(dataMax - dataMin, MIN_ZOOM);

            let newWidth = domainWidth * scale;
            if (newWidth < MIN_ZOOM) newWidth = MIN_ZOOM;
            if (newWidth > MAX_ZOOM) newWidth = MAX_ZOOM;
            
            const effectiveScale = newWidth / domainWidth;
            const newMin = mouseTime - (mouseTime - min) * effectiveScale;
            const newMax = newMin + newWidth;

            setXDomain([newMin, newMax]);
            setIsZoomed(true);
        };

        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [xDomain, data]);

    // --- Touch & Drag Logic ---
    
    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        // e.preventDefault(); // Don't prevent default here to allow click interactions unless moving
        if ('touches' in e && e.touches.length === 2) {
            // Pinch start
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            const center = (t1.clientX + t2.clientX) / 2;
            lastTouchRef.current = { dist, center };
        } else {
            // Pan start (Touch or Mouse)
            const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
            lastPanRef.current = clientX;
        }
    };

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (!xDomain) return;
        
        // Handle Pinch Zoom
        if ('touches' in e && e.touches.length === 2) {
            e.preventDefault(); // Stop page scroll
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            const center = (t1.clientX + t2.clientX) / 2;
            
            if (lastTouchRef.current) {
                const lastDist = lastTouchRef.current.dist;
                const scale = lastDist / dist;
                if (xDomain) {
                    const [min, max] = xDomain;
                    const width = max - min;
                    
                    // Zoom centered logic could be improved here, but simple center-screen zoom is robust
                    const MIN_ZOOM = 24 * 3600 * 1000; // 24 hours
                    // Calculate max zoom based on data range
                    const dataMin = data.length > 0 ? data[0].time : 0;
                    const dataMax = data.length > 0 ? data[data.length - 1].time : 0;
                    const MAX_ZOOM = Math.max(dataMax - dataMin, MIN_ZOOM);

                    let newWidth = width * scale;
                    if (newWidth < MIN_ZOOM) newWidth = MIN_ZOOM;
                    if (newWidth > MAX_ZOOM) newWidth = MAX_ZOOM;

                    const centerTime = min + width * 0.5; // Zoom center of view
                    
                    const newMin = centerTime - newWidth / 2;
                    const newMax = centerTime + newWidth / 2;
                    
                    setXDomain([newMin, newMax]);
                    setIsZoomed(true);
                }
            }
            lastTouchRef.current = { dist, center };
            return;
        }

        // Handle Pan (1 finger or mouse drag)
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        
        // Check if mouse is down (buttons === 1) for mouse events
        if (!('touches' in e) && e.buttons !== 1) {
            lastPanRef.current = null;
            return;
        }

        if (lastPanRef.current !== null) {
            // e.preventDefault(); // Only if we want to stop browser nav gestures
            const deltaX = lastPanRef.current - clientX;
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect && xDomain) {
                const [min, max] = xDomain;
                const width = max - min;
                // Convert pixel delta to time delta
                const timeDelta = (deltaX / rect.width) * width;
                setXDomain([min + timeDelta, max + timeDelta]);
                setIsZoomed(true);
            }
            lastPanRef.current = clientX;
        }
    };

    const handleTouchEnd = () => {
        lastTouchRef.current = null;
        lastPanRef.current = null;
    };

    const resetZoom = () => {
        if (data.length > 0) {
            setXDomain([data[0].time, data[data.length - 1].time]);
            setIsZoomed(false);
        }
    };

    // Compute total timeline and slider parameters for panning
    const totalMin = data.length > 0 ? data[0].time : 0;
    const totalMax = data.length > 0 ? data[data.length - 1].time : totalMin;
    // Default visible width when not zoomed: 25% of full range or full range if small
    const defaultVisibleWidth = Math.max((totalMax - totalMin) * 0.25, totalMax - totalMin);
    const visibleWidth = xDomain ? (xDomain[1] - xDomain[0]) : Math.min(defaultVisibleWidth, totalMax - totalMin || 1);
    const sliderMin = totalMin;
    const sliderMax = Math.max(totalMax - visibleWidth, sliderMin);
    const sliderValue = xDomain ? xDomain[0] : sliderMin;

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = Number(e.target.value);
        if (isNaN(v)) return;
        const start = Math.max(sliderMin, Math.min(v, sliderMax));
        const end = start + visibleWidth;
        setXDomain([start, end]);
        setIsZoomed(true);
    };

    const now = new Date().getTime();

    if (!sim || sim.timeH.length === 0) return (
        <div className="h-72 flex flex-col items-center justify-center text-gray-400 bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <Activity className="w-12 h-12 mb-4 text-gray-200" strokeWidth={1.5} />
            <p className="text-sm font-medium">{t('timeline.empty')}</p>
        </div>
    );
    
    return (
        <div className="bg-white p-6 rounded-3xl shadow-lg shadow-gray-100 border border-gray-100 relative overflow-hidden group">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-bold text-gray-500 tracking-wider">{t('chart.title')}</h2>
                {isZoomed && (
                    <button 
                        onClick={resetZoom}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold transition-all animate-in fade-in"
                    >
                        <RotateCcw size={12} /> {t('chart.reset')}
                    </button>
                )}
            </div>
            
            <div 
                ref={containerRef}
                className="h-72 w-full touch-none cursor-move"
                onMouseDown={handleTouchStart}
                onMouseMove={handleTouchMove}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                        <defs>
                            <linearGradient id="colorConc" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f472b6" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#f472b6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis 
                            dataKey="time" 
                            type="number" 
                            domain={xDomain || ['auto', 'auto']}
                            allowDataOverflow={true}
                            tickFormatter={(ms) => formatDate(new Date(ms), lang)}
                            tick={{fontSize: 10, fill: '#9ca3af'}}
                            minTickGap={40}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                        />
                        <YAxis 
                            tick={{fontSize: 10, fill: '#9ca3af'}}
                            width={45}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip 
                            labelFormatter={(ms) => `${formatDate(new Date(ms), lang)} ${formatTime(new Date(ms))}`}
                            formatter={(value: number) => [value.toFixed(1) + " pg/mL", t('chart.tooltip.conc')]}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                            itemStyle={{ color: '#f472b6', fontWeight: 'bold' }}
                            labelStyle={{ color: '#6b7280', marginBottom: '4px', fontSize: '12px' }}
                        />
                        <ReferenceLine x={now} stroke="#f9a8d4" strokeDasharray="3 3" label={{ value: t('chart.now'), fill: '#f9a8d4', fontSize: 10, position: 'insideTopLeft' }} />
                        <Area type="monotone" dataKey="conc" stroke="#f472b6" strokeWidth={3} fillOpacity={1} fill="url(#colorConc)" activeDot={{ r: 6, strokeWidth: 0 }} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Timeline slider for quick panning */}
            {data.length > 1 && (
                <div className="px-2 mt-3">
                    <input
                        type="range"
                        min={String(sliderMin)}
                        max={String(sliderMax)}
                        value={String(sliderValue)}
                        onChange={handleSliderChange}
                        disabled={sliderMax <= sliderMin}
                        className="w-full accent-pink-400"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>{formatDate(new Date(sliderValue), lang)}</span>
                        <span>{formatDate(new Date(sliderValue + visibleWidth), lang)}</span>
                    </div>
                </div>
            )}
            
            {/* Visual hint for zoom availability (fades out) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity duration-500">
                <ZoomIn className="w-16 h-16 text-gray-300" />
            </div>
        </div>
    );
};

// --- Main App ---

const AppContent = () => {
    const { t, lang, setLang } = useTranslation();

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
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { localStorage.setItem('hrt-events', JSON.stringify(events)); }, [events]);
    useEffect(() => { localStorage.setItem('hrt-weight', weight.toString()); }, [weight]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

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
        if (confirm(t('timeline.delete_confirm'))) {
            setEvents(prev => prev.filter(e => e.id !== id));
        }
    };

    const handleClearAllEvents = () => {
        if (!events.length) return;
        if (confirm(t('drawer.clear_confirm'))) {
            setEvents([]);
        }
    };

    const handleSaveDosages = () => {
        if (events.length === 0) {
            alert(t('drawer.empty_export'));
            return;
        }
        const data = JSON.stringify(events, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().split('T')[0];
        const link = document.createElement('a');
        link.href = url;
        link.download = `hrt-dosages-${timestamp}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const text = reader.result as string;
                const raw = JSON.parse(text);
                if (!Array.isArray(raw)) throw new Error('Invalid format');
                const sanitized: DoseEvent[] = raw
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

                if (!sanitized.length) throw new Error('No valid entries');
                setEvents(sanitized);
                alert(t('drawer.import_success'));
                setIsDrawerOpen(false);
            } catch (err) {
                console.error(err);
                alert(t('drawer.import_error'));
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    };

    const triggerImport = () => {
        fileInputRef.current?.click();
    };

    const dimmedStyle: React.CSSProperties | undefined = isDrawerOpen ? { filter: 'grayscale(0.8)', opacity: 0.45 } : undefined;

    return (
        <div className="relative min-h-screen pb-32 max-w-lg mx-auto bg-gray-50 shadow-2xl overflow-hidden font-sans">
            <div className="transition duration-300" style={dimmedStyle}>
                {/* Header */}
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
                        <div className="flex flex-col gap-2 items-end">
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setIsDrawerOpen(true)}
                                    className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                                    aria-label={t('drawer.title')}
                                >
                                    <Menu size={20} />
                                </button>
                                <button 
                                    onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                                    className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                                >
                                    <Languages size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4">
                         <button onClick={() => setIsWeightModalOpen(true)} className="flex items-center gap-2 bg-gray-50 pl-3 pr-4 py-2 rounded-full text-sm font-bold text-gray-600 hover:bg-gray-100 transition">
                            <Settings size={16} className="text-gray-400" />
                            {t('status.weight')}: {weight} kg
                        </button>
                    </div>
                </header>

                <main className="px-6 py-8 space-y-8">
                    {/* Chart */}
                    <ResultChart sim={simulation} />

                    {/* Timeline */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                               <Activity size={20} className="text-pink-400" /> {t('timeline.title')}
                            </h2>
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
                                                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                                     <span className="truncate">{t(`route.${ev.route}`).split('(')[0]}</span>
                                                     {ev.route !== Route.patchRemove && <span className="text-gray-300">•</span>}
                                                     <span className="text-gray-700">
                                                        {ev.route === Route.patchRemove ? "" : (
                                                            ev.extras[ExtraKey.releaseRateUGPerDay] 
                                                            ? `${ev.extras[ExtraKey.releaseRateUGPerDay]} µg/d`
                                                            : `${ev.doseMG.toFixed(2)} mg (E2)`
                                                        )}
                                                     </span>
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
                </main>
            </div>

            {/* FAB */}
            <div className="fixed bottom-8 left-0 right-0 flex justify-center pointer-events-none z-20">
                <button 
                    onClick={handleAddEvent}
                    disabled={isDrawerOpen}
                    className={`pointer-events-auto bg-gray-900 text-white pl-6 pr-8 py-4 rounded-full shadow-2xl shadow-gray-900/40 flex items-center gap-3 transition-transform group ${isDrawerOpen ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                >
                    <div className="bg-white/20 p-1 rounded-full group-hover:rotate-90 transition-transform duration-300">
                        <Plus size={24} />
                    </div>
                    <span className="font-bold text-lg">{t('btn.add')}</span>
                </button>
            </div>

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

            <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImportFile}
            />

            <div
                className={`absolute inset-0 bg-black/40 transition-opacity duration-300 z-30 ${isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsDrawerOpen(false)}
            />

            <aside
                className={`absolute top-0 right-0 h-full w-80 max-w-full bg-white shadow-2xl z-40 transition-transform duration-300 flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
                role="dialog"
                aria-label={t('drawer.title')}
            >
                <div className="p-6 border-b border-gray-100 flex items-start justify-between">
                    <div>
                        <p className="text-xs font-semibold text-pink-400 uppercase tracking-wide">{t('drawer.title')}</p>
                        <p className="text-sm text-gray-500 mt-1 leading-relaxed">{t('drawer.desc')}</p>
                    </div>
                    <button
                        onClick={() => setIsDrawerOpen(false)}
                        className="p-2 rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100"
                        aria-label={t('drawer.close')}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto space-y-4">
                    <button
                        onClick={handleSaveDosages}
                        className="w-full flex items-center gap-3 p-4 rounded-2xl border border-gray-200 hover:border-pink-200 hover:bg-pink-50 transition"
                    >
                        <Download className="text-pink-400" size={20} />
                        <div className="text-left">
                            <p className="font-bold text-gray-900 text-sm">{t('drawer.save')}</p>
                            <p className="text-xs text-gray-500">{t('drawer.save_hint')}</p>
                        </div>
                    </button>

                    <button
                        onClick={triggerImport}
                        className="w-full flex items-center gap-3 p-4 rounded-2xl border border-gray-200 hover:border-teal-200 hover:bg-teal-50 transition"
                    >
                        <Upload className="text-teal-500" size={20} />
                        <div className="text-left">
                            <p className="font-bold text-gray-900 text-sm">{t('drawer.import')}</p>
                            <p className="text-xs text-gray-500">{t('drawer.import_hint')}</p>
                        </div>
                    </button>

                    <button
                        onClick={handleClearAllEvents}
                        disabled={!events.length}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition ${events.length ? 'border-gray-200 hover:border-red-200 hover:bg-red-50' : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'}`}
                    >
                        <Trash2 className="text-red-400" size={20} />
                        <div className="text-left">
                            <p className="font-bold text-gray-900 text-sm">{t('drawer.clear')}</p>
                            <p className="text-xs text-gray-500">{t('drawer.clear_confirm')}</p>
                        </div>
                    </button>
                </div>

                <div className="p-6 border-t border-gray-100">
                    <button
                        onClick={() => setIsDrawerOpen(false)}
                        className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition"
                    >
                        {t('drawer.close')}
                    </button>
                </div>
            </aside>
        </div>
    );
};

const App = () => (
    <LanguageProvider>
        <AppContent />
    </LanguageProvider>
);

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
