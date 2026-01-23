import type { SeriesStats } from "../../types/SeriesStats.ts";
import type { Team } from "../../types/Team.ts";
import { GlassBox } from "../ui/GlassBox.tsx";
import { capitalize } from "../../utils/formatters.ts";
import { useMemo } from "react";
import { motion } from "motion/react";

type Props = {
    team: Team | null;
    allSeriesData: SeriesStats[];
    selectedMap?: string;
}

const MapPerformance = ({ team, allSeriesData, selectedMap = "All" }: Props) => {
    if (!team) return null;

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
            <GlassBox className="mt-8">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h3 className="text-white text-base font-black uppercase tracking-tighter italic">Map Success</h3>
                </div>
                <div className="flex gap-6 bg-slate-950/40 p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-linear-to-r from-green-600 to-green-400 shadow-[0_0_8px_rgba(34,197,94,0.5)]" /><span className="text-[9px] font-black text-slate-300 uppercase">Match Win Rate</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-linear-to-r from-red-600 to-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]" /><span className="text-[9px] font-black text-slate-300 uppercase">Atk Win Rate</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-linear-to-r from-blue-600 to-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]" /><span className="text-[9px] font-black text-slate-300 uppercase">Def Win Rate</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-linear-to-r from-purple-600 to-purple-400 shadow-[0_0_8px_rgba(147,51,234,0.5)]" /><span className="text-[9px] font-black text-slate-300 uppercase">Play Rate</span></div>
                </div>
            </div>
        
            <div className="space-y-12">
                {mapStats.length > 0 ? (
                    mapStats.map((map) => (
                        <div key={map.name} className="flex gap-8 items-start group">
                            {/* Y-Axis: Map Name */}
                            <div className="w-28 shrink-0 pt-2">
                                <span className="block text-white font-black text-sm uppercase italic tracking-tight group-hover:text-blue-400 transition-colors">{capitalize(map.name)}</span>
                                
                            </div>

                            {/* Chart Area */}
                            <div className="flex-1 relative">
                                {/* X-Axis Scale Markers (Only show for first item) */}
                                {map === mapStats[0] && (
                                    <div className="absolute -top-6 inset-x-0 flex justify-between px-0.5">
                                        {[0, 25, 50, 75, 100].map((v) => (
                                            <span key={v} className="text-[8px] font-black text-slate-200 uppercase tracking-widest">{v}%</span>
                                        ))}
                                    </div>
                                )}

                                {/* Grid Lines (High Contrast) */}
                                <div className="absolute inset-0 flex justify-between pointer-events-none px-0.5 z-0">
                                    {[0, 25, 50, 75, 100].map((v) => (
                                        <div key={v} className="h-full w-px bg-white/10" />
                                    ))}
                                </div>

                                {/* Large Bars Group */}
                                <div className="space-y-3 relative z-10 py-2">
                                    {[
                                        { val: map.matchWinRate, color: "from-green-600 to-green-400 shadow-green-500/20" },
                                        { val: map.atkWinRate, color: "from-red-600 to-red-400 shadow-red-500/20" },
                                        { val: map.defWinRate, color: "from-blue-600 to-blue-400 shadow-blue-500/20" },
                                        { val: map.playRate, color: "from-purple-600 to-purple-400 shadow-purple-500/20" }
                                    ].map((bar, idx) => (
                                        <div key={idx} className="relative h-3 w-full bg-slate-900/80 rounded-sm overflow-hidden border border-white/5">
                                            <div 
                                                className={`h-full bg-linear-to-r ${bar.color} transition-all duration-1000 ease-out rounded-r-sm shadow-[2px_0_10px_rgba(0,0,0,0.5)]`}
                                                style={{ width: `${bar.val}%` }}
                                            />
                                            {/* Glow overlay for low values visibility */}
                                            {bar.val > 0 && (
                                                <div 
                                                    className="absolute inset-y-0 left-0 w-1 bg-white/20 blur-[1px]" 
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No Match Data Found For This Filter</p>
                    </div>
                )}
            </div>
            </GlassBox>
        </motion.div>
    );
};

export default MapPerformance;