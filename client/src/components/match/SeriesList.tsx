import Series from "./Series.tsx";
import GlassBox from "../ui/GlassBox.tsx";
import type {SeriesStats} from "../../types/SeriesStats.ts";
import type {Team} from "../../types/Team.ts";
import { Search } from "lucide-react";

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
        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {allSeriesData.length === 0 ? (
                <GlassBox className="p-12 text-center border-dashed border-white/10 flex flex-col items-center justify-center">
                    <Search className="w-16 h-16 mb-4" style={{ color: 'rgba(127, 90, 240, 0.3)' }} />
                    <h3 className="text-xl font-semibold text-white mb-2">No matches found</h3>
                    <p style={{ color: 'rgba(255, 255, 254, 0.7)' }}>Try adjusting your filters to find what you're looking for</p>
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