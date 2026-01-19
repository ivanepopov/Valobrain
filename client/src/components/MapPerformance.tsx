import type { SeriesStats } from "../types/SeriesStats.ts";
import type { Team } from "../types/Team.ts";
import { GlassBox } from "./GlassBox.tsx";

type Props = {
    team: Team | null;
    allSeriesData: SeriesStats[];
}

const MapPerformance = ({ team, allSeriesData }: Props) => {
    if (!team) return null;

    // 1. Aggregate win/loss data per map
    const mapStatsMap: Record<string, { wins: number; total: number }> = {};

    allSeriesData.forEach(series => {
        series.seriesState.games.forEach(game => {
            const teamMatch = game.teams.find(t => t.name === team.name);
            if (!teamMatch) return;

            const mapName = game.map.name;
            if (!mapStatsMap[mapName]) {
                mapStatsMap[mapName] = { wins: 0, total: 0 };
            }

            mapStatsMap[mapName].total += 1;
            if (teamMatch.won) {
                mapStatsMap[mapName].wins += 1;
            }
        });
    });

    // 2. Calculate win rates and sort
    const sortedMaps = Object.entries(mapStatsMap)
        .map(([name, stats]) => ({
            name,
            winRate: (stats.wins / stats.total) * 100,
            record: `${stats.wins}-${stats.total - stats.wins}`,
            total: stats.total
        }))
        .sort((a, b) => b.winRate - a.winRate || b.total - a.total);

    return (
        <GlassBox className="mt-8">
            <h3 className="text-blue-200/60 text-xs uppercase tracking-widest mb-6 font-bold">Map Win Rates</h3>
            
            <div className="space-y-6">
                {sortedMaps.length > 0 ? (
                    sortedMaps.map((map) => (
                        <div key={map.name} className="group">
                            <div className="flex justify-between items-end mb-1.5">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-white font-bold text-sm">{map.name}</span>
                                    <span className="text-blue-200/40 text-[10px] font-mono uppercase tracking-tighter">
                                        {map.record}
                                    </span>
                                </div>
                                <span className={`text-sm font-mono font-bold ${
                                    map.winRate >= 60 ? 'text-green-400' : 
                                    map.winRate <= 40 ? 'text-red-400' : 'text-blue-200/60'
                                }`}>
                                    {map.winRate.toFixed(0)}%
                                </span>
                            </div>
                            
                            <div className="relative h-3 w-full bg-white/10 rounded-sm overflow-hidden border border-white/10">
                                {/* Success Gradient Bar */}
                                <div 
                                    className={`h-full transition-all duration-700 ease-out rounded-r-sm ${
                                        map.winRate >= 50 
                                            ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' 
                                            : 'bg-gradient-to-r from-rose-700 to-rose-500'
                                    }`}
                                    style={{ width: `${map.winRate}%` }}
                                />
                                
                                {/* Background grid markers */}
                                <div className="absolute inset-0 flex justify-between pointer-events-none px-[25%] opacity-20">
                                    <div className="h-full w-px bg-white" />
                                    <div className="h-full w-px bg-white" />
                                    <div className="h-full w-px bg-white" />
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-10 text-center text-blue-200/40 italic text-sm">
                        No map data recorded for this team.
                    </div>
                )}
            </div>
        </GlassBox>
    );
};

export default MapPerformance;