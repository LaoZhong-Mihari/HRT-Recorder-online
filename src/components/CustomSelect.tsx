import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const CustomSelect = ({ value, onChange, options, label }: { value: string, onChange: (val: string) => void, options: { value: string, label: string, icon?: React.ReactNode }[], label?: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.value === value);

    return (
        <div className="space-y-2" ref={containerRef}>
            {label && <label className="block text-sm font-bold text-gray-700">{label}</label>}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 outline-none flex items-center justify-between transition-all"
                >
                    <div className="flex items-center gap-2">
                        {selectedOption?.icon}
                        <span className="font-medium text-gray-800">{selectedOption?.label || value}</span>
                    </div>
                    <ChevronDown size={20} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                        {options.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full p-3 text-left flex items-center gap-2 hover:bg-pink-50 transition-colors
                                    ${opt.value === value ? 'bg-pink-50 text-pink-600 font-bold' : 'text-gray-700'}`}
                            >
                                {opt.icon}
                                <span>{opt.label}</span>
                                {opt.value === value && <div className="ml-auto w-2 h-2 rounded-full bg-pink-400" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomSelect;
