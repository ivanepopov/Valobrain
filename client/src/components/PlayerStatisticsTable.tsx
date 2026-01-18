import type {Team} from "../types/Team.ts";
import PlayerStatistics from "./PlayerStatistics.tsx";
import type {SeriesStats} from "../types/SeriesStats.ts";

type Props = {
    team: Team | null;
    roster: any[];
    allSeriesData: SeriesStats[];
};

const PlayerStatisticsTable = ({ team, roster, allSeriesData }: Props) => {
    if (!team) return <div className="p-4 text-gray-400 italic">Select a team to view player analytics</div>;

    return (
        <div className="mt-6 overflow-hidden rounded-lg border border-gray-700 bg-gray-900 shadow-xl">
            <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-gray-800 text-xs uppercase text-gray-400">
                    <tr>
                        <th className="px-4 py-3">Player</th>
                        <th className="px-4 py-3 text-center">Matches</th>
                        <th className="px-4 py-3 text-center">Win %</th>
                        <th className="px-4 py-3 text-center">FB %</th>
                        <th className="px-4 py-3 text-center">KDA</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
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
        </div>
    );
};

export default PlayerStatisticsTable;