import { motion } from "motion/react";
import type {Team} from "../../types/Team.ts";
import type {SeriesStats} from "../../types/SeriesStats.ts";
import { GlassBox } from "../ui/GlassBox.tsx";
import { getAgentLogo } from '../../utils/agentLogos';
import { capitalize } from '../../utils/formatters';
import { useMemo, memo } from "react";

interface PlayerRosterItem {
    id: string;
    nickname: string;
}

type Props = {
    team: Team;
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
        series.seriesState?.games?.forEach(game => {
            const playerMatch = game.teams
                ?.flatMap(t => t.players || [])
                .find(p => p.name === playerName);

            if (playerMatch) {
                totalKills += playerMatch.kills || 0;
                totalDeaths += playerMatch.deaths || 0;
                totalAssists += playerMatch.killAssistsGiven || 0;

                const agentName = playerMatch.character?.name;
                if (agentName) {
                    agentCounts[agentName] = (agentCounts[agentName] || 0) + 1;
                }

                game.segments?.forEach(segment => {
                    totalRounds++;
                    const playerSegment = segment.teams
                        ?.flatMap(t => t.players || [])
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

const PlayerStatisticsTable = memo(({ team, roster, allSeriesData }: Props) => {
    const playerStats = useMemo(() => {
        return roster
            .map(player => computePlayerStats(player.nickname, allSeriesData))
            .sort((a, b) => {
                const aKd = parseFloat(a.kd);
                const bKd = parseFloat(b.kd);
                if (bKd !== aKd) return bKd - aKd;
                return b.kills - a.kills;
            });
    }, [team, roster, allSeriesData]);

    return (
        <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mb-6"
            >
                <h2 className="text-2xl font-bold text-white drop-shadow-md mb-6">Player Statistics</h2>
                <GlassBox className="mt-4 !p-0 overflow-hidden border-white/5">
                    <div className="overflow-x-auto">
                        <table className="w-full text-lg">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left py-3 px-4 text-blue-200 font-semibold">Player</th>
                                    <th className="text-left py-3 px-4 text-blue-200 font-semibold">Agents</th>
                                    <th className="text-center py-3 px-4 text-blue-200 font-semibold">K</th>
                                    <th className="text-center py-3 px-4 text-blue-200 font-semibold">D</th>
                                    <th className="text-center py-3 px-4 text-blue-200 font-semibold">A</th>
                                    <th className="text-center py-3 px-4 text-blue-200 font-semibold">+/-</th>
                                    <th className="text-center py-3 px-4 text-blue-200 font-semibold">KD</th>
                                    <th className="text-center py-3 px-4 text-blue-200 font-semibold">ADR</th>
                                    <th className="text-center py-3 px-4 text-blue-200 font-semibold">FK</th>
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
                                        <td className="py-3 px-4 text-center text-blue-100">{player.kills}</td>
                                        <td className="py-3 px-4 text-center text-blue-100">{player.deaths}</td>
                                        <td className="py-3 px-4 text-center text-blue-100">{player.assists}</td>
                                        <td className={`py-3 px-4 text-center font-mono font-bold ${Number(player.kdDiff) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {player.kdDiff}
                                        </td>
                                        <td className="py-3 px-4 text-center text-blue-100">{player.kd}</td>
                                        <td className="py-3 px-4 text-center text-blue-100">{player.adr}</td>
                                        <td className="py-3 px-4 text-center text-blue-100">{player.fk}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </GlassBox>
            </motion.div>
        );
});

export default PlayerStatisticsTable;