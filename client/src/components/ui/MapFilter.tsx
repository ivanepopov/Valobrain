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
        className = `backdrop-blur-md bg-white/5 border border-white/10 p-1.5 rounded-xl flex items-center gap-1 overflow-x-auto custom-scrollbar max-w-full scroll-smooth`;
    } else {
        className = `backdrop-blur-md bg-white/5 border border-white/10 p-1.5 rounded-xl flex items-center gap-1 overflow-x-auto custom-scrollbar max-w-full scroll-smooth transition-opacity ${selectedSeries !== 'All' ? 'opacity-50 pointer-events-none' : ''}`;
    }

    return (
        <div className={className}>
            <div className="flex items-center gap-2 px-3 py-1.5 border-r border-white/10 mr-1 shrink-0">
                <Filter className="w-3.5 h-3.5 text-blue-200/70" />
                <span className="text-xs font-medium text-blue-200/70">Map</span>
            </div>
            {VALORANT_MAPS.map(m => (
                <button
                    key={m}
                    onClick={() => setSelectedMap(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                        selectedMap === m
                            ? 'bg-blue-900 text-white'
                            : 'text-blue-200/70 hover:text-white hover:bg-white/10'
                    }`}
                >
                    {m}
                </button>
            ))}
        </div>
    );
};

export default MapFilter;