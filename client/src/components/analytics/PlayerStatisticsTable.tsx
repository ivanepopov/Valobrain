import { motion } from "motion/react";
import type {SeriesStats} from "../../types/SeriesStats.ts";
import { GlassBox } from "../ui/GlassBox.tsx";
import { getAgentLogo } from '../../utils/agentLogos';
import { capitalize } from '../../utils/formatters';
import { useMemo, memo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface PlayerRosterItem {
    id: string;
    nickname: string;
}

type Props = {
    roster: PlayerRosterItem[];
    allSeriesData: SeriesStats[];
};

// Helper to compute player stats
const computePlayerStats = (playerName: string, seriesData: SeriesStats[]) => {
    let totalKills = 0;
    let totalDeaths = 0;
    let totalAssists = 0;
    let totalDamage = 0;
    let totalRounds = 0;
    let firstKills = 0;
    const agentCounts: Record<string, number> = {};

    seriesData.forEach(series => {
        series.seriesState.games.forEach(game => {
            const playerMatch = game.teams
                .flatMap(t => t.players)
                .find(p => p.name === playerName);

        if (playerMatch) {
            totalKills += playerMatch.kills || 0;
            totalDeaths += playerMatch.deaths || 0;
            totalAssists += playerMatch.killAssistsGiven || 0;

                const agentName = playerMatch.character.name;
                agentCounts[agentName] = (agentCounts[agentName] || 0) + 1;

                game.segments.forEach(segment => {
                    totalRounds++;
                    const playerSegment = segment.teams
                        .flatMap(t => t.players)
                        .find(p => p.name === playerName);

                    if (playerSegment) {
                        totalDamage += playerSegment.damageDealt || 0;
                        if (playerSegment.firstKill) firstKills += 1;
                    }
                });
            }
        });
    });

    const adr = totalRounds > 0 ? (totalDamage / totalRounds).toFixed(1) : "0.0";
    const kd = totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : totalKills.toFixed(2);
    const kdDiff = totalKills - totalDeaths;

    const agentsPlayed = Object.entries(agentCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([name]) => name);

    return {
        player: playerName,
        agents: agentsPlayed,
        kills: totalKills,
        deaths: totalDeaths,
        assists: totalAssists,
        kdDiff: kdDiff > 0 ? `+${kdDiff}` : kdDiff.toString(),
        kd,
        adr,
        fk: firstKills,
    };
};

/**
 * Analytics Breakdown Page Sub-Feature #3: Player Statistics Tables (Overall)
 *
 * This component provides an overview of player-level statistics.
 * Overall kill/death/assist rates, average damage per round, first kill count, and agent usage.
 *
 * @param roster List of players in the team, including their nickname and agent
 * @param allSeriesData All (or filtered) series data to display
 */
const PlayerStatisticsTable = memo(({ roster, allSeriesData }: Props) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const playerStats = useMemo(() => {
        return roster
            .map(player => computePlayerStats(player.nickname, allSeriesData))
            .sort((a, b) => b.kills - a.kills);
    }, [roster, allSeriesData]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-6"
        >
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white drop-shadow-md">Player Statistics</h2>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="text-white/70 hover:text-white transition-colors"
                >
                    {isCollapsed ? <ChevronDown className="w-6 h-6" /> : <ChevronUp className="w-6 h-6" />}
                </button>
            </div>

            {!isCollapsed && (
                <GlassBox className="mt-4 p-0! overflow-hidden border-white/5">
                    <div className="overflow-x-auto">
                        <table className="w-full text-base">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left py-3 px-4 font-semibold" style={{ color: '#fffffe' }}>Player</th>
                                <th className="text-left py-3 px-4 font-semibold" style={{ color: '#fffffe' }}>Agents</th>
                                <th className="text-center py-3 px-4 font-semibold" style={{ color: '#fffffe' }}>K</th>
                                <th className="text-center py-3 px-4 font-semibold" style={{ color: '#fffffe' }}>D</th>
                                <th className="text-center py-3 px-4 font-semibold" style={{ color: '#fffffe' }}>A</th>
                                <th className="text-center py-3 px-4 font-semibold" style={{ color: '#fffffe' }}>+/-</th>
                                <th className="text-center py-3 px-4 font-semibold" style={{ color: '#fffffe' }}>KD</th>
                                <th className="text-center py-3 px-4 font-semibold" style={{ color: '#fffffe' }}>ADR</th>
                                <th className="text-center py-3 px-4 font-semibold" style={{ color: '#fffffe' }}>FK</th>
                            </tr>
                        </thead>
                        <tbody>
                            {playerStats.map((player, index) => (
                                <tr
                                    key={index}
                                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                >
                                    <td className="py-3 px-4 text-white font-semibold whitespace-nowrap">{player.player}</td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-1">
                                            {player.agents.map((agent, i) => (
                                                <img
                                                    key={i}
                                                    src={getAgentLogo(agent)}
                                                    alt={agent}
                                                    className="w-8 h-8 rounded border border-white/10 object-cover"
                                                    title={capitalize(agent)}
                                                />
                                            ))}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-center" style={{ color: '#fffffe' }}>{player.kills}</td>
                                    <td className="py-3 px-4 text-center" style={{ color: '#fffffe' }}>{player.deaths}</td>
                                    <td className="py-3 px-4 text-center" style={{ color: '#fffffe' }}>{player.assists}</td>
                                    <td className={`py-3 px-4 text-center font-mono font-bold ${Number(player.kdDiff) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {player.kdDiff}
                                    </td>
                                    <td className="py-3 px-4 text-center" style={{ color: '#fffffe' }}>{player.kd}</td>
                                    <td className="py-3 px-4 text-center" style={{ color: '#fffffe' }}>{player.adr}</td>
                                    <td className="py-3 px-4 text-center" style={{ color: '#fffffe' }}>{player.fk}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassBox>
            )}
        </motion.div>
    );
});

export default PlayerStatisticsTable;