import type {Team} from "../../types/Team.ts";
import PlayerStatisticsTable from "./PlayerStatisticsTable.tsx";
import MapPerformance from "./MapPerformance.tsx";
import TeamLevelStatsOverview from "./TeamLevelStatsOverview.tsx";
import WinConditionDistribution from "./WinConditionDistribution.tsx";
import CompositionHistory from "./CompositionHistory.tsx";
import type {SeriesStats} from "../../types/SeriesStats.ts";
import { useState, useMemo, memo } from "react";
import LoadingPage from "../ui/LoadingPage.tsx";
import SeriesFilters from "../ui/SeriesFilters.tsx";

type Props = {
    team: Team;
    allSeriesData: SeriesStats[];
    isLoadingSeries: boolean;
}

interface PlayerRosterItem {
    id: string;
    nickname: string;
}

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
 * Sub-Feature #3: Player Statistics Tables
 * Sub-Feature #4: Map Performance Graphs
 * Sub-Feature #5: Win Condition Distribution
 *
 * @param team Team to display stats for
 * @param allSeriesData All series data to display
 * @param isLoadingSeries Whether the series data is still loading
 */
const AnalyticsBreakdown = memo(({ team, allSeriesData, isLoadingSeries }: Props) => {
    const [selectedMap, setSelectedMap] = useState<string>("All");
    const [timeRange, setTimeRange] = useState<string>("all");

    // Filter series data based on the selected map and time range
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

    // Get the derived roster from all matches
    const roster = useMemo<PlayerRosterItem[]>(() => {
        const playersMap = new Map<string, PlayerRosterItem>();
        allSeriesData.forEach(series => {
            series.seriesState.games.forEach(game => {
                const teamMatch = game.teams.find(t => t.name === team?.name);
                if (!teamMatch) return;

                teamMatch.players.forEach(p => {
                    if (p.name) {
                        playersMap.set(p.name, { id: p.name, nickname: p.name });
                    }
                });
            });
        });
        return Array.from(playersMap.values());
    }, [allSeriesData, team.name]);

    if (isLoadingSeries) return <LoadingPage />;

    return (
        <div>
            <SeriesFilters
                setSelectedMap={setSelectedMap}
                selectedMap={selectedMap}
                setTimeRange={setTimeRange}
                timeRange={timeRange}
            />

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
                roster={roster}
                allSeriesData={filteredSeriesData}
            />

            <MapPerformance 
                team={team}
                allSeriesData={filteredSeriesData}
                selectedMap={selectedMap}
            />

            <WinConditionDistribution 
                team={team}
                allSeriesData={filteredSeriesData}
            />
        </div>
    );
});

export default AnalyticsBreakdown;