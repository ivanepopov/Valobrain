/**
 * Series History Page
 *
 * Data surface for viewing match history.
 */
import { useState, useEffect } from "react";
import Series from "../components/Series.tsx";
import Match from "../components/Match.tsx";
import type { Team } from "../types/Team.ts";
import type { TeamStats } from "../types/TeamStats.ts";
import type { SeriesStats } from "../types/SeriesStats.ts";
import { formatDuration } from "../utils/formatters.ts";

type Props = {
    team: Team | null;
    stats: TeamStats | null;
    allSeriesData: SeriesStats[];
    isLoadingSeries: boolean;
}

const MatchHistory = ({ team, stats, allSeriesData, isLoadingSeries }: Props) => {
    const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
    const [selectedGameIndex, setSelectedGameIndex] = useState(0);

    // Auto-select the first series once data arrives
    useEffect(() => {
        if (allSeriesData.length > 0 && !selectedSeriesId) {
            const firstSeriesId = allSeriesData[0].seriesState.games[0]?.id.split('-')[0];
            setSelectedSeriesId(firstSeriesId);
        }
    }, [allSeriesData, selectedSeriesId]);

    const selectedSeriesData = allSeriesData.find(s =>
        s.seriesState.games.some(game => game.id.startsWith(selectedSeriesId || "NEVER_MATCH"))
    );

    const handleSeriesClick = (seriesId: string) => {
        setSelectedSeriesId(seriesId);
        setSelectedGameIndex(0);
    };

    if (!team) return <div className="text-gray-500 italic">Select a team</div>;

    if (!stats || isLoadingSeries) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 bg-gray-900/50 border border-gray-800 rounded-xl animate-pulse" />
                    ))}
                </div>
                <div className="hidden lg:block h-96 bg-gray-900/20 border border-gray-800 rounded-2xl animate-pulse" />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            {/* Left Column: Series List */}
            <div className="lg:col-span-4 space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-4 custom-scrollbar">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-4 px-1">
                    Match Timeline
                </h3>
                {allSeriesData.length === 0 ? (
                    <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-8 text-center">
                        <p className="text-gray-500 font-medium italic">No match history available</p>
                    </div>
                ) : (
                    allSeriesData.map((data) => {
                        const seriesId = data.seriesState.games[0]?.id.split('-')[0];

                        return (
                            <div
                                key={seriesId}
                                onClick={() => handleSeriesClick(seriesId)}
                                className={`cursor-pointer transition-all duration-200 ${
                                    selectedSeriesId === seriesId 
                                    ? "ring-1 ring-blue-500 ring-offset-1 ring-offset-gray-950 rounded-xl" 
                                    : "opacity-70 hover:opacity-100"
                                }`}
                            >
                                <Series
                                    seriesData={data}
                                    team={team}
                                />
                            </div>
                        );
                    })
                )}
            </div>

            {/* Right Column: Detailed View */}
            <div className="lg:col-span-8 sticky top-6">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-4 px-1">
                    Series Breakdown
                </h3>
                <div className="bg-gray-900/40 border border-gray-800 rounded-2xl min-h-[600px] shadow-2xl backdrop-blur-sm overflow-hidden">
                    {selectedSeriesData ? (
                        <div className="p-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center justify-between mb-8 border-b border-gray-800 pb-6">
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tighter italic text-white">
                                        vs {selectedSeriesData.seriesState.teams.find(t => t.id !== team.id)?.name}
                                    </h2>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">
                                        {selectedSeriesData.seriesState.format}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-gray-600 font-mono block mb-1">REF_ID: {selectedSeriesId?.substring(0, 8)}</span>
                                </div>
                            </div>

                            {/* Map Selection Navigation */}
                            <div className="flex gap-3 mb-8">
                                {selectedSeriesData.seriesState.games.map((game, index) => {
                                    const gameTeam = game.teams.find(t => t.name === team.name);
                                    const isWin = gameTeam?.won;
                                    const isActive = selectedGameIndex === index;

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => setSelectedGameIndex(index)}
                                            className={`flex-1 py-3 px-4 rounded-xl border transition-all text-left relative overflow-hidden ${
                                                isActive
                                                    ? isWin 
                                                        ? "bg-green-500/10 border-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                                                        : "bg-red-500/10 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                                                    : "bg-gray-900/40 border-gray-800 text-gray-500 hover:border-gray-700"
                                            }`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[10px] font-black uppercase opacity-50">Map {index + 1}</span>
                                                <span className={`text-[10px] font-bold ${isWin ? 'text-green-500' : 'text-red-500'}`}>
                                                    {isWin ? 'WIN' : 'LOSS'}
                                                </span>
                                            </div>
                                            <div className="text-sm font-black uppercase tracking-tight">{game.map.name}</div>
                                            <div className="text-[10px] opacity-40 font-mono mt-0.5">{formatDuration(game.duration)}</div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <Match 
                                    match={selectedSeriesData.seriesState.games[selectedGameIndex]} 
                                    team={team} 
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[600px] text-center p-12">
                            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-600">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            </div>
                            <h4 className="text-gray-300 font-bold mb-2">No Series Selected</h4>
                            <p className="text-gray-500 text-sm max-w-xs">
                                Select a match from the timeline to view detailed performance metrics.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MatchHistory;