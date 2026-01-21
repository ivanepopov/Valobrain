import React from 'react';
import type { Team } from "../../types/Team.ts";
import type { SeriesStats } from "../../types/SeriesStats.ts";
import GlassBox from "../ui/GlassBox.tsx";
import {getAgentLogo} from "../../utils/agentLogos.ts";

type Props = {
    team: Team | null;
    allSeriesData: SeriesStats[];
    selectedMap: string;
}

const CompositionHistory = ({ team, allSeriesData, selectedMap }: Props) => {
    if (selectedMap === "All" || !team) return null;

    const compositionStats = React.useMemo(() => {
        const comps: Record<string, { agents: string[]; totalRoundsWon: number; totalRoundsPlayed: number; totalGames: number }> = {};
        let totalGamesOnMap = 0;

        allSeriesData.forEach(series => {
            series.seriesState.games.forEach(game => {
                if (game.map.name.toLowerCase() !== selectedMap.toLowerCase()) return;

                totalGamesOnMap++;
                const teamData = game.teams.find(t => t.name === team.name);
                if (!teamData) return;

                const agentNames = teamData.players
                    .map(p => p.character.name || 'Unknown')
                    .sort();
                const compKey = agentNames.join(',');

                if (!comps[compKey]) {
                    comps[compKey] = { agents: agentNames, totalRoundsWon: 0, totalRoundsPlayed: 0, totalGames: 0 };
                }

                comps[compKey].totalGames++;

                // Traverse segments to count round wins accurately
                game.segments.forEach(segment => {
                    // Check if the team won the round in this segment
                    const teamInSegment = segment.teams.find(t => t.name === team.name);
                    if (teamInSegment?.won) {
                        comps[compKey].totalRoundsWon++;
                    }
                    comps[compKey].totalRoundsPlayed++;
                });
            });
        });

        return Object.values(comps)
            .map(c => ({
                ...c,
                pickRate: (c.totalGames / totalGamesOnMap) * 100,
                winRate: c.totalRoundsPlayed > 0 ? (c.totalRoundsWon / c.totalRoundsPlayed) * 100 : 0
            }))
            .sort((a, b) => b.totalGames - a.totalGames)
            .slice(0, 5);
    }, [allSeriesData, team, selectedMap]);

    if (compositionStats.length === 0) return null;

    return (
        <GlassBox className="mb-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tighter italic">Composition Analysis</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Top Meta Pick & Win Rates</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Pick Rate</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Win Rate (Rounds)</span>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {compositionStats.map((comp, idx) => (
                    <div key={idx} className="flex items-center gap-6 group">
                        {/* 2 Horizontal Bars on the left */}
                        <div className="flex-1 space-y-2">
                            <div className="relative h-3 bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/30">
                                <div
                                    className="absolute inset-y-0 left-0 bg-blue-500 transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                    style={{ width: `${comp.pickRate}%` }}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-white drop-shadow-md">
                                    {comp.pickRate.toFixed(0)}%
                                </span>
                            </div>
                            <div className="relative h-3 bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/30">
                                <div
                                    className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                    style={{ width: `${comp.winRate}%` }}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-white drop-shadow-md">
                                    {comp.winRate.toFixed(0)}%
                                </span>
                            </div>
                        </div>

                        {/* 5 Agent Images */}
                        <div className="flex -space-x-2 shrink-0">
                            {comp.agents.map((agent, aIdx) => (
                                <div key={aIdx} className="relative w-12 h-12 rounded-lg border-2 border-slate-900 overflow-hidden bg-slate-800 group-hover:translate-y-[-2px] transition-transform shadow-lg">
                                    <img
                                        src={getAgentLogo(agent)}
                                        alt={agent}
                                        className="w-full h-full object-cover scale-110"
                                        onError={(e) => (e.currentTarget.src = "/assets/agents/placeholder.png")}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </GlassBox>
    );
};

export default CompositionHistory;