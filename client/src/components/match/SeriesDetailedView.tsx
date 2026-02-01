import { motion } from "motion/react";
import GlassBox from "../ui/GlassBox.tsx";
import type {Team} from "../../types/Team.ts";
import type {SeriesStats} from "../../types/SeriesStats.ts";
import {useState} from "react";
import {getMapImage} from "../../utils/mapImages.ts";
import {capitalize, formatDate, formatDuration, formatSeriesType} from "../../utils/formatters.ts";
import Match from "./Match.tsx";
import {Search} from "lucide-react";
import {useNavigate} from "react-router-dom";

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
    const navigate = useNavigate();

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
        <div className="lg:col-span-2 h-full">
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="h-full"
            >
                {selectedSeriesData ? (
                    <GlassBox className="h-full">
                        {/* Series Header */}
                        <div className="mb-6 bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black tracking-[0.2em] mb-1" style={{ color: '#ffffff' }}>Detailed Series Overview</span>
                                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                        <span style={{ color: '#BEABF7' }}>{team.name}</span>
                                        <span className="text-lg" style={{ color: '#ffffff' }}>VS</span>
                                        <span 
                                            onClick={() => opponent && navigate(`/dashboard/${opponent.id}`)}
                                            className="transition-colors duration-300"
                                            style={{
                                                cursor: opponent ? 'pointer' : 'default'
                                            }}
                                            onMouseEnter={(e) => opponent && (e.currentTarget.style.color = '#7f5af0')}
                                            onMouseLeave={(e) => opponent && (e.currentTarget.style.color = '#fffffe')}
                                        >
                                            {opponent?.name || 'Unknown'}
                                        </span>
                                    </h2>
                                </div>
                                <div className={`
                                        px-5 py-2 rounded-xl font-black text-2xl shadow-inner
                                        ${isSeriesWin
                                    ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30'
                                }
                                    `}>
                                    {seriesScore.wins}-{seriesScore.losses}
                                </div>

                            </div>
                            <div className="flex items-center gap-4 text-xs font-bold">
                                <span className="tracking-widest" style={{ color: '#ffffff' }}>{formatSeriesType(selectedSeriesData.seriesState.format)}</span>
                                <span className="w-1 h-1 rounded-full bg-white/10"></span>
                                <span style={{ color: 'rgba(255, 255, 254, 0.8)' }}>{formatDate(selectedSeriesData.seriesState.startedAt)}</span>
                            </div>
                        </div>

                        <div className="mb-6">
                            {/* Map Results */}
                            <div className="flex flex-row justify-center gap-3 overflow-x-auto p-2 custom-scrollbar">

                                <div
                                    onClick={() => {
                                        setSelectedMapTab('All Maps');
                                        setSelectedGameIndex(0);
                                    }}
                                    className="group relative rounded-lg py-2 px-6 border transition-all duration-300 hover:scale-105 overflow-hidden cursor-pointer flex flex-col items-center justify-center gap-2"
                                    style={{
                                        flex: (selectedSeriesData.seriesState?.games?.length || 0) <= 3 ? '1' : undefined,
                                        minWidth: (selectedSeriesData.seriesState?.games?.length || 0) <= 3 ? undefined : '120px',
                                        flexShrink: (selectedSeriesData.seriesState?.games?.length || 0) <= 3 ? undefined : 0,
                                        backgroundColor: selectedMapTab === 'All Maps' ? 'rgba(127, 90, 240, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                                        borderColor: selectedMapTab === 'All Maps' ? '#7f5af0' : 'rgba(255, 255, 255, 0.1)',
                                        boxShadow: selectedMapTab === 'All Maps' ? '0 10px 15px -3px rgba(127, 90, 240, 0.2)' : 'none'
                                    }}
                                >
                                    <span className="text-white font-black text-xs uppercase tracking-widest">All Maps</span>
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
                                                    group relative rounded-lg py-2 px-8 border transition-all duration-300 hover:scale-105 overflow-hidden cursor-pointer
                                                    ${(selectedSeriesData.seriesState?.games?.length || 0) <= 3 ? 'flex-1' : 'shrink-0 min-w-35'}
                                                    ${isWin
                                                ? 'border-emerald-400/30 hover:border-emerald-400/60'
                                                : 'border-rose-400/30 hover:border-rose-400/60'
                                            }
                                                    ${selectedMapTab === `Map ${idx + 1}`
                                                ? 'opacity-100'
                                                : 'opacity-80 hover:opacity-100'
                                            }
                                                `}
                                            style={{
                                                backgroundImage: game.map?.name && getMapImage(game.map.name) ? `url(${getMapImage(game.map.name)})` : undefined,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                boxShadow: selectedMapTab === `Map ${idx + 1}` ? '0 0 0 1px #7f5af0, 0 10px 15px -3px rgba(127, 90, 240, 0.2)' : undefined,
                                                borderColor: selectedMapTab === `Map ${idx + 1}` ? '#7f5af0' : undefined
                                            }}
                                        >
                                            <div className="absolute inset-0 bg-black/60"></div>
                                            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isWin ? 'bg-emerald-900/40' : 'bg-rose-900/40'}`}></div>
                                            <span className="absolute bottom-1 right-2 text-[10px] font-black text-white/40 z-10">{idx + 1}</span>

                                            <div className="relative z-10 flex flex-col items-center gap-0.5">
                                                <span className="text-white font-bold text-xs tracking-tight drop-shadow-md">{game.map?.name ? capitalize(game.map.name) : 'Unknown'}</span>
                                                <span className={`text-lg font-black drop-shadow-md ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {teamRoundsWon}-{opponentRoundsWon}
                                                    </span>
                                                <span className="text-white/60 text-[10px] font-mono drop-shadow-md">{formatDuration(game.duration)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>



                        {/* Match Stats */}
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <Match
                                match={selectedMapTab === 'All Maps' ? null : selectedSeriesData.seriesState.games[selectedGameIndex]}
                                allMaps={selectedMapTab === 'All Maps' ? selectedSeriesData.seriesState.games : undefined}
                                selectedTeamName={team.name}
                            />
                        </div>
                    </GlassBox>
                ) : (
                    <GlassBox className="h-full border-dashed border-white/10 flex flex-col items-center justify-center">
                        <Search className="w-16 h-16 mb-4" style={{ color: 'rgba(127, 90, 240, 0.3)' }} />
                        <h3 className="text-xl font-semibold text-white mb-2">No Series Selected</h3>
                        <p style={{ color: 'rgba(255, 255, 254, 0.7)' }}>Select a series from the list to view detailed statistics</p>
                    </GlassBox>
                )}
            </motion.div>
        </div>
    );
};

export default SeriesDetailedView;