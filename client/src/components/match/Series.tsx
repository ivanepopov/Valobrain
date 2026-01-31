import { memo } from 'react';
import type { Team } from "../../types/Team.ts";
import type { SeriesStats } from "../../types/SeriesStats.ts";
import { formatSeriesType, formatDate } from "../../utils/formatters.ts";

type Props = {
    seriesData: SeriesStats;
    team: Team;
    isSelected?: boolean;
}

/**
 * Series Component that displays series information for a team, including game results and overall statistics.
 *
 * @param seriesData Data for the series being displayed, including overall state and game details.
 * @param team The team for which the series information is displayed.
 * @param isSelected Whether the series is currently selected, affecting its visual style.
 */
const Series = memo(({ seriesData, team, isSelected = false }: Props) => {
    const series = seriesData.seriesState;
    const opponent = series.teams.find(t => t.name !== team.name);

    const winCount = series.games.filter(g =>
        g.teams.find(t => t.name === team.name)?.won
    ).length;

    const lossCount = series.games.length - winCount;
    const isWin = winCount > lossCount;

    return (
        <div className={`
            w-full text-left p-4 rounded-xl border transition-all duration-300 group
            ${isSelected
                ? 'border-blue-400/50 bg-blue-400/10 shadow-lg shadow-blue-500/10'
                : 'border-white/5 hover:border-white/20 bg-white/5'
            }
        `}>
            {/* Header: Team vs. Opponent with Result */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col">
                    <span className="text-blue-200/60 text-[10px] font-bold uppercase tracking-wider mb-0.5">Matchup</span>
                    <span className="text-white font-bold text-lg leading-tight">
                        {opponent?.name || 'Unknown'}
                    </span>
                </div>
                <div className={`
                    px-3 py-1.5 rounded-lg text-lg font-black
                    ${isWin 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-rose-500/20 text-rose-400'
                    }
                `}>
                    {winCount}-{lossCount}
                </div>
            </div>

            {/* Format and Date Row */}
            <div className="flex items-center justify-between text-base mb-3 bg-white/5 rounded-md px-2 py-1">
                <span className="text-blue-300 font-bold text-xs uppercase tracking-tighter">{formatSeriesType(series.format)}</span>
                <span className="text-blue-200/40 text-[11px] font-semibold">{formatDate(series.startedAt)}</span>
            </div>

            {/* Map results mini display */}
            <div className="flex gap-1.5 mt-2">
                {series.games.map((game, idx) => {
                    const gameTeam = game.teams.find(t => t.name === team.name);
                    const gameWon = gameTeam?.won;
                    return (
                        <div
                            key={idx}
                            className={`
                                flex-1 h-1.5 rounded-full transition-all duration-500
                                ${gameWon ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]' : 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.3)]'}
                                ${isSelected ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}
                            `}
                            title={`${game.map.name}: ${gameWon ? 'Win' : 'Loss'}`}
                        />
                    );
                })}
            </div>
        </div>
    );
});

export default Series;