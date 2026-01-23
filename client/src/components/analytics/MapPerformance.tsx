import type { SeriesStats } from "../../types/SeriesStats.ts";
import type { Team } from "../../types/Team.ts";
import { GlassBox } from "../ui/GlassBox.tsx";
import { capitalize } from "../../utils/formatters.ts";
import { useMemo, useState } from "react";
import { motion } from "motion/react";

type Props = {
    team: Team | null;
    allSeriesData: SeriesStats[];
    selectedMap?: string;
}

const MapPerformance = ({ team, allSeriesData, selectedMap = "All" }: Props) => {
    if (!team) return null;

    const [visibleMetrics, setVisibleMetrics] = useState({
        matchWinRate: true,
        atkWinRate: true,
        defWinRate: true,
        playRate: true
    });

    const toggleMetric = (metric: keyof typeof visibleMetrics) => {
        setVisibleMetrics(prev => ({
            ...prev,
            [metric]: !prev[metric]
        }));
    };

    const mapStats = useMemo(() => {
        const stats: Record<string, {
            wins: number;
            totalGames: number;
            atkWins: number;
            atkTotal: number;
            defWins: number;
            defTotal: number;
        }> = {};

        let totalGamesOverall = 0;

        allSeriesData.forEach(series => {
            series.seriesState.games.forEach(game => {
                const mapName = game.map.name;
                if (selectedMap !== "All" && mapName.toLowerCase() !== selectedMap.toLowerCase()) return;

                const teamMatch = game.teams.find(t => t.name === team.name);
                if (!teamMatch) return;

                if (!stats[mapName]) {
                    stats[mapName] = { wins: 0, totalGames: 0, atkWins: 0, atkTotal: 0, defWins: 0, defTotal: 0 };
                }

                totalGamesOverall++;
                stats[mapName].totalGames += 1;
                if (teamMatch.won) stats[mapName].wins += 1;

                game.segments.forEach(segment => {
                    const teamInSegment = segment.teams.find(t => t.name === team.name);
                    if (!teamInSegment) return;

                    const side = teamInSegment.side.toLowerCase();
                    if (side === 'attacker') {
                        stats[mapName].atkTotal++;
                        if (teamInSegment.won) stats[mapName].atkWins++;
                    } else if (side === 'defender') {
                        stats[mapName].defTotal++;
                        if (teamInSegment.won) stats[mapName].defWins++;
                    }
                });
            });
        });

        return Object.entries(stats)
            .map(([name, s]) => ({
                name,
                matchWinRate: (s.wins / s.totalGames) * 100,
                atkWinRate: s.atkTotal > 0 ? (s.atkWins / s.atkTotal) * 100 : 0,
                defWinRate: s.defTotal > 0 ? (s.defWins / s.defTotal) * 100 : 0,
                playRate: totalGamesOverall > 0 ? (s.totalGames / totalGamesOverall) * 100 : 0,
                record: `${s.wins}-${s.totalGames - s.wins}`,
            }))
            .sort((a, b) => b.matchWinRate - a.matchWinRate);
    }, [allSeriesData, team, selectedMap]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mb-6"
        >
            <h2 className="text-2xl font-bold text-white mb-4">Map Success</h2>
            <GlassBox className="mt-8 border-white/10">
            <div className="flex justify-end items-center mb-8">
                <div className="flex gap-4 bg-gradient-to-r from-slate-950/60 to-slate-900/60 p-3.5 rounded-xl border border-white/10 backdrop-blur-sm">
                    <button 
                        onClick={() => toggleMetric('matchWinRate')}
                        className={`flex items-center gap-2.5 transition-all duration-300 cursor-pointer hover:scale-105 ${visibleMetrics.matchWinRate ? 'opacity-100' : 'opacity-40'}`}
                    >
                        <div className="w-3.5 h-3.5 rounded-md bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/30" />
                        <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wide">Match Win Rate</span>
                    </button>
                    <button 
                        onClick={() => toggleMetric('atkWinRate')}
                        className={`flex items-center gap-2.5 transition-all duration-300 cursor-pointer hover:scale-105 ${visibleMetrics.atkWinRate ? 'opacity-100' : 'opacity-40'}`}
                    >
                        <div className="w-3.5 h-3.5 rounded-md bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/30" />
                        <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wide">Atk Win Rate</span>
                    </button>
                    <button 
                        onClick={() => toggleMetric('defWinRate')}
                        className={`flex items-center gap-2.5 transition-all duration-300 cursor-pointer hover:scale-105 ${visibleMetrics.defWinRate ? 'opacity-100' : 'opacity-40'}`}
                    >
                        <div className="w-3.5 h-3.5 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30" />
                        <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wide">Def Win Rate</span>
                    </button>
                    <button 
                        onClick={() => toggleMetric('playRate')}
                        className={`flex items-center gap-2.5 transition-all duration-300 cursor-pointer hover:scale-105 ${visibleMetrics.playRate ? 'opacity-100' : 'opacity-40'}`}
                    >
                        <div className="w-3.5 h-3.5 rounded-md bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30" />
                        <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wide">Play Rate</span>
                    </button>
                </div>
            </div>
        
            <div className="px-2">
                {mapStats.length > 0 ? (
                    <div className="relative pt-2">
                        {/* Y-Axis Labels */}
                        <div className="absolute left-0 top-0 h-80 flex flex-col justify-between w-12 text-right pr-3">
                            {[100, 75, 50, 25, 0].map((v) => (
                                <span key={v} className="text-[10px] font-bold text-blue-200/50 -translate-y-2">{v}%</span>
                            ))}
                        </div>

                        {/* Chart Container */}
                        <div className="ml-14">
                            {/* Horizontal Grid Lines */}
                            <div className="absolute left-14 right-0 h-80 flex flex-col justify-between pointer-events-none">
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <div key={i} className="w-full border-t border-white/5" />
                                ))}
                            </div>

                            {/* Bars */}
                            <div className="flex gap-6 items-end h-80 relative">
                                {mapStats.map((map) => (
                                    <div key={map.name} className="flex-1 flex flex-col items-center gap-3 min-w-0">
                                        {/* Bars Container */}
                                        <div className="flex-1 w-full flex items-end justify-center gap-1.5">
                                            {[
                                                { val: map.matchWinRate, color: "from-green-500 via-green-500 to-green-600", shadow: "shadow-green-500/40", key: 'matchWinRate' as const },
                                                { val: map.atkWinRate, color: "from-red-500 via-red-500 to-red-600", shadow: "shadow-red-500/40", key: 'atkWinRate' as const },
                                                { val: map.defWinRate, color: "from-blue-500 via-blue-500 to-blue-600", shadow: "shadow-blue-500/40", key: 'defWinRate' as const },
                                                { val: map.playRate, color: "from-purple-500 via-purple-500 to-purple-600", shadow: "shadow-purple-500/40", key: 'playRate' as const }
                                            ].filter(bar => visibleMetrics[bar.key]).map((bar) => {
                                                const heightPx = (bar.val / 100) * 290; // 320px = h-80
                                                return (
                                                    <div 
                                                        key={bar.key} 
                                                        className={`w-full flex-1 bg-gradient-to-t ${bar.color} rounded-t-lg shadow-lg ${bar.shadow} border border-white/10 hover:border-white/20 transition-all duration-300 relative overflow-visible min-w-[12px] max-w-[40px] group/bar`}
                                                        style={{ height: `${heightPx}px` }}
                                                    >
                                                        {/* Tooltip */}
                                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                                                            <div className="bg-slate-900 border border-white/20 rounded-lg px-2 py-1 shadow-xl">
                                                                <span className="text-white text-xs font-bold whitespace-nowrap">{bar.val.toFixed(1)}%</span>
                                                            </div>
                                                        </div>
                                                        {/* Shine effect */}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent animate-pulse" />
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Map Name */}
                                        <div className="text-center w-full">
                                            <span className="block text-white font-bold text-sm tracking-tight hover:text-blue-400 transition-all duration-300">
                                                {capitalize(map.name)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-20 text-center border-2 border-dashed border-white/10 rounded-2xl bg-slate-900/30">
                        <p className="text-blue-200/40 italic text-sm">No match data found for this filter</p>
                    </div>
                )}
            </div>
            </GlassBox>
        </motion.div>
    );
};

export default MapPerformance;