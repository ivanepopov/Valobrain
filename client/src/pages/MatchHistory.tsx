/**
 * Series History Page
 *
 * Data surface for viewing match history.
 *
 * Sub-Feature #1: Series Timeline
 * Sub-Feature #2: Series Stats
 */
import getTeamStats from "../services/getTeamStats.ts";
import {type JSX, useEffect, useState} from "react";
import Series from "../components/Series.tsx";
import type {Team} from "../types/Team.ts";

type Props = {
    team: Team | null;
}

const MatchHistory = ({ team }: Props) => {

    if (!team) return <div>Select a team</div>;

    const teamId = team.id;
    const timeFrame = "LAST_6_MONTHS";

    const [seriesElements, setSeriesElements] = useState<JSX.Element[] | null>(null);
    const [noHistory, setNoHistory] = useState(false);

    useEffect(() => {
        async function fetchTeamStats() {
            setNoHistory(false);
            await getTeamStats(teamId, timeFrame).then((stats) => {
                if (!stats || stats.aggregationSeriesIds.length === 0) {
                    setSeriesElements([]);
                    setNoHistory(true);
                    return;
                }
                console.log(stats.aggregationSeriesIds);

                const elements = stats.aggregationSeriesIds.map((seriesId) => (
                    <Series
                        key={seriesId}
                        seriesId={seriesId}
                        team={team}
                    />
                ));

                setSeriesElements(elements);
            });
        }

        fetchTeamStats();
    }, [teamId, timeFrame, team]);

    // return match history for the selected team, and a Series component for each series in aggregateSeriesIds
    return (
        <div>
            <div className="flex flex-col gap-2">
                {noHistory ? (
                    <div className="text-gray-500 py-4">
                        No match history available for this team within time frame
                    </div>
                ) : (
                    seriesElements
                )}
            </div>
        </div>
    );
};

export default MatchHistory;