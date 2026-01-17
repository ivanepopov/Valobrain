import type {SeriesStats} from "../types/SeriesStats.ts";
import {useEffect, useState} from "react";
import getSeriesStats from "../services/getSeriesStats.ts";
import type {Team} from "../types/Team.ts";
import Match from "./Match.tsx";

type Props = {
    seriesId: string;
    team: Team | null;
}

function Series({ seriesId, team }: Props) {

    if (!team) return null;

    const [seriesStats, setSeriesStats] = useState<SeriesStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        async function fetchSeriesData() {
            setLoading(true);
            try {
                const stats = await getSeriesStats(seriesId);
                setSeriesStats(stats);

            } catch (error) {
                console.error("Failed to fetch series stats:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchSeriesData();
    }, [seriesId, team.id]);

    if (loading) return <div className="w-full h-20 bg-gray-700/50 animate-pulse rounded-lg" />;
    if (!seriesStats?.seriesState) return null;

    const hasWon = seriesStats.seriesState.teams.find(t => t.id === team.id)?.won;
    const opposingTeam = seriesStats.seriesState.teams.find(t => t.id !== team.id);

    return (
        <div className="flex flex-col w-full overflow-hidden rounded-lg border border-white/5 bg-gray-900/40 transition-all hover:bg-gray-900/60">
            {/* Main Series Header */}
            <div
                className={`flex items-center justify-between p-4 cursor-pointer select-none ${
                    hasWon ? "border-l-4 border-green-500" : "border-l-4 border-red-600"
                }`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-6">
                    {/* User Team */}
                    <div className="flex items-center gap-3">
                        <img src={team.logoUrl} alt={team.name} className="w-10 h-10 rounded bg-gray-800 p-1" />
                        <span className={`text-lg font-bold ${hasWon ? "text-green-400" : "text-red-400"}`}>
                            {team.name}
                        </span>
                    </div>

                    <div className="flex flex-col items-center">
                        <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                            {seriesStats.seriesState.format}
                        </span>
                        <span className="text-xs text-gray-400 font-black italic">VS</span>
                    </div>

                    {/* Opposing Team */}
                    <div className="flex items-center gap-3">
                        <span className={`text-lg font-bold ${!hasWon ? "text-green-400" : "text-red-400"}`}>
                            {opposingTeam?.name || opposingTeam?.name || "Unknown"}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className={`px-4 py-1 rounded text-sm font-black uppercase tracking-tighter ${
                        hasWon ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                    }`}>
                        {hasWon ? "Victory" : "Defeat"}
                    </div>
                    <svg 
                        className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} 
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Dropdown for Matches */}
            {isOpen && (
                <div className="bg-black/20 border-t border-white/5 p-2 flex flex-row gap-1">
                    {seriesStats.seriesState.games.map((match, index) => (
                        <div 
                            key={index}
                            className="flex-1 flex items-center justify-between p-3 rounded bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                        >
                            <Match match={match} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Series;