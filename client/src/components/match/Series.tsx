import { memo } from 'react';
import type { Team } from "../../types/Team.ts";
import type { SeriesStats } from "../../types/SeriesStats.ts";

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
            w-full text-left p-4 rounded-lg border-2 transition-all duration-300
            ${isSelected
                ? 'border-blue-400 bg-blue-400/10'
                : 'border-white/10 hover:border-white/20 bg-white/5'
            }
        `}>
            {/* Header: Team vs. Opponent with Result */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-white font-semibold">{team.name} vs {opponent?.name || 'Unknown'}</span>
                <span className={`
                    px-3 py-1 rounded-full text-base font-bold
                    ${isWin 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }
                `}>
                    {winCount}-{lossCount}
                </span>
            </div>

            {/* Format and Date Row */}
            <div className="flex items-center justify-between text-base mb-2">
                <span className="text-blue-300 font-semibold">{series.format}</span>
            </div>

            {/* Map results mini display */}
            <div className="flex gap-1 mt-2">
                {series.games.map((game, idx) => {
                    const gameTeam = game.teams.find(t => t.name === team.name);
                    const gameWon = gameTeam?.won;
                    return (
                        <div
                            key={idx}
                            className={`
                                flex-1 h-1.5 rounded-full
                                ${gameWon ? 'bg-green-400' : 'bg-red-400'}
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