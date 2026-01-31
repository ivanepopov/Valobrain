import { useState, memo } from "react";
import type { Team } from "../../types/Team.ts";
import type { SeriesStats } from "../../types/SeriesStats.ts";
import LoadingPage from "../ui/LoadingPage.tsx";
import SeriesList from "./SeriesList.tsx";
import SeriesDetailedView from "./SeriesDetailedView.tsx";

type Props = {
    team: Team;
    allSeriesData: SeriesStats[];
    isLoadingSeries: boolean;
}

/**
 * Match History Page
 *
 * Sub-Feature #1: Series Timeline
 * Sub-Feature #2: Individual Series Overview
 *
 * @param team Team to display stats for
 * @param allSeriesData All series data to display
 * @param isLoadingSeries Whether the series data is still loading
 */
const MatchHistory = memo(({ team, allSeriesData, isLoadingSeries }: Props) => {

    const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(allSeriesData[0]?.seriesState.games[0]?.id.split('-')[0] || null);

    if (isLoadingSeries) return <LoadingPage />;

    const selectedSeriesData = allSeriesData.find(s =>
        s.seriesState.games.some(game => game.id.startsWith(selectedSeriesId || "NEVER_MATCH"))
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left Column: Series List */}
            <SeriesList
                allSeriesData={allSeriesData}
                selectedSeriesId={selectedSeriesId}
                setSelectedSeriesId={setSelectedSeriesId}
                team={team}
            />

            {/* Right Column: Detailed View */}
            <SeriesDetailedView
                key={selectedSeriesId}
                selectedSeriesData={selectedSeriesData}
                team={team}
            />

        </div>
    );
});

export default MatchHistory;