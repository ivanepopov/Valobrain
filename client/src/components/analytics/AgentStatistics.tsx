import type {SeriesStats} from "../../types/SeriesStats.ts";
import type {Team} from "../../types/Team.ts";
import { getAgentLogo } from "../../utils/agentLogos.ts";
import { capitalize } from "../../utils/formatters.ts";
import { GlassBox } from "../ui/GlassBox.tsx";
import { Activity, Users } from "lucide-react";

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
            <GlassBox>
                <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Agent Comfort</h3>
                </div>
                <div className="space-y-4">
                    {sortedAgents.slice(0, 6).map((agent) => (
                        <div key={agent.name} className="flex items-center gap-4">
                            {getAgentLogo(agent.name) ? (
                                <img 
                                    src={getAgentLogo(agent.name)} 
                                    alt={agent.name}
                                    title={agent.name}
                                    className="w-12 h-12 rounded-lg border-2 border-white/10 object-cover"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-lg border-2 border-white/10 bg-white/10 flex items-center justify-center text-sm text-blue-200/60 font-bold">
                                    {agent.name.substring(0, 2)}
                                </div>
                            )}
                            <div className="flex-1">
                                <div className="flex justify-between mb-1">
                                    <span className="text-blue-100 font-semibold">{capitalize(agent.name)}</span>
                                    <span className="text-blue-400 font-semibold">{agent.pickRate.toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className="h-2 rounded-full transition-all duration-500" 
                                        style={{ 
                                            width: `${agent.pickRate}%`,
                                            backgroundColor: agent.pickRate < 50 
                                                ? '#ef4444' 
                                                : agent.pickRate < 70 
                                                    ? '#eab308' 
                                                    : '#22c55e'
                                        }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassBox>

            {/* Total Picks Bar Graph */}
            <GlassBox>
                <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Agent Usage</h3>
                </div>
                <div className="mt-4">
                    <div className="relative h-48">
                        {/* Y-Axis Grid Lines & Numbers */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                            {[...Array(5)].map((_, i) => {
                                const val = Math.round(maxPicks - (maxPicks / 4) * i);
                                return (
                                    <div key={i} className="flex items-center w-full gap-2 h-0">
                                        <span className="text-[10px] font-mono text-blue-200/40 w-4 text-right">{val}</span>
                                        <div className="flex-1 h-px bg-white/10" />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Bars Container */}
                        <div className="absolute inset-0 flex items-end justify-between gap-2 px-2 ml-6">
                            {sortedAgents.slice(0, 8).map((agent) => (
                                <div key={agent.name} className="flex flex-col items-center flex-1 group h-full justify-end">
                                    <div className="relative w-full flex flex-col items-center justify-end h-full">
                                        {/* Tooltip-like value */}
                                        <span className="absolute -top-6 text-[10px] font-mono text-blue-200/60 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {agent.picks}
                                        </span>
                                        <div 
                                            className="w-full bg-blue-400/40 border-t-2 border-blue-400 rounded-t-sm transition-all duration-500 group-hover:bg-blue-400/60"
                                            style={{ height: `${(agent.picks / maxPicks) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Agent Icons (X-Axis Labels) */}
                    <div className="flex justify-between gap-2 px-2 ml-6 mt-4">
                        {sortedAgents.slice(0, 8).map((agent) => (
                            <div key={agent.name} className="flex-1 flex justify-center">
                                {getAgentLogo(agent.name) ? (
                                    <img 
                                        src={getAgentLogo(agent.name)} 
                                        alt={agent.name}
                                        title={agent.name}
                                        className="w-8 h-8 rounded-md border border-white/5 object-cover shrink-0"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-[8px] text-blue-200/60 font-bold shrink-0">
                                        {agent.name.substring(0, 2)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </GlassBox>
        </div>
    );
};

export default AgentStatistics;