/**
 * Analytics Breakdown Page
 *
 * A non-generative, non-opinionated data surface.
 * Its job is to present raw match information in visual form so users can:
 * - Validate scouting conclusions
 * - Do their own analysis
 * - Spot patterns that are not emphasized
 *
 * Sub-Feature #1: Team-Level Statistics Overview
 * Sub-Feature #2: Agent Usage & Composition Graphs
 * Sub-Feature #3: Map Performance Graphs
 * Sub-Feature #4: Win Condition Distribution
 * Sub-Feature #5: Tempo & Timing Visualizations
 * Sub-Feature #6: Situational Performance Graphs
 * Sub-Feature #7: Player Statistics Tables (Overall)
 */
import type {Team} from "../../types/Team.ts";
import PlayerStatisticsTable from "./PlayerStatisticsTable.tsx";
import MapPerformance from "./MapPerformance.tsx";
import TeamLevelStatsOverview from "./TeamLevelStatsOverview.tsx";
import WinConditionDistribution from "./WinConditionDistribution.tsx";
import CompositionHistory from "./CompositionHistory.tsx";
import type {SeriesStats} from "../../types/SeriesStats.ts";
import { useState, useMemo, memo } from "react";
import { motion } from "motion/react";
import LoadingPage from "../ui/LoadingPage.tsx";
import { GlassBox } from "../ui/GlassBox.tsx";


type Props = {
    team: Team;
    allSeriesData: SeriesStats[];
    isLoadingSeries: boolean;
}

const AnalyticsBreakdown = memo(({ team, allSeriesData, isLoadingSeries }: Props) => {
    const [selectedMap, setSelectedMap] = useState<string>("All");
    const [timeRange, setTimeRange] = useState<string>("all");

    const filteredSeriesData = useMemo(() => {
        let filtered = [...allSeriesData];

        // 1. Filter by Date Range
        if (timeRange !== 'all') {
            const days = parseInt(timeRange, 10);
            if (!isNaN(days)) {
                const now = new Date();
                const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

                filtered = filtered.filter(series => {
                    const seriesDate = new Date(series.seriesState.startedAt);
                    return !isNaN(seriesDate.getTime()) && seriesDate >= cutoff;
                });
            }
        }

        // 2. Filter by Map (Filter games within series)
        if (selectedMap !== 'All') {
            const normalizedSelectedMap = selectedMap.toLowerCase();
            filtered = filtered.reduce<typeof filtered>((acc, series) => {
                const filteredGames = series.seriesState.games.filter(
                    game => game.map?.name?.toLowerCase() === normalizedSelectedMap
                );

                if (filteredGames.length > 0) {
                    acc.push({
                        ...series,
                        seriesState: {
                            ...series.seriesState,
                            games: filteredGames
                        }
                    });
                }
                return acc;
            }, []);
        }

        return filtered;
    }, [allSeriesData, selectedMap, timeRange]);

    // Derived roster from all matches
    const roster = useMemo(() => {
        const playersMap = new Map();
        allSeriesData.forEach(series => {
            series.seriesState?.games?.forEach(game => {
                const teamMatch = game.teams?.find(t => t.name === team?.name);
                teamMatch?.players?.forEach(p => {
                    if (p.name) {
                        playersMap.set(p.name, { id: p.name, nickname: p.name });
                    }
                });
            });
        });
        return Array.from(playersMap.values());
    }, [allSeriesData, team?.name]);

    if (isLoadingSeries) return <LoadingPage />;

    const maps = ['All', 'Abyss', 'Ascent', 'Bind', 'Breeze', 'Corrode', 'Fracture', 'Haven', 'Icebox', 'Lotus', 'Pearl', 'Split', 'Sunset'];
    const timeFilters = ['All', 'Last 30 Days', 'Last 60 Days', 'Last 90 Days'];

    return (
        <div>
            {/* Filters Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-6"
            >
                <GlassBox>
                    {/* Map Filter */}
                    <div className="mb-6">
                        <label className="text-blue-200 text-sm mb-2 block">Filter by Map</label>
                        <div className="flex gap-2 flex-wrap">
                            {maps.map((map) => (
                                <button
                                    key={map}
                                    onClick={() => setSelectedMap(map)}
                                    className={`
                                        px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300
                                        ${selectedMap === map
                                            ? 'bg-blue-900 text-white'
                                            : 'bg-white/5 text-blue-200 hover:bg-white/10'
                                        }
                                    `}
                                >
                                    {map}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Timeframe Filter */}
                    <div>
                        <label className="text-blue-200 text-sm mb-2 block">Filter by Timeframe</label>
                        <div className="flex gap-2 flex-wrap">
                            {timeFilters.map((timeframe) => (
                                <button
                                    key={timeframe}
                                    onClick={() => setTimeRange(
                                        timeframe === 'All' ? 'all' :
                                        timeframe === 'Last 30 Days' ? '30' :
                                        timeframe === 'Last 60 Days' ? '60' : '90'
                                    )}
                                    className={`
                                        px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300
                                        ${(timeframe === 'All' && timeRange === 'all') ||
                                          (timeframe === 'Last 30 Days' && timeRange === '30') ||
                                          (timeframe === 'Last 60 Days' && timeRange === '60') ||
                                          (timeframe === 'Last 90 Days' && timeRange === '90')
                                            ? 'bg-blue-900 text-white'
                                            : 'bg-white/5 text-blue-200 hover:bg-white/10'
                                        }
                                    `}
                                >
                                    {timeframe}
                                </button>
                            ))}
                        </div>
                    </div>
                </GlassBox>
            </motion.div>

            <TeamLevelStatsOverview 
                team={team}
                allSeriesData={filteredSeriesData}
            />

            <CompositionHistory
                team={team}
                allSeriesData={filteredSeriesData}
                selectedMap={selectedMap}
            />
            
            <PlayerStatisticsTable 
                team={team}
                roster={roster} 
                allSeriesData={allSeriesData}
            />

            <MapPerformance 
                team={team}
                allSeriesData={filteredSeriesData}
            />

            <WinConditionDistribution 
                team={team}
                allSeriesData={filteredSeriesData}
            />
        </div>
    );
});

export default AnalyticsBreakdown;