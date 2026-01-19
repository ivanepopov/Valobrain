import type {Team} from "../types/Team.ts";
import PlayerStatistics from "./PlayerStatistics.tsx";
import type {SeriesStats} from "../types/SeriesStats.ts";
import { GlassBox } from "./GlassBox.tsx";

type Props = {
    team: Team | null;
    roster: any[];
    allSeriesData: SeriesStats[];
};

const PlayerStatisticsTable = ({ team, roster, allSeriesData }: Props) => {
    if (!team) return <div className="p-4 text-blue-200/40 italic">Select a team to view player analytics</div>;

    return (
        <GlassBox className="mt-6 p-0 overflow-hidden">
            <table className="w-full text-left text-sm text-blue-100">
                <thead className="bg-white/5 text-xs uppercase text-blue-200/60">
                    <tr>
                        <th className="px-4 py-3">Player</th>
                        <th className="px-4 py-3 text-center">Matches</th>
                        <th className="px-4 py-3 text-center">Win %</th>
                        <th className="px-4 py-3 text-center">ADR</th>
                        <th className="px-4 py-3 text-center">FB %</th>
                        <th className="px-4 py-3 text-center">KDA</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                    {roster.map((player) => (
                        <PlayerStatistics 
                            key={player.id} 
                            playerId={player.id} 
                            playerName={player.nickname}
                            seriesData={allSeriesData}
                        />
                    ))}
                </tbody>
            </table>
        </GlassBox>
    );
};

export default PlayerStatisticsTable;