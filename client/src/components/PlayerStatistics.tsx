import React from 'react';
import type { SeriesStats } from "../types/SeriesStats.ts";

interface PlayerStatisticsProps {
    playerId: string;
    playerName: string;
    seriesData: SeriesStats[];
}

const PlayerStatistics: React.FC<PlayerStatisticsProps> = ({ playerName, seriesData }) => {
    // 1. Aggregate stats from all games
    let totalKills = 0;
    let totalDeaths = 0;
    let totalAssists = 0;
    let gamesPlayed = 0;
    let gamesWon = 0;
    const agentCounts: Record<string, number> = {};

    seriesData.forEach(series => {
        series.seriesState.games.forEach(game => {
            // Find the player in this specific game
            const playerMatch = game.teams
                .flatMap(t => t.players)
                .find(p => p.name === playerName);

            if (playerMatch) {
                const teamWon = game.teams.find(t => t.players.some(p => p.name === playerName))?.won;
                
                gamesPlayed++;
                if (teamWon) gamesWon++;
                
                totalKills += playerMatch.kills;
                totalDeaths += playerMatch.deaths;
                totalAssists += playerMatch.killAssistsGiven;

                // Track agent usage
                const agentName = playerMatch.character.name;
                agentCounts[agentName] = (agentCounts[agentName] || 0) + 1;
            }
        });
    });

    // 2. Calculate derived metrics
    const winRate = gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0;
    const kda = totalDeaths > 0 
        ? ((totalKills + totalAssists) / totalDeaths).toFixed(2) 
        : (totalKills + totalAssists).toFixed(2);

    // Get top 3 agents
    const topAgents = Object.entries(agentCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name]) => name);

    return (
        <tr className="hover:bg-gray-800/50 transition-colors border-b border-gray-800/50 last:border-0">
            <td className="px-4 py-4">
                <div className="flex flex-col">
                    <span className="font-bold text-white">{playerName}</span>
                    <div className="flex gap-1 mt-1">
                        {topAgents.map(agent => (
                            <span key={agent} className="text-[10px] uppercase px-1.5 py-0.5 bg-gray-800 rounded text-gray-400 border border-gray-700">
                                {agent}
                            </span>
                        ))}
                    </div>
                </div>
            </td>
            <td className="px-4 py-4 text-center font-mono text-gray-400">
                {gamesPlayed}
            </td>
            <td className="px-4 py-4 text-center">
                <span className={`font-bold ${winRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                    {winRate.toFixed(0)}%
                </span>
            </td>
            <td className="px-4 py-4 text-center font-mono">
                <div className="flex flex-col items-center">
                    <span className="text-white font-bold">{kda}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-tighter">
                        {totalKills}/{totalDeaths}/{totalAssists}
                    </span>
                </div>
            </td>
        </tr>
    );
};

export default PlayerStatistics;