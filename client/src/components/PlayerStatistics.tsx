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
    let totalDamage = 0;
    let totalRounds = 0;
    let firstKills = 0;
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

                // Process rounds for ADR and FK%
                game.segments.forEach(segment => {
                    totalRounds++;
                    const playerSegment = segment.teams
                        .flatMap(t => t.players)
                        .find(p => p.name === playerName);
                    
                    if (playerSegment) {
                        totalDamage += playerSegment.damageDealt || 0;
                    }

                    // Check for first kill in the round
                    const teamWithFK = segment.teams.find(t => 
                        t.objectives?.some(obj => obj.id === 'firstKill')
                    );
                    
                    // If your data structure links the specific player to the 'firstKill' objective
                    const playerGotFK = teamWithFK?.players?.some(p => p.name === playerName && (p as any).firstKill);
                    if (playerGotFK) firstKills++;
                });

                const agentName = playerMatch.character.name;
                agentCounts[agentName] = (agentCounts[agentName] || 0) + 1;
            }
        });
    });

    const winRate = gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0;
    const adr = totalRounds > 0 ? (totalDamage / totalRounds).toFixed(1) : "0.0";
    const fkRate = totalRounds > 0 ? ((firstKills / totalRounds) * 100).toFixed(3) : "0.000";
    const kda = totalDeaths > 0 
        ? ((totalKills + totalAssists) / totalDeaths).toFixed(2) 
        : (totalKills + totalAssists).toFixed(2);

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
            <td className="px-4 py-4 text-center font-mono text-amber-500 font-bold">
                {adr}
            </td>
            <td className="px-4 py-4 text-center font-mono text-blue-400">
                {fkRate}%
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