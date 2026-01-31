import { motion } from "motion/react";
import GlassBox from "../ui/GlassBox.tsx";
import type {Team} from "../../types/Team.ts";
import type {SeriesStats} from "../../types/SeriesStats.ts";
import {useState} from "react";
import {getMapImage} from "../../utils/mapImages.ts";
import {capitalize, formatDuration} from "../../utils/formatters.ts";
import Match from "./Match.tsx";
import {Users} from "lucide-react";

type Props = {
    selectedSeriesData: SeriesStats | undefined;
    team: Team;
}

/**
 * Match History Page Sub-Feature #2: Individual Series Overview
 *
 * Displays detailed match statistics for a given series and team.
 *
 * @param selectedSeriesData Data for the selected series, including games and teams.
 * @param team The team for which the series statistics are displayed.
 */
const SeriesDetailedView = ({ selectedSeriesData, team }: Props) => {

    const [selectedGameIndex, setSelectedGameIndex] = useState(0);
    const [selectedMapTab, setSelectedMapTab] = useState<string>('All Maps');

    const getSeriesScore = () => {
        if (!selectedSeriesData || !selectedSeriesData.seriesState?.games) return { wins: 0, losses: 0 };
        const wins = selectedSeriesData.seriesState.games.filter(g =>
            g.teams?.find(t => t.name === team.name)?.won
        ).length;
        const losses = selectedSeriesData.seriesState.games.length - wins;
        return { wins, losses };
    };

    const seriesScore = getSeriesScore();
    const isSeriesWin = seriesScore.wins > seriesScore.losses;
    const opponent = selectedSeriesData?.seriesState?.teams?.find(t => t.id !== team.id);

    return (
        <div className="lg:col-span-2">
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
            >
                {selectedSeriesData ? (
                    <GlassBox>
                        {/* Series Header */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    {team.name} vs {opponent?.name || 'Unknown'}
                                </h2>
                                <div className={`
                                        px-4 py-2 rounded-lg font-bold text-xl
                                        ${isSeriesWin
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                                }
                                    `}>
                                    {seriesScore.wins}-{seriesScore.losses}
                                </div>

                            </div>

                            {/* Map Results */}
                            <div className="flex flex-wrap justify-center gap-3">

                                <div
                                    onClick={() => {
                                        setSelectedMapTab('All Maps');
                                        setSelectedGameIndex(0);
                                    }}
                                    className={`
                                            group relative rounded-lg py-2 w-12.5 border transition-all duration-300 hover:scale-105 overflow-hidden cursor-pointer flex flex-col items-center justify-center gap-2
                                            ${selectedMapTab === 'All Maps'
                                        ? 'bg-blue-900/40 border-blue-400 ring-2 ring-blue-400 scale-105 shadow-lg shadow-blue-500/20'
                                        : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                                    }
                                        `}
                                >
                                    <span className="text-white font-bold text-sm">All</span>

                                </div>

                                {selectedSeriesData.seriesState?.games?.map((game, idx) => {
                                    const gameTeam = game.teams?.find(t => t.name === team.name);
                                    const isWin = gameTeam?.won;

                                    // Calculate round scores from segments
                                    const teamRoundsWon = game.segments?.filter(s =>
                                        s.teams?.find(t => t.name === team.name)?.won
                                    ).length || 0;
                                    const opponentRoundsWon = game.segments?.filter(s =>
                                        s.teams?.find(t => t.name !== team.name)?.won
                                    ).length || 0;

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                setSelectedMapTab(`Map ${idx + 1}`);
                                                setSelectedGameIndex(idx);
                                            }}
                                            className={`
                                                    group relative rounded-lg py-2 w-50 border transition-all duration-300 hover:scale-105 overflow-hidden cursor-pointer
                                                    ${isWin
                                                ? 'border-green-400/30 hover:border-green-400/60'
                                                : 'border-red-400/30 hover:border-red-400/60'
                                            }
                                                    ${selectedMapTab === `Map ${idx + 1}`
                                                ? 'ring-2 ring-blue-400 scale-105 shadow-lg shadow-blue-500/20'
                                                : 'opacity-80 hover:opacity-100'
                                            }
                                                `}
                                            style={{
                                                backgroundImage: game.map?.name && getMapImage(game.map.name) ? `url(${getMapImage(game.map.name)})` : undefined,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                            }}
                                        >
                                            <div className="absolute inset-0 bg-black/40"></div>
                                            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isWin ? 'bg-green-900/50' : 'bg-red-900/50'}`}></div>
                                            <span className="absolute bottom-1 right-2 text-[12px] font-bold text-white/60 z-10">{idx + 1}</span>


                                            <div className="relative z-10 flex flex-col items-center gap-1">
                                                <span className="text-white font-semibold text-15 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{game.map?.name ? capitalize(game.map.name) : 'Unknown'}</span>
                                                <span className={`text-xl font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                                                        {teamRoundsWon}-{opponentRoundsWon}
                                                    </span>
                                                <span className="text-white/80 text-xs font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{formatDuration(game.duration)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>



                        {/* Match Stats */}
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Match
                                match={selectedMapTab === 'All Maps' ? null : selectedSeriesData.seriesState.games[selectedGameIndex]}
                                allMaps={selectedMapTab === 'All Maps' ? selectedSeriesData.seriesState.games : undefined}
                            />
                        </div>
                    </GlassBox>
                ) : (
                    <GlassBox>
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <Users className="w-16 h-16 text-blue-400/30 mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">No Series Selected</h3>
                            <p className="text-blue-200">Select a series from the timeline to view detailed statistics</p>
                        </div>
                    </GlassBox>
                )}
            </motion.div>
        </div>
    );
};

export default SeriesDetailedView;