import React, { memo } from 'react';
import type { Team } from "../../types/Team.ts";
import type { SeriesStats } from "../../types/SeriesStats.ts";
import GlassBox from "../ui/GlassBox.tsx";
import {getAgentLogo} from "../../utils/agentLogos.ts";
import { motion } from "motion/react";
import { Users } from "lucide-react";

type Props = {
    team: Team;
    allSeriesData: SeriesStats[];
    selectedMap: string;
}

/**
 * Analytics Breakdown Page Sub-Feature #2: Agent Usage & Composition Graphs
 *
 * This feature displays the composition graphs for a given team and map.
 * A map must be selected to display composition graphs, showing the win rate and pick rate for each agent combination.
 *
 * @param team Team to display stats for
 * @param allSeriesData All (or filtered) series data to display
 * @param selectedMap Map to display stats for
 */
const CompositionHistory = memo(({ team, allSeriesData, selectedMap }: Props) => {

    // Visibility toggles for each metric
    const [visibility, setVisibility] = React.useState({ pickRate: true, winRate: true });
    const toggle = (metric: keyof typeof visibility) => {
        setVisibility(prev => ({
            ...prev,
            [metric]: !prev[metric]
        }));
    };

    // Traverse series data to calculate pick rate and win rate for each agent combination
    const compositionStats = React.useMemo(() => {
        if (selectedMap === "All") return [];

        // Maintain state for composition stats
        const comps: Record<string, { agents: string[]; totalRoundsWon: number; totalRoundsPlayed: number; totalGames: number }> = {};
        let totalGamesOnMap = 0;

        allSeriesData.forEach(series => {
            series.seriesState.games.forEach(game => {

                // Step 1: Filter data by map and increment total games
                if (game.map.name.toLowerCase() !== selectedMap.toLowerCase()) return;
                totalGamesOnMap++;

                // Step 2: Traverse team data to get the agents played on the map
                const teamData = game.teams.find(t => t.name === team.name);
                if (!teamData) return;

                const agentNames = teamData.players
                    .map(p => p.character.name)
                    .sort() || [];

                const compKey = agentNames.join(',');

                if (!comps[compKey]) {
                    comps[compKey] = { agents: agentNames, totalRoundsWon: 0, totalRoundsPlayed: 0, totalGames: 0 };
                }

                comps[compKey].totalGames++;

                // Step 3: Traverse segment data to get the number of rounds won by the team on the map
                game.segments.forEach(segment => {
                    comps[compKey].totalRoundsPlayed++;

                    const teamInSegment = segment.teams.find(t => t.name === team.name);
                    if (!teamInSegment) return;

                    if (teamInSegment.won) {
                        comps[compKey].totalRoundsWon++;
                    }
                });
            });
        });

        return Object.values(comps)
            .map(c => ({
                ...c,
                pickRate: totalGamesOnMap > 0 ? (c.totalGames / totalGamesOnMap) * 100 : 0,
                winRate: c.totalRoundsPlayed > 0 ? (c.totalRoundsWon / c.totalRoundsPlayed) * 100 : 0
            }))
            .sort((a, b) => b.totalGames - a.totalGames)
            .slice(0, 5);
    }, [allSeriesData, team.name, selectedMap]);

    if (selectedMap === "All" || compositionStats.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
        >
            <h2 className="text-2xl font-bold text-white drop-shadow-md mb-6">Comps</h2>
            <GlassBox className="mb-6 border-white/10">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                    <h3 className="text-white text-lg font-bold flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-400" />
                        {selectedMap} Comps
                    </h3>
                    <div className="flex gap-4 bg-linear-to-r from-slate-950/60 to-slate-900/60 p-2.5 rounded-lg border border-white/10 backdrop-blur-sm">
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
                                    <div key={aIdx} className="relative w-8 h-8 rounded border border-white/10 overflow-hidden bg-slate-800 transition-transform duration-300 group-hover:-translate-y-0.5 hover:shadow-xl group-hover:z-10">
                                        <img
                                            src={getAgentLogo(agent)}
                                            alt={agent}
                                            className="w-full h-full object-cover"
                                            onError={(e) => (e.currentTarget.src = "/assets/agents/placeholder.png")}
                                        />
                                        <div className="absolute inset-0 bg-linear-to-t from-slate-900/40 to-transparent" />
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
});

export default CompositionHistory;