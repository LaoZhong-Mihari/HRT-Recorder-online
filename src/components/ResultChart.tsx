import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { formatDate, formatTime } from '../utils/helpers';
import { SimulationResult } from '../../logic';
import { Activity, RotateCcw, ZoomIn } from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart
} from 'recharts';

const ResultChart = ({ sim }: { sim: SimulationResult | null }) => {
    const { t, lang } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const [xDomain, setXDomain] = useState<[number, number] | null>(null);
    const [isZoomed, setIsZoomed] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(2);
    const initializedRef = useRef(false);

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

    const defaultDomain = useMemo(() => {
        if (data.length === 0) return null;
        const min = data[0].time;
        const max = data[data.length - 1].time;
        return [min, max] as [number, number];
    }, [data]);

    // Update domain when data loads; default to 2x view
    useEffect(() => {
        if (!initializedRef.current && data.length > 0) {
            setZoomFactor(2);
            initializedRef.current = true;
            return;
        }

        if (!isZoomed && data.length > 0 && zoomLevel !== 2) {
            setZoomFactor(2);
        }
    }, [data, isZoomed, zoomLevel]);

    const setZoomFactor = (factor: number) => {
        const now = new Date().getTime();
        if (!data.length) return;
        const min = data[0].time;
        const max = data[data.length - 1].time;
        const totalRange = Math.max(max - min, 1);
        const minWidth = 24 * 3600 * 1000;
        const width = Math.max(totalRange / Math.max(1, factor), minWidth);
        let start = now - width / 2;
        let end = now + width / 2;
        if (start < min) {
            start = min;
            end = Math.min(min + width, max);
        }
        if (end > max) {
            end = max;
            start = Math.max(max - width, min);
        }
        setXDomain([start, end]);
        setZoomLevel(factor);
        setIsZoomed(factor !== 2);
    };

    const resetZoom = () => {
        setZoomFactor(2);
        setIsZoomed(false);
    };

    // Compute total timeline and slider parameters for panning
    const totalMin = data.length > 0 ? data[0].time : 0;
    const totalMax = data.length > 0 ? data[data.length - 1].time : totalMin;
    const defaultVisibleWidth = defaultDomain ? (defaultDomain[1] - defaultDomain[0]) : (totalMax - totalMin);
    const visibleWidth = xDomain
        ? (xDomain[1] - xDomain[0])
        : (defaultVisibleWidth || totalMax - totalMin || 1);
    const sliderMin = totalMin;
    const sliderMax = Math.max(totalMax - visibleWidth, sliderMin);
    const sliderValue = xDomain ? xDomain[0] : (defaultDomain ? defaultDomain[0] : sliderMin);

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
            <div className="flex flex-col gap-2 mb-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-sm font-bold text-gray-500 tracking-wider">{t('chart.title')}</h2>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 shadow-inner shadow-gray-100">
                            {[2, 4, 6].map((factor) => (
                                <button
                                    key={factor}
                                    onClick={() => setZoomFactor(factor)}
                                    className="px-3 py-1 text-xs font-bold text-gray-600 rounded-lg transition-all bg-white hover:bg-pink-50 hover:text-pink-500 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                                >
                                    {factor}x
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                {isZoomed && (
                    <button 
                        onClick={resetZoom}
                        className="self-start flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold transition-all animate-in fade-in hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                    >
                        <RotateCcw size={12} /> {t('chart.reset')}
                    </button>
                )}
            </div>
            
            <div 
                ref={containerRef}
                className="h-72 w-full touch-none cursor-default"
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

export default ResultChart;
