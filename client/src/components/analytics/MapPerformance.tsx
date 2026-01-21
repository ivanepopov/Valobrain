import type { SeriesStats } from "../../types/SeriesStats.ts";
import type { Team } from "../../types/Team.ts";
import { GlassBox } from "../ui/GlassBox.tsx";
import { capitalize } from "../../utils/formatters.ts";
import { useMemo } from "react";

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
        <GlassBox className="mt-8">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h3 className="text-white text-base font-black uppercase tracking-tighter italic">Map Performance Analytics</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Regional Efficiency & Side Conversion</p>
                </div>
                <div className="flex gap-6 bg-slate-950/40 p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-linear-to-r from-blue-600 to-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]" /><span className="text-[9px] font-black text-slate-300 uppercase">Match WR</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-linear-to-r from-rose-600 to-rose-400 shadow-[0_0_8px_rgba(225,29,72,0.5)]" /><span className="text-[9px] font-black text-slate-300 uppercase">Atk WR</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-linear-to-r from-emerald-600 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /><span className="text-[9px] font-black text-slate-300 uppercase">Def WR</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-linear-to-r from-slate-500 to-slate-300 shadow-[0_0_8px_rgba(148,163,184,0.5)]" /><span className="text-[9px] font-black text-slate-300 uppercase">Play Rate</span></div>
                </div>
            </div>
        
            <div className="space-y-12">
                {mapStats.length > 0 ? (
                    mapStats.map((map) => (
                        <div key={map.name} className="flex gap-8 items-start group">
                            {/* Y-Axis: Map Name */}
                            <div className="w-28 shrink-0 pt-2">
                                <span className="block text-white font-black text-sm uppercase italic tracking-tight group-hover:text-blue-400 transition-colors">{capitalize(map.name)}</span>
                                <span className="block text-slate-500 text-[10px] font-mono font-bold mt-1 tracking-tighter">{map.record} Series</span>
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
                                        { val: map.matchWinRate, color: "from-blue-600 to-blue-400 shadow-blue-500/20" },
                                        { val: map.atkWinRate, color: "from-rose-600 to-rose-400 shadow-rose-500/20" },
                                        { val: map.defWinRate, color: "from-emerald-600 to-emerald-400 shadow-emerald-500/20" },
                                        { val: map.playRate, color: "from-slate-600 to-slate-400 shadow-slate-500/20" }
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
    );
};

export default MapPerformance;