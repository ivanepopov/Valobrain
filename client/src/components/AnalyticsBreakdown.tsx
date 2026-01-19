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
import type {Team} from "../types/Team.ts";
import PlayerStatisticsTable from "../components/PlayerStatisticsTable.tsx";
import AgentStatistics from "../components/AgentStatistics.tsx";
import MapPerformance from "../components/MapPerformance.tsx";
import TeamLevelStatsOverview from "../components/TeamLevelStatsOverview.tsx";
import WinConditionDistribution from "../components/WinConditionDistribution.tsx";
import type {TeamStats} from "../types/TeamStats.ts";
import type {SeriesStats} from "../types/SeriesStats.ts";

type Props = {
    team: Team | null;
    stats: TeamStats | null;
    allSeriesData: SeriesStats[];
}

const AnalyticsBreakdown = ({ team, stats, allSeriesData }: Props) => {
    if (!stats) return <div className="text-gray-500 italic">Loading stats...</div>;

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
            <TeamLevelStatsOverview 
                team={team}
                allSeriesData={allSeriesData}
            />

            <AgentStatistics 
                team={team} 
                allSeriesData={allSeriesData} 
            />

            <MapPerformance 
                team={team}
                allSeriesData={allSeriesData}
            />

            <WinConditionDistribution 
                team={team}
                allSeriesData={allSeriesData}
            />
            
            <PlayerStatisticsTable 
                team={team}
                roster={roster} 
                allSeriesData={allSeriesData}
            />
        </div>
    );
};

export default AnalyticsBreakdown;