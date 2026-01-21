import React from 'react';
import {Filter} from "lucide-react";

const VALORANT_MAPS = ["All", "Abyss", "Ascent", "Bind", "Breeze", "Corrode", "Fracture", "Haven", "Icebox", "Lotus", "Pearl", "Split", "Sunset"];

type Props = {
    setSelectedMap: React.Dispatch<React.SetStateAction<string>>;
    selectedMap: string;
    selectedSeries?: string | null;
}

const MapFilter = ({ setSelectedMap, selectedMap, selectedSeries }: Props) => {

    let className;
    if (selectedSeries == null) {
        className = `bg-slate-900/50 border border-slate-800 p-1.5 rounded-xl flex items-center gap-1 overflow-x-auto custom-scrollbar max-w-full scroll-smooth`;
    } else {
        className = `bg-slate-900/50 border border-slate-800 p-1.5 rounded-xl flex items-center gap-1 overflow-x-auto custom-scrollbar max-w-full scroll-smooth transition-opacity ${selectedSeries !== 'All' ? 'opacity-50 pointer-events-none' : ''}`;
    }

    return (
        <div className={className}>
            <div className="flex items-center gap-2 px-3 py-1.5 border-r border-slate-800 mr-1 shrink-0">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Map</span>
            </div>
            {VALORANT_MAPS.map(m => (
                <button
                    key={m}
                    onClick={() => setSelectedMap(m)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shrink-0 ${
                        selectedMap === m
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                >
                    {m}
                </button>
            ))}
        </div>
    );
};

export default MapFilter;