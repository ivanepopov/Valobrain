/**
 * Series History Page
 *
 * Data surface for viewing match history.
 *
 * Sub-Feature #1: Series Timeline
 * Sub-Feature #2: Series Stats
 */
import type {TeamStats} from "../types/TeamStats.ts";
import getTeamStats from "../services/getTeamStats.ts";
import {type JSX, useEffect, useState} from "react";
import Series from "../components/Series.tsx";

type Props = {
    teamName: string;
}

const MatchHistory = ({ teamName }: Props) => {

    const selectedTeam = teamName;
    const teamId = "79";
    const timeFrame = "LAST_6_MONTHS";

    const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
    const [seriesElements, setSeriesElements] = useState<JSX.Element[]>();

    useEffect(() => {
        async function fetchTeamStats() {
            await getTeamStats(teamId, timeFrame).then((stats) => setTeamStats(stats));
        }

        fetchTeamStats();
    }, [teamId, timeFrame]);

    useEffect(() => {
        if (!teamStats?.aggregationSeriesIds) return;

        const elements = teamStats.aggregationSeriesIds.map((seriesId) => (
            <Series
                key={seriesId}
                seriesId={seriesId}
                selectedTeam={selectedTeam}
            />
        ));

        console.log(elements);

        setSeriesElements(elements);
    }, [teamStats, selectedTeam]);

    // return match history for the selected team, and a Series component for each series in aggregateSeriesIds
    return (
        <div>
            <h1 className="pb-4">
                Match History Page
            </h1>
            <div className="flex flex-col gap-2">
                {seriesElements}
            </div>
        </div>
    );
};

export default MatchHistory;