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
import AgentStatistics from "./AgentStatistics.tsx";
import MapPerformance from "./MapPerformance.tsx";
import TeamLevelStatsOverview from "./TeamLevelStatsOverview.tsx";
import WinConditionDistribution from "./WinConditionDistribution.tsx";
import CompositionHistory from "./CompositionHistory.tsx";
import type {TeamStats} from "../../types/TeamStats.ts";
import type {SeriesStats} from "../../types/SeriesStats.ts";
import { useState, useMemo } from "react";
import MapFilter from "../ui/MapFilter.tsx";
import HistoryFilter from "../ui/HistoryFilter.tsx";

const timeOptions = [
    { value: "all", label: "All Time" },
    { value: "30", label: "Last 30 Days" },
    { value: "60", label: "Last 60 Days" },
    { value: "90", label: "Last 90 Days" },
];

type Props = {
    team: Team | null;
    stats: TeamStats | null;
    allSeriesData: SeriesStats[];
    isLoadingSeries: boolean;
}

const AnalyticsBreakdown = ({ team, stats, allSeriesData, isLoadingSeries }: Props) => {
    const [selectedMap, setSelectedMap] = useState<string>("All");
    const [timeRange, setTimeRange] = useState<string>("all");

    if (!team || !stats || isLoadingSeries) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 bg-gray-900/50 border border-gray-800 rounded-xl animate-pulse" />
                    ))}
                </div>
                <div className="hidden lg:block h-96 bg-gray-900/20 border border-gray-800 rounded-2xl animate-pulse" />
            </div>
        );
    }

    const filteredSeriesData = useMemo(() => {
        let filtered = [...allSeriesData];

        // 1. Filter by Date Range
        if (timeRange !== 'all') {
            const now = new Date();
            const days = parseInt(timeRange);
            const cutoff = new Date(now.setDate(now.getDate() - days));

            filtered = filtered.filter(series => {
                const seriesDate = new Date(series.seriesState.startedAt);
                return seriesDate >= cutoff;
            });
        }

        // 2. Filter by Map (Filter games within series)
        if (selectedMap !== 'All') {
            filtered = filtered.map(series => ({
                ...series,
                seriesState: {
                    ...series.seriesState,
                    games: series.seriesState.games.filter(game => game.map.name.toLowerCase() === selectedMap.toLowerCase())
                }
            })).filter(series => series.seriesState.games.length > 0);
        }

        return filtered;
    }, [allSeriesData, selectedMap, timeRange]);

    // Derived roster from all matches
    const playersMap = new Map();
    allSeriesData.forEach(series => {
        series.seriesState.games.forEach(game => {
            const teamMatch = game.teams.find(t => t.name === team?.name);
            teamMatch?.players.forEach(p => {
                playersMap.set(p.name, { id: p.name, nickname: p.name });
            });
        });
    });
    const roster = Array.from(playersMap.values());

    return (
        <div className="p-6">
            {/* Filters Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-slate-900/50 border border-slate-800 p-4 rounded-2xl backdrop-blur-sm">
                <div className="flex flex-wrap gap-4 items-center">
                    {/* Time Range Filter */}
                    <HistoryFilter
                        label="Timeframe"
                        value={timeRange} 
                        onChange={setTimeRange} 
                        options={timeOptions} 
                    />

                    {/* Map Filter */}
                    <MapFilter selectedMap={selectedMap} setSelectedMap={setSelectedMap} />
                </div>
                
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Showing Data From</p>
                    <p className="text-sm font-black text-blue-400 uppercase italic">
                        {filteredSeriesData.length} Matches Found
                    </p>
                </div>
            </div>

            <TeamLevelStatsOverview 
                team={team}
                allSeriesData={filteredSeriesData}
            />

            <CompositionHistory
                team={team}
                allSeriesData={filteredSeriesData}
                selectedMap={selectedMap}
            />

            <AgentStatistics 
                team={team}
                allSeriesData={filteredSeriesData} 
            />

            <MapPerformance 
                team={team}
                allSeriesData={filteredSeriesData}
            />

            <WinConditionDistribution 
                team={team}
                allSeriesData={filteredSeriesData}
            />
            
            <PlayerStatisticsTable 
                team={team}
                roster={roster} 
                allSeriesData={filteredSeriesData}
            />
        </div>
    );
};

export default AnalyticsBreakdown;