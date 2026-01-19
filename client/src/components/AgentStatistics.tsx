import type {SeriesStats} from "../types/SeriesStats.ts";
import type {Team} from "../types/Team.ts";

type Props = {
    team: Team | null;
    allSeriesData: SeriesStats[];
}

const AgentStatistics = ({ team, allSeriesData }: Props) => {
    if (!team) return null;

    // 1. Aggregate statistics for all agents picked by the team
    const agentStatsMap: Record<string, { count: number; games: number }> = {};
    let totalGames = 0;

    allSeriesData.forEach(series => {
        series.seriesState.games.forEach(game => {
            // Find the specific team in this game
            const teamMatch = game.teams.find(t => t.name === team.name);
            if (!teamMatch) return;

            totalGames++;
            teamMatch.players.forEach(player => {
                const agentName = player.character.name;
                if (!agentStatsMap[agentName]) {
                    agentStatsMap[agentName] = { count: 0, games: 0 };
                }
                agentStatsMap[agentName].count += 1;
            });
        });
    });

    // 2. Format data for the charts
    // Pick Rate: Percentage of matches where the agent was picked (Total picks / total games)
    // Note: In Valorant, an agent can only be picked once per team per game.
    const sortedAgents = Object.entries(agentStatsMap)
        .map(([name, stats]) => ({
            name,
            picks: stats.count,
            pickRate: (stats.count / totalGames) * 100
        }))
        .sort((a, b) => b.picks - a.picks);

    const maxPicks = Math.max(...sortedAgents.map(a => a.picks), 1);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {/* Pick Rate Card */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
                <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-6 font-bold">Agent Pick Rate (%)</h3>
                <div className="space-y-4">
                    {sortedAgents.slice(0, 6).map((agent) => (
                        <div key={agent.name} className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-white font-medium">{agent.name}</span>
                                <span className="text-gray-400 font-mono">{agent.pickRate.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                    style={{ width: `${agent.pickRate}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Total Picks Bar Graph */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
                <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-6 font-bold">Total Agent Picks</h3>
                <div className="relative h-48 mt-4">
                    {/* Y-Axis Grid Lines & Numbers */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        {[...Array(5)].map((_, i) => {
                            const val = Math.round(maxPicks - (maxPicks / 4) * i);
                            return (
                                <div key={i} className="flex items-center w-full gap-2">
                                    <span className="text-[10px] font-mono text-gray-600 w-4 text-right">{val}</span>
                                    <div className="flex-1 h-px bg-gray-800/50" />
                                </div>
                            );
                        })}
                    </div>

                    {/* Bars Container */}
                    <div className="absolute inset-0 flex items-end justify-between gap-2 px-2 ml-6">
                        {sortedAgents.slice(0, 8).map((agent) => (
                            <div key={agent.name} className="flex flex-col items-center flex-1 group h-full justify-end">
                                <div className="relative w-full flex flex-col items-center">
                                    {/* Tooltip-like value */}
                                    <span className="absolute -top-6 text-[10px] font-mono text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {agent.picks}
                                    </span>
                                    <div 
                                        className="w-full bg-indigo-600/40 border-t-2 border-indigo-400 rounded-t-sm transition-all duration-500 group-hover:bg-indigo-500/60"
                                        style={{ height: `${(agent.picks / maxPicks) * 160}px` }}
                                    />
                                </div>
                                <span className="text-[10px] text-gray-400 mt-3 rotate-45 origin-left truncate w-12 text-center">
                                    {agent.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentStatistics;