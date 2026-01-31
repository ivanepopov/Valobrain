import Series from "./Series.tsx";
import GlassBox from "../ui/GlassBox.tsx";
import type {SeriesStats} from "../../types/SeriesStats.ts";
import type {Team} from "../../types/Team.ts";

type Props = {
    allSeriesData: SeriesStats[];
    selectedSeriesId: string | null;
    setSelectedSeriesId: (seriesId: string) => void;
    team: Team;
};

/**
 * Match History Page Sub-Feature #1: Series List
 *
 * Displays a list of series for a given team, allowing selection of a series to view detailed match history.
 *
 * @param allSeriesData All series data to display
 * @param selectedSeriesId Currently selected series ID
 * @param setSelectedSeriesId Function to set the selected series ID
 * @param team The team for which series are being displayed
 */
const SeriesList = ({ allSeriesData, selectedSeriesId, setSelectedSeriesId, team }: Props) => {
    return (
        <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-2 custom-scrollbar">
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
                            onClick={() => setSelectedSeriesId(seriesId)}
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
    );
};

export default SeriesList;