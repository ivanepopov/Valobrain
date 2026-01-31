import { useState, useMemo, memo } from "react";
import type { Team } from "../../types/Team.ts";
import type { SeriesStats } from "../../types/SeriesStats.ts";
import LoadingPage from "../ui/LoadingPage.tsx";
import SeriesList from "./SeriesList.tsx";
import SeriesDetailedView from "./SeriesDetailedView.tsx";
import SeriesFilters from "../ui/SeriesFilters.tsx";

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
                const hasMap = series.seriesState.games.some(
                    game => game.map?.name?.toLowerCase() === normalizedSelectedMap
                );

                if (hasMap) {
                    acc.push(series);
                }
                return acc;
            }, []);
        }

        return filtered;
    }, [allSeriesData, selectedMap, timeRange]);

    const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(allSeriesData[0]?.seriesState.games[0]?.id.split('-')[0] || null);

    // Keep track of the previous filtered data to detect changes and reset selection
    const [prevFilteredData, setPrevFilteredData] = useState(filteredSeriesData);

    if (filteredSeriesData !== prevFilteredData) {
        setPrevFilteredData(filteredSeriesData);
        
        const currentIsStillVisible = filteredSeriesData.some(series =>
            series.seriesState.games.some(game => game.id.startsWith(selectedSeriesId || "NEVER_MATCH"))
        );

        if (!currentIsStillVisible) {
            const firstSeriesId = filteredSeriesData[0]?.seriesState.games[0]?.id.split('-')[0];
            setSelectedSeriesId(firstSeriesId || null);
        }
    }

    if (isLoadingSeries) return <LoadingPage />;

    const selectedSeriesData = allSeriesData.find(s =>
        s.seriesState.games.some(game => game.id.startsWith(selectedSeriesId || "NEVER_MATCH"))
    );

    return (
        <div className="flex flex-col gap-6">
            <SeriesFilters
                setSelectedMap={setSelectedMap}
                selectedMap={selectedMap}
                setTimeRange={setTimeRange}
                timeRange={timeRange}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                {/* Left Column: Series List */}
                <SeriesList
                    allSeriesData={filteredSeriesData}
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
        </div>
    );
});

export default MatchHistory;