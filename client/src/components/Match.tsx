import React from 'react';
import type { MatchStats } from '../types/MatchStats';
import type { Team } from "../types/Team.ts";
import { getAgentLogo } from '../utils/agentLogos';

interface MatchProps {
    match: MatchStats | null;
    team: Team | null;
    allMaps?: MatchStats[]; // For "All Maps" aggregation
}

// Helper to aggregate player stats from all maps
const aggregatePlayerStats = (games: MatchStats[], teamName: string) => {
    const playerStatsMap: Record<string, {
        name: string;
        agents: Set<string>;
        kills: number;
        deaths: number;
        killAssistsGiven: number;
    }> = {};

    games.forEach(game => {
        const teamData = game.teams.find(t => t.name === teamName);
        if (!teamData) return;

        teamData.players.forEach(player => {
            if (!playerStatsMap[player.name]) {
                playerStatsMap[player.name] = {
                    name: player.name,
                    agents: new Set(),
                    kills: 0,
                    deaths: 0,
                    killAssistsGiven: 0,
                };
            }
            playerStatsMap[player.name].agents.add(player.character.name);
            playerStatsMap[player.name].kills += player.kills;
            playerStatsMap[player.name].deaths += player.deaths;
            playerStatsMap[player.name].killAssistsGiven += player.killAssistsGiven;
        });
    });

    return Object.values(playerStatsMap).map(p => ({
        name: p.name,
        character: { name: Array.from(p.agents).join(', ') },
        kills: p.kills,
        deaths: p.deaths,
        killAssistsGiven: p.killAssistsGiven,
    }));
};

// Reusable table component for consistent styling
const StatsTable: React.FC<{
    teamName: string;
    isWinner: boolean;
    players: Array<{
        name: string;
        character: { name: string };
        kills: number;
        deaths: number;
        killAssistsGiven: number;
    }>;
    isMultipleAgents?: boolean;
}> = ({ teamName, isWinner, players, isMultipleAgents = false }) => (
    <div className="relative">
        <h3 className={`text-sm font-black uppercase tracking-[0.3em] mb-4 flex items-center gap-3 ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
            <span className={`w-1 h-4 rounded-full ${isWinner ? 'bg-green-400' : 'bg-red-400'}`}></span>
            {teamName}
        </h3>

        <div className="backdrop-blur-sm bg-white/5 rounded-lg overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed">
                <thead>
                    <tr className="border-b border-white/10">
                        <th className="py-3 px-4 text-blue-200 text-sm w-[25%]">Player</th>
                        <th className="py-3 px-4 text-blue-200 text-sm w-[25%]">Agent</th>
                        <th className="py-3 px-4 text-center text-blue-200 text-sm w-[12.5%]">K</th>
                        <th className="py-3 px-4 text-center text-blue-200 text-sm w-[12.5%]">D</th>
                        <th className="py-3 px-4 text-center text-blue-200 text-sm w-[12.5%]">A</th>
                        <th className="py-3 px-4 text-center text-blue-200 text-sm w-[12.5%]">+/-</th>
                    </tr>
                </thead>
                <tbody>
                    {players.map((player, pIndex) => (
                        <tr key={pIndex} className="border-b border-white/5 hover:bg-white/5 transition-colors h-14">
                            <td className="py-3 px-4 text-white font-semibold">{player.name}</td>
                            <td className="py-3 px-4">
                                <div className="flex gap-1 items-center h-8">
                                    {isMultipleAgents ? (
                                        player.character.name.split(', ').map((agentName, i) => (
                                            getAgentLogo(agentName) ? (
                                                <img 
                                                    key={i}
                                                    src={getAgentLogo(agentName)} 
                                                    alt={agentName}
                                                    title={agentName}
                                                    className="w-8 h-8 rounded-lg border border-white/10 object-cover"
                                                />
                                            ) : (
                                                <span key={i} className="text-blue-100 text-xs bg-white/10 px-2 py-1 rounded">
                                                    {agentName}
                                                </span>
                                            )
                                        ))
                                    ) : (
                                        getAgentLogo(player.character.name) ? (
                                            <img 
                                                src={getAgentLogo(player.character.name)} 
                                                alt={player.character.name}
                                                title={player.character.name}
                                                className="w-8 h-8 rounded-lg border border-white/10 object-cover"
                                            />
                                        ) : (
                                            <span className="text-blue-100 text-sm">
                                                {player.character.name}
                                            </span>
                                        )
                                    )}
                                </div>
                            </td>
                            <td className="py-3 px-4 text-center text-blue-100 font-medium">{player.kills}</td>
                            <td className="py-3 px-4 text-center text-blue-100">{player.deaths}</td>
                            <td className="py-3 px-4 text-center text-blue-100">{player.killAssistsGiven}</td>
                            <td className={`py-3 px-4 text-center font-semibold ${
                                player.kills - player.deaths >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                                {player.kills - player.deaths > 0 ? '+' : ''}{player.kills - player.deaths}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const Match: React.FC<MatchProps> = ({ match, team, allMaps }) => {
    // If allMaps is provided, show aggregated stats
    const isAllMaps = allMaps && allMaps.length > 0;

    if (isAllMaps) {
        const teamNames = allMaps[0]?.teams.map(t => t.name) || [];
        
        return (
            <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-10">
                    {teamNames.map((teamName, teamIndex) => {
                        const aggregatedPlayers = aggregatePlayerStats(allMaps, teamName);
                        const winsCount = allMaps.filter(g => 
                            g.teams.find(t => t.name === teamName)?.won
                        ).length;
                        const isWinner = winsCount > allMaps.length / 2;

                        return (
                            <StatsTable
                                key={teamIndex}
                                teamName={teamName}
                                isWinner={isWinner}
                                players={aggregatedPlayers}
                                isMultipleAgents={true}
                            />
                        );
                    })}
                </div>
            </div>
        );
    }

    // Single map view
    if (!match) return null;

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-10">
                {match.teams.map((matchTeam, teamIndex) => (
                    <StatsTable
                        key={teamIndex}
                        teamName={matchTeam.name}
                        isWinner={matchTeam.won}
                        players={matchTeam.players}
                        isMultipleAgents={false}
                    />
                ))}
            </div>
        </div>
    );
};

export default Match;
