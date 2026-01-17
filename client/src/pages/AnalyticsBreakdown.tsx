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

type Props = {
    team: Team | null;
}

const AnalyticsBreakdown = ({ team }: Props) => {
    if (!team) return <div>Select a team</div>;

    return (
        <h1>
            Analytics Breakdown Page {team.name && `- ${team.name}`}
        </h1>
    );
};

export default AnalyticsBreakdown;