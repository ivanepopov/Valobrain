/**
 * Series History Page
 *
 * Data surface for viewing match history.
 */
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Users } from "lucide-react";
import Series from "./Series.tsx";
import Match from "./Match.tsx";
import type { Team } from "../../types/Team.ts";
import type { TeamStats } from "../../types/TeamStats.ts";
import type { SeriesStats } from "../../types/SeriesStats.ts";
import { formatDuration, capitalize } from "../../utils/formatters.ts";
import { getMapImage } from "../../utils/mapImages.ts";
import { GlassBox } from "../ui/GlassBox.tsx";
import LoadingPage from "../ui/LoadingPage.tsx";

type Props = {
    team: Team | null;
    stats: TeamStats | null;
    allSeriesData: SeriesStats[];
    isLoadingSeries: boolean;
}

const MatchHistory = ({ team, stats, allSeriesData, isLoadingSeries }: Props) => {
    const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
    const [selectedGameIndex, setSelectedGameIndex] = useState(0);
    const [selectedMapTab, setSelectedMapTab] = useState<string>('All Maps');

    // Auto-select the first series once data arrives
    useEffect(() => {
        if (allSeriesData.length > 0 && !selectedSeriesId) {
            const firstSeriesId = allSeriesData[0].seriesState.games[0]?.id.split('-')[0];
            setSelectedSeriesId(firstSeriesId);
        }
    }, [allSeriesData, selectedSeriesId]);

    const selectedSeriesData = allSeriesData.find(s =>
        s.seriesState.games.some(game => game.id.startsWith(selectedSeriesId || "NEVER_MATCH"))
    );

    const handleSeriesClick = (seriesId: string) => {
        setSelectedSeriesId(seriesId);
        setSelectedGameIndex(0);
        setSelectedMapTab('All Maps');
    };

    if (!team || !stats || isLoadingSeries) return <LoadingPage />;

    // Calculate series score
    const getSeriesScore = () => {
        if (!selectedSeriesData) return { wins: 0, losses: 0 };
        const wins = selectedSeriesData.seriesState.games.filter(g =>
            g.teams.find(t => t.name === team.name)?.won
        ).length;
        const losses = selectedSeriesData.seriesState.games.length - wins;
        return { wins, losses };
    };

    const seriesScore = getSeriesScore();
    const isSeriesWin = seriesScore.wins > seriesScore.losses;
    const opponent = selectedSeriesData?.seriesState.teams.find(t => t.id !== team.id);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left Column: Series List */}
            <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-2 custom-scrollbar">
                <h3 className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-4 px-1">
                    Match Timeline
                </h3>
                {allSeriesData.length === 0 ? (
                    <GlassBox className="p-8 text-center">
                        <p className="text-blue-200/60 font-medium italic">No match history available</p>
                    </GlassBox>
                ) : (
                    allSeriesData.map((data) => {
                        const seriesId = data.seriesState.games[0]?.id.split('-')[0];
                        const isSelected = selectedSeriesId === seriesId;

                        return (
                            <div
                                key={seriesId}
                                onClick={() => handleSeriesClick(seriesId)}
                                className="cursor-pointer"
                            >
                                <Series
                                    seriesData={data}
                                    team={team}
                                    isSelected={isSelected}
                                />
                            </div>
                        );
                    })
                )}
            </div>

            {/* Right Column: Detailed View */}
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
                                        px-4 py-2 rounded-lg font-bold text-lg
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
                                    {selectedSeriesData.seriesState.games.map((game, idx) => {
                                        const gameTeam = game.teams.find(t => t.name === team.name);
                                        const isWin = gameTeam?.won;
                                        
                                        // Calculate round scores from segments
                                        const teamRoundsWon = game.segments?.filter(s => 
                                            s.teams.find(t => t.name === team.name)?.won
                                        ).length || 0;
                                        const opponentRoundsWon = game.segments?.filter(s => 
                                            s.teams.find(t => t.name !== team.name)?.won
                                        ).length || 0;
                                        
                                        return (
                                            <div 
                                                key={idx}
                                                className={`
                                                    group relative rounded-lg py-2 w-[200px] border transition-all duration-300 hover:scale-105 overflow-hidden
                                                    ${isWin 
                                                        ? 'border-green-400/30 hover:border-green-400/60' 
                                                        : 'border-red-400/30 hover:border-red-400/60'
                                                    }
                                                `}
                                                style={{
                                                    backgroundImage: getMapImage(game.map.name) ? `url(${getMapImage(game.map.name)})` : undefined,
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: 'center',
                                                }}
                                            >
                                                {/* Dark overlay */}
                                                <div className="absolute inset-0 bg-black/40"></div>
                                                
                                                {/* Tint overlay - shows on hover */}
                                                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isWin ? 'bg-green-900/50' : 'bg-red-900/50'}`}></div>
                                                
                                                {/* Map number badge */}
                                                <span className="absolute bottom-1 right-2 text-[10px] font-bold text-white/60 z-10">{idx + 1}</span>
                                                
                                                {/* Content */}
                                                <div className="relative z-10 flex flex-col items-center gap-1">
                                                    <span className="text-white font-semibold text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{capitalize(game.map.name)}</span>
                                                    <span className={`text-lg font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                                                        {teamRoundsWon}-{opponentRoundsWon}
                                                    </span>
                                                    <span className="text-white/80 text-xs font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{formatDuration(game.duration)}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Map Selection Tabs */}
                            <div className="mb-4">
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        onClick={() => {
                                            setSelectedMapTab('All Maps');
                                            setSelectedGameIndex(0);
                                        }}
                                        className={`
                                            px-4 py-2 rounded-lg font-semibold transition-all duration-300
                                            ${selectedMapTab === 'All Maps'
                                                ? 'bg-blue-900 text-white'
                                                : 'bg-white/5 text-blue-200 hover:bg-white/10'
                                            }
                                        `}
                                    >
                                        All
                                    </button>
                                    {selectedSeriesData.seriesState.games.map((game, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setSelectedMapTab(`Map ${idx + 1}`);
                                                setSelectedGameIndex(idx);
                                            }}
                                            className={`
                                                px-4 py-2 rounded-lg font-semibold transition-all duration-300
                                                ${selectedMapTab === `Map ${idx + 1}`
                                                    ? 'bg-blue-900 text-white'
                                                    : 'bg-white/5 text-blue-200 hover:bg-white/10'
                                                }
                                            `}
                                        >
                                            {capitalize(game.map.name)}
                                        </button>
                                    ))}
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
        </div>
    );
};

export default MatchHistory;