import React from 'react';
import type { Team } from "../../types/Team.ts";
import type { SeriesStats } from "../../types/SeriesStats.ts";
import GlassBox from "../ui/GlassBox.tsx";
import {getAgentLogo} from "../../utils/agentLogos.ts";
import { motion } from "motion/react";
import { Users } from "lucide-react";

type Props = {
    team: Team | null;
    allSeriesData: SeriesStats[];
    selectedMap: string;
}

const CompositionHistory = ({ team, allSeriesData, selectedMap }: Props) => {
    const [visibility, setVisibility] = React.useState({
        pickRate: true,
        winRate: true
    });

    const toggle = (metric: keyof typeof visibility) => {
        setVisibility(prev => ({
            ...prev,
            [metric]: !prev[metric]
        }));
    };
    const compositionStats = React.useMemo(() => {
        if (selectedMap === "All" || !team) return [];

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
                pickRate: c.totalGames > 0 ? (c.totalGames / totalGamesOnMap) * 100 : 0,
                winRate: c.totalRoundsPlayed > 0 ? (c.totalRoundsWon / c.totalRoundsPlayed) * 100 : 0
            }))
            .sort((a, b) => b.totalGames - a.totalGames)
            .slice(0, 5);
    }, [allSeriesData, team, selectedMap]);

    if (selectedMap === "All" || !team) return null;
    if (compositionStats.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-6"
        >
            <h2 className="text-2xl font-bold text-white drop-shadow-md mb-6">Comps</h2>
            <GlassBox className="mb-6 border-white/10">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                    <h3 className="text-white text-lg font-bold flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-400" />
                        {selectedMap} Comps
                    </h3>
                    <div className="flex gap-4 bg-gradient-to-r from-slate-950/60 to-slate-900/60 p-2.5 rounded-lg border border-white/10 backdrop-blur-sm">
                        <button 
                            onClick={() => toggle('pickRate')}
                            className={`flex items-center gap-2 transition-all duration-300 hover:scale-105 cursor-pointer ${visibility.pickRate ? 'opacity-100' : 'opacity-40'}`}
                        >
                            <div className="w-3.5 h-3.5 rounded-md bg-purple-400" />
                            <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wide">Pick Rate</span>
                        </button>
                        <button 
                            onClick={() => toggle('winRate')}
                            className={`flex items-center gap-2 transition-all duration-300 hover:scale-105 cursor-pointer ${visibility.winRate ? 'opacity-100' : 'opacity-40'}`}
                        >
                            <div className="w-3.5 h-3.5 rounded-md bg-green-400" />
                            <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wide">Win Rate</span>
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    {compositionStats.map((comp, idx) => (
                        <div key={idx} className="flex items-center gap-6 group">
                            {/* 5 Agent Images */}
                            <div className="flex gap-2 shrink-0">
                                {comp.agents.map((agent, aIdx) => (
                                    <div key={aIdx} className="relative w-8 h-8 rounded border border-white/10 overflow-hidden bg-slate-800 transition-transform duration-300 group-hover:translate-y-[-2px] hover:shadow-xl group-hover:z-10">
                                        <img
                                            src={getAgentLogo(agent)}
                                            alt={agent}
                                            className="w-full h-full object-cover"
                                            onError={(e) => (e.currentTarget.src = "/assets/agents/placeholder.png")}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
                                    </div>
                                ))}
                            </div>

                            {/* 2 Horizontal Bars on the right */}
                            <div className="flex-1 space-y-2.5">
                                {visibility.pickRate && (
                                    <div className="relative h-2.5 bg-slate-900/70 rounded-lg overflow-visible border border-white/10 hover:border-white/20 transition-all duration-300">
                                        <div
                                            className="absolute inset-y-0 left-0 bg-purple-400 rounded-lg transition-all duration-300 ease-out group/bar hover:brightness-110 cursor-pointer"
                                            style={{ width: `${comp.pickRate}%` }}
                                        >
                                            {/* Tooltip */}
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                                                <div className="bg-slate-900 border border-white/20 rounded-lg px-2 py-1 shadow-xl">
                                                    <span className="text-white text-xs font-bold whitespace-nowrap">{comp.pickRate.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-white z-10 leading-none pointer-events-none">
                                            {comp.pickRate.toFixed(0)}%
                                        </span>
                                    </div>
                                )}
                                {visibility.winRate && (
                                    <div className="relative h-2.5 bg-slate-900/70 rounded-lg overflow-visible border border-white/10 hover:border-white/20 transition-all duration-300">
                                        <div
                                            className="absolute inset-y-0 left-0 bg-green-400 rounded-lg transition-all duration-300 ease-out group/bar hover:brightness-110 cursor-pointer"
                                            style={{ width: `${comp.winRate}%` }}
                                        >
                                            {/* Tooltip */}
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                                                <div className="bg-slate-900 border border-white/20 rounded-lg px-2 py-1 shadow-xl">
                                                    <span className="text-white text-xs font-bold whitespace-nowrap">{comp.winRate.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-white z-10 leading-none pointer-events-none">
                                            {comp.winRate.toFixed(0)}%
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </GlassBox>
        </motion.div>
    );
};

export default CompositionHistory;