import { motion } from "motion/react";
import type {Team} from "../types/Team.ts";
import type {SeriesStats} from "../types/SeriesStats.ts";
import { GlassBox } from "./GlassBox.tsx";
import { getAgentLogo } from '../utils/agentLogos';
import { capitalize } from '../utils/formatters';

type Props = {
    team: Team | null;
    roster: any[];
    allSeriesData: SeriesStats[];
};

// Helper to compute player stats
const computePlayerStats = (playerName: string, seriesData: SeriesStats[]) => {
    let totalKills = 0;
    let totalDeaths = 0;
    let totalAssists = 0;
    let gamesPlayed = 0;
    let gamesWon = 0;
    let totalDamage = 0;
    let totalRounds = 0;
    let firstKills = 0;
    let firstDeaths = 0;
    const agentCounts: Record<string, number> = {};

    seriesData.forEach(series => {
        series.seriesState.games.forEach(game => {
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

                game.segments.forEach(segment => {
                    totalRounds++;
                    const playerSegment = segment.teams
                        .flatMap(t => t.players)
                        .find(p => p.name === playerName);
                    
                    if (playerSegment) {
                        totalDamage += playerSegment.damageDealt || 0;
                    }
                });

                const agentName = playerMatch.character.name;
                agentCounts[agentName] = (agentCounts[agentName] || 0) + 1;
            }
        });
    });

    const winRate = gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0;
    const adr = totalRounds > 0 ? (totalDamage / totalRounds).toFixed(1) : "0.0";
    const fkRate = totalRounds > 0 ? ((firstKills / totalRounds) * 100).toFixed(1) : "0.0";
    const fdRate = totalRounds > 0 ? ((firstDeaths / totalRounds) * 100).toFixed(1) : "0.0";
    const kda = totalDeaths > 0 
        ? ((totalKills + totalAssists) / totalDeaths).toFixed(2) 
        : (totalKills + totalAssists).toFixed(2);

    const topAgents = Object.entries(agentCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name]) => name);

    return {
        player: playerName,
        agents: topAgents,
        matches: gamesPlayed,
        rounds: totalRounds,
        winRate: winRate.toFixed(0),
        kda,
        adr,

        fk: fkRate,
        fd: fdRate,
    };
};

const PlayerStatisticsTable = ({ team, roster, allSeriesData }: Props) => {
    if (!team) return <div className="p-4 text-blue-200/40 italic">Select a team to view player analytics</div>;

    const playerStats = roster.map(player => computePlayerStats(player.nickname, allSeriesData));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mb-6"
        >
            <h2 className="text-2xl font-bold text-white mb-4">Player Statistics</h2>
            <GlassBox>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left py-3 px-4 text-blue-200 font-semibold">Player</th>
                                <th className="text-left py-3 px-4 text-blue-200 font-semibold">Agents</th>
                                <th className="text-center py-3 px-4 text-blue-200 font-semibold">Matches</th>
                                <th className="text-center py-3 px-4 text-blue-200 font-semibold">Rounds</th>
                                <th className="text-center py-3 px-4 text-blue-200 font-semibold">Win %</th>
                                <th className="text-center py-3 px-4 text-blue-200 font-semibold">KDA</th>
                                <th className="text-center py-3 px-4 text-blue-200 font-semibold">ADR</th>

                                <th className="text-center py-3 px-4 text-blue-200 font-semibold">FK %</th>
                                <th className="text-center py-3 px-4 text-blue-200 font-semibold">FD %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {playerStats.map((player, index) => (
                                <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="py-3 px-4 text-white font-semibold">{player.player}</td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-1">
                                            {player.agents.map((agentName, i) => (
                                                getAgentLogo(agentName) ? (
                                                    <img
                                                        key={i}
                                                        src={getAgentLogo(agentName)}
                                                        alt={agentName}
                                                        title={agentName}
                                                        className="w-8 h-8 rounded border border-white/10 object-cover"
                                                    />
                                                ) : (
                                                    <span key={i} className="text-blue-100 text-sm">{capitalize(agentName)}</span>
                                                )
                                            ))}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-center text-blue-100">{player.matches}</td>
                                    <td className="py-3 px-4 text-center text-blue-100">{player.rounds}</td>
                                    <td className="py-3 px-4 text-center text-green-400 font-semibold">{player.winRate}%</td>
                                    <td className="py-3 px-4 text-center text-blue-100">{player.kda}</td>
                                    <td className="py-3 px-4 text-center text-blue-100">{player.adr}</td>

                                    <td className="py-3 px-4 text-center text-blue-100">{player.fk}%</td>
                                    <td className="py-3 px-4 text-center text-blue-100">{player.fd}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassBox>
        </motion.div>
    );
};

export default PlayerStatisticsTable;