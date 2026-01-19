import type { Team } from "../types/Team.ts";
import type { SeriesStats } from "../types/SeriesStats.ts";

type Props = {
    team: Team | null;
    allSeriesData: SeriesStats[];
};

const WinConditionDistribution = ({ team, allSeriesData }: Props) => {
    if (!team) return null;

    const attackConditions = {
        bombDetonation: 0,
        prePlantKills: 0,
        postPlantKills: 0
    };

    const defenseConditions = {
        bombDefusal: 0,
        prePlantKills: 0,
        timeExpired: 0
    };

    allSeriesData.forEach(series => {
        series.seriesState.games.forEach(game => {
            game.segments.forEach(round => {
                const teamInRound = round.teams.find(t => t.name === team.name);
                const opponentInRound = round.teams.find(t => t.name !== team.name);

                if (!teamInRound || !opponentInRound || !teamInRound.won) return;

                const objectives = teamInRound.objectives.map(o => o.id);
                const enemyObjectives = opponentInRound.objectives.map(o => o.id);
                
                // Check for bomb plant/explode in both team's objectives depending on context
                const isPlant = objectives.includes('plantBomb') || enemyObjectives.includes('plantBomb');
                const isExplode = objectives.includes('explodeBomb');
                const isDefuse = objectives.includes('defuseBomb');

                // Pre-calculating kills for the winning team in this round
                // (Looking at opponent's deaths - since specific round deaths aren't in SegmentStats, 
                // we infer from logic or usually specific event flags if they were available)
                // For this implementation, we follow the user logic: "all 5 defenders/attackers killed"
                // Assuming lack of 'explode' or 'defuse' objectives implies kill win if it's not time.
                
                if (teamInRound.side === 'attacker') {
                    if (isExplode) {
                        attackConditions.bombDetonation++;
                    } else if (!isPlant) {
                        attackConditions.prePlantKills++;
                    } else {
                        attackConditions.postPlantKills++;
                    }
                } else if (teamInRound.side === 'defender') {
                    if (isDefuse) {
                        defenseConditions.bombDefusal++;
                    } else if (!isPlant && objectives.length === 0 && enemyObjectives.length === 0) {
                        // "Time expired (no objectives for enemy team, and round marked as won)"
                        defenseConditions.timeExpired++;
                    } else {
                        defenseConditions.prePlantKills++;
                    }
                }
            });
        });
    });

    const totalAttackWins = Object.values(attackConditions).reduce((a, b) => a + b, 0);
    const totalDefenseWins = Object.values(defenseConditions).reduce((a, b) => a + b, 0);

    const renderTable = (title: string, data: Record<string, number>, total: number) => (
        <div className="flex-1 rounded-lg border border-gray-700 bg-gray-900 p-4">
            <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-6 font-bold">{title}</h3>
            <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-gray-800 text-xs uppercase text-gray-400">
                    <tr>
                        <th className="px-4 py-2">Condition</th>
                        <th className="px-4 py-2 text-center">Count</th>
                        <th className="px-4 py-2 text-center">%</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                    {Object.entries(data).map(([key, value]) => (
                        <tr key={key} className="hover:bg-gray-800/50">
                            <td className="px-4 py-2 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</td>
                            <td className="px-4 py-2 text-center">{value}</td>
                            <td className="px-4 py-2 text-center">
                                {total > 0 ? ((value / total) * 100).toFixed(1) : "0.0"}%
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-gray-800/30 font-bold">
                    <tr>
                        <td className="px-4 py-2">Total Wins</td>
                        <td className="px-4 py-2 text-center">{total}</td>
                        <td className="px-4 py-2 text-center">100%</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );

    return (
        <div className="mt-8">
            <div className="flex flex-col gap-6 lg:flex-row">
                {renderTable("Attack Win Conditions", attackConditions, totalAttackWins)}
                {renderTable("Defense Win Conditions", defenseConditions, totalDefenseWins)}
            </div>
        </div>
    );
};

export default WinConditionDistribution;