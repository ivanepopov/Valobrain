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

    const selectedTeam = team.name;
    const teamId = team.id;
    const timeFrame = "LAST_6_MONTHS";

    const [seriesElements, setSeriesElements] = useState<JSX.Element[]>();

    useEffect(() => {
        async function fetchTeamStats() {
            await getTeamStats(teamId, timeFrame).then((stats) => {
                if (!stats || stats.aggregationSeriesIds.length === 0) return;
                console.log(stats.aggregationSeriesIds);

                const elements = stats.aggregationSeriesIds.map((seriesId) => (
                    <Series
                        key={seriesId}
                        seriesId={seriesId}
                        selectedTeam={selectedTeam}
                    />
                ));

                setSeriesElements(elements);
            });
        }

        fetchTeamStats();
    }, [teamId, timeFrame]);

    // return match history for the selected team, and a Series component for each series in aggregateSeriesIds
    return (
        <div>
            <div className="flex flex-col gap-2">
                {seriesElements}
            </div>
        </div>
    );
};

export default MatchHistory;