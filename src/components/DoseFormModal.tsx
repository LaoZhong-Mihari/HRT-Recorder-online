import React, { useState, useEffect, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from '../contexts/LanguageContext';
import { useDialog } from '../contexts/DialogContext';
import CustomSelect from './CustomSelect';
import { getRouteIcon } from '../utils/helpers';
import { Route, Ester, ExtraKey, DoseEvent, SL_TIER_ORDER, SublingualTierParams, getBioavailabilityMultiplier, getToE2Factor } from '../../logic';
import { Calendar, X, Clock, Info, Save } from 'lucide-react';

const DoseFormModal = ({ isOpen, onClose, eventToEdit, onSave }: any) => {
    const { t } = useTranslation();
    const { showDialog } = useDialog();
    const dateInputRef = useRef<HTMLInputElement>(null);
    
    // Form State
    const [dateStr, setDateStr] = useState("");
    const [route, setRoute] = useState<Route>(Route.injection);
    const [ester, setEster] = useState<Ester>(Ester.EV);
    
    const [rawDose, setRawDose] = useState("");
    const [e2Dose, setE2Dose] = useState("");
    
    const [patchMode, setPatchMode] = useState<"dose" | "rate">("dose");
    const [patchRate, setPatchRate] = useState("");

    const [gelSite, setGelSite] = useState(0); // Index in GEL_SITE_ORDER

    const [slTier, setSlTier] = useState(2);
    const [useCustomTheta, setUseCustomTheta] = useState(false);
    const [customTheta, setCustomTheta] = useState("");
    const [lastEditedField, setLastEditedField] = useState<'raw' | 'bio'>('bio');

    const slExtras = useMemo(() => {
        if (route !== Route.sublingual) return null;
        if (useCustomTheta) {
            const parsed = parseFloat(customTheta);
            const theta = Number.isFinite(parsed) ? parsed : 0.11;
            const clamped = Math.max(0, Math.min(1, theta));
            return { [ExtraKey.sublingualTheta]: clamped };
        }
        return { [ExtraKey.sublingualTier]: slTier };
    }, [route, useCustomTheta, customTheta, slTier]);

    const bioMultiplier = useMemo(() => {
        const extrasForCalc = slExtras ?? {};
        if (route === Route.gel) {
            extrasForCalc[ExtraKey.gelSite] = gelSite;
        }
        return getBioavailabilityMultiplier(route, ester, extrasForCalc);
    }, [route, ester, slExtras, gelSite]);

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
                    setLastEditedField('bio');
                } else {
                    setPatchMode("dose");
                    // Fix: Show E2 Equivalent (MW only), not Bioavailable dose
                    const factor = getToE2Factor(eventToEdit.ester);
                    const e2Val = eventToEdit.doseMG * factor;
                    setE2Dose(e2Val.toFixed(3));

                    if (eventToEdit.ester !== Ester.E2) {
                        setRawDose(eventToEdit.doseMG.toFixed(3));
                        setLastEditedField('raw');
                    } else {
                        setRawDose(eventToEdit.doseMG.toFixed(3));
                        setLastEditedField('bio');
                    }
                }

                if (eventToEdit.route === Route.sublingual) {
                    if (eventToEdit.extras[ExtraKey.sublingualTier] !== undefined) {
                         setSlTier(eventToEdit.extras[ExtraKey.sublingualTier]);
                         setUseCustomTheta(false);
                         setCustomTheta("");
                    } else if (eventToEdit.extras[ExtraKey.sublingualTheta] !== undefined) {
                        setUseCustomTheta(true);
                        setCustomTheta(eventToEdit.extras[ExtraKey.sublingualTheta].toString());
                    } else {
                        setUseCustomTheta(false);
                        setCustomTheta("");
                    }
                } else {
                    setUseCustomTheta(false);
                    setCustomTheta("");
                }

                if (eventToEdit.route === Route.gel) {
                    setGelSite(eventToEdit.extras[ExtraKey.gelSite] ?? 0);
                } else {
                    setGelSite(0);
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
                setGelSite(0);
                setUseCustomTheta(false);
                setCustomTheta("");
                setLastEditedField('bio');
            }
        }
    }, [isOpen, eventToEdit]);

    const handleRawChange = (val: string) => {
        setRawDose(val);
        setLastEditedField('raw');
        const v = parseFloat(val);
        if (!isNaN(v)) {
            const factor = getToE2Factor(ester) || 1;
            const e2Equivalent = v * factor; // convert compound mg -> E2 equivalent (pre-bio)
            setE2Dose(e2Equivalent.toFixed(3));
        } else {
            setE2Dose("");
        }
    };

    const handleE2Change = (val: string) => {
        setE2Dose(val);
        setLastEditedField('bio');
        const v = parseFloat(val);
        if (!isNaN(v)) {
            const factor = getToE2Factor(ester) || 1;
            if (ester === Ester.E2) {
                setRawDose(v.toFixed(3));
            } else {
                setRawDose((v / factor).toFixed(3));
            }
        } else {
            setRawDose("");
        }
    };

    useEffect(() => {
        if (lastEditedField === 'raw' && rawDose) {
            handleRawChange(rawDose);
        }
    }, [bioMultiplier, ester, route]);

    useEffect(() => {
        if (lastEditedField === 'bio' && e2Dose) {
            handleE2Change(e2Dose);
        }
    }, [bioMultiplier, ester, route]);

    const handleSave = () => {
        let timeH = new Date(dateStr).getTime() / 3600000;
        if (isNaN(timeH)) {
            timeH = new Date().getTime() / 3600000;
        }
        
        let e2Equivalent = parseFloat(e2Dose);
        if (isNaN(e2Equivalent)) e2Equivalent = 0;
        // For EV injection/sublingual/oral, derive E2-equivalent from raw dose (hidden field) to avoid drift
        if (ester === Ester.EV && (route === Route.injection || route === Route.sublingual || route === Route.oral)) {
            const rawVal = parseFloat(rawDose);
            if (Number.isFinite(rawVal)) {
                const factor = getToE2Factor(ester) || 1;
                e2Equivalent = rawVal * factor;
            }
        }
        let finalDose = 0;

        const extras: any = {};
        const nonPositiveMsg = t('error.nonPositive');

        if (route === Route.patchApply && patchMode === "rate") {
            const rateVal = parseFloat(patchRate);
            if (!Number.isFinite(rateVal) || rateVal <= 0) {
                showDialog('alert', nonPositiveMsg);
                return;
            }
            finalDose = 0;
            extras[ExtraKey.releaseRateUGPerDay] = rateVal;
        } else if (route === Route.patchApply && patchMode === "dose") {
            const raw = parseFloat(rawDose);
            if (!Number.isFinite(raw) || raw <= 0) {
                showDialog('alert', nonPositiveMsg);
                return;
            }
            finalDose = raw; // patch input is compound dose on patch
        } else if (route !== Route.patchRemove) {
            if (!Number.isFinite(e2Equivalent) || e2Equivalent <= 0) {
                showDialog('alert', nonPositiveMsg);
                return;
            }
            const factor = getToE2Factor(ester) || 1;
            finalDose = (ester === Ester.E2) ? e2Equivalent : e2Equivalent / factor; // store compound mg
        }

        if (route === Route.sublingual && slExtras) {
            Object.assign(extras, slExtras);
        }

        if (route === Route.gel) {
            extras[ExtraKey.gelSite] = gelSite;
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

    const activeTheta = useCustomTheta
        ? (slExtras && slExtras[ExtraKey.sublingualTheta] !== undefined
            ? slExtras[ExtraKey.sublingualTheta]!
            : 0.11)
        : currentTheta;
    const bioDoseVal = parseFloat(e2Dose) || 0;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md h-[85vh] max-h-[90vh] transform transition-all scale-100 flex flex-col overflow-hidden">
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
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('field.time')}</label>
                        <div className="flex items-center gap-3">
                            <input 
                                ref={dateInputRef}
                                type="datetime-local" 
                                value={dateStr} 
                                onChange={e => setDateStr(e.target.value)} 
                                className="text-xl font-bold text-gray-900 font-mono bg-transparent border-none p-0 focus:ring-0 focus:outline-none"
                            />
                            <button 
                                onClick={() => dateInputRef.current?.focus()}
                                className="p-2 bg-gray-100 hover:bg-pink-100 text-gray-600 hover:text-pink-600 rounded-lg transition-colors"
                            >
                                <Calendar size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Route */}
                    <CustomSelect
                        label={t('field.route')}
                        value={route}
                        onChange={(val) => setRoute(val as Route)}
                        options={Object.values(Route).map(r => ({
                            value: r,
                            label: t(`route.${r}`),
                            icon: getRouteIcon(r)
                        }))}
                    />

                    {route === Route.patchRemove && (
                        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 p-3 rounded-xl">
                            {t('beta.patch_remove')}
                        </div>
                    )}

                    {route !== Route.patchRemove && (
                        <>
                            {/* Ester Selection */}
                            {availableEsters.length > 1 && (
                                <CustomSelect
                                    label={t('field.ester')}
                                    value={ester}
                                    onChange={(val) => setEster(val as Ester)}
                                    options={availableEsters.map(e => ({
                                        value: e,
                                        label: t(`ester.${e}`),
                                    }))}
                                />
                            )}

                            {/* Gel Site Selector */}
                            {route === Route.gel && (
                                <div className="mb-4 space-y-2">
                                    <label className="block text-sm font-bold text-gray-700">{t('field.gel_site')}</label>
                                    <div className="p-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-gray-400 text-sm font-medium select-none">
                                        {t('gel.site_disabled')}
                                    </div>
                                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 p-3 rounded-xl">
                                        {t('beta.gel')}
                                    </div>
                                </div>
                            )}

                            {/* Patch Mode */}
                            {route === Route.patchApply && (
                                <div className="space-y-2">
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
                                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 p-3 rounded-xl">
                                        {t('beta.patch')}
                                    </div>
                                </div>
                            )}

                            {/* Dose Inputs */}
                            {(route !== Route.patchApply || patchMode === "dose") && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        {(ester !== Ester.E2) && (
                                            <div className={`space-y-2 ${ (ester === Ester.EV && (route === Route.injection || route === Route.sublingual || route === Route.oral)) ? 'col-span-2' : '' }`}>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">{t('field.dose_raw')}</label>
                                                <input 
                                                    type="number" inputMode="decimal"
                                                    value={rawDose} onChange={e => handleRawChange(e.target.value)} 
                                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 outline-none font-mono" 
                                                    placeholder="0.0"
                                                />
                                            </div>
                                        )}
                                        {!(ester === Ester.EV && (route === Route.injection || route === Route.sublingual || route === Route.oral)) && (
                                            <div className={`space-y-2 ${(ester === Ester.E2 && route !== Route.gel && route !== Route.oral && route !== Route.sublingual) ? "col-span-2" : ""}`}>
                                                <label className="block text-xs font-bold text-pink-400 uppercase tracking-wider">
                                                    {route === Route.patchApply ? t('field.dose_raw') : t('field.dose_e2')}
                                                </label>
                                                <input 
                                                    type="number" inputMode="decimal"
                                                    value={e2Dose} onChange={e => handleE2Change(e.target.value)} 
                                                    className="w-full p-4 bg-pink-50 border border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-300 outline-none font-bold text-pink-500 font-mono" 
                                                    placeholder="0.0"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    {(ester === Ester.EV && (route === Route.injection || route === Route.sublingual || route === Route.oral)) && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            {t('field.dose_e2')}: {e2Dose ? `${e2Dose} mg` : '--'}
                                        </p>
                                    )}
                                </>
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
                                                <span>Absorption θ ≈ {currentTheta.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <input type="number" step="0.01" max="1" min="0" value={customTheta} onChange={e => setCustomTheta(e.target.value)} className="w-full p-3 border border-teal-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" placeholder="0.0 - 1.0" />
                                            <div className="text-xs text-teal-600 bg-white/50 p-2 rounded-lg flex justify-between items-center">
                                                <span>Absorption θ ≈ {activeTheta.toFixed(2)}</span>
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

export default DoseFormModal;
