import React from 'react';
import type { Team } from "../types/Team.ts";
import type { SeriesStats } from "../types/SeriesStats.ts";

interface SeriesProps {
    seriesData: SeriesStats;
    team: Team | null;
}

const Series: React.FC<SeriesProps> = ({ seriesData, team }) => {
    const series = seriesData.seriesState;
    const opponent = series.teams.find(t => t.name !== team?.name);
    const mainTeam = series.teams.find(t => t.name === team?.name);

    const winCount = series.games.filter(g =>
        g.teams.find(t => t.name === team?.name)?.won
    ).length;

    const lossCount = series.games.length - winCount;

    return (
        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-5 hover:border-blue-500/50 transition-all group shadow-lg">
            {/* Header: Format and Status */}
            <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black font-mono text-gray-500 uppercase tracking-[0.2em]">
                    {series.format} Series
                </span>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-md tracking-wider ${
                    mainTeam?.won 
                        ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                        : 'bg-red-500/10 text-red-500 border border-red-500/20'
                }`}>
                    {mainTeam?.won ? 'SERIES WIN' : 'SERIES LOSS'}
                </span>
            </div>

            {/* Main Content: Opponent and Score */}
            <div className="flex items-end justify-between">
                <div className="flex-1">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Opponent</p>
                    <h4 className="text-xl font-black text-white italic uppercase tracking-tighter group-hover:text-blue-400 transition-colors">
                        vs {opponent?.name || 'Unknown'}
                    </h4>
                </div>
                
                <div className="text-right">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Score</p>
                    <div className="text-2xl font-black italic tracking-tighter leading-none">
                        <span className={winCount > lossCount ? 'text-green-500' : 'text-gray-300'}>{winCount}</span>
                        <span className="text-gray-700 mx-1.5">-</span>
                        <span className={lossCount > winCount ? 'text-red-500' : 'text-gray-300'}>{lossCount}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Series;