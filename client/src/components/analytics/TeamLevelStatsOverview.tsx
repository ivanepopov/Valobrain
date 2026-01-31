import { useMemo, memo, useState } from "react";
import type { SeriesStats } from "../../types/SeriesStats.ts";
import type { Team } from "../../types/Team.ts";
import { GlassBox } from "../ui/GlassBox.tsx";
import { Trophy, Target, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "motion/react";

type Props = {
    team: Team;
    allSeriesData: SeriesStats[];
}

/**
 * Analytics Breakdown Page Sub-Feature #1: Team-Level Statistics Overview
 *
 * This component provides an overview of team-level statistics.
 * Overall match win rate, attack round win rates, and defense round win rates.
 *
 * @param team Team to display stats for
 * @param allSeriesData All (or filtered) series data to display
 */
const TeamLevelStatsOverview = memo(({ team, allSeriesData }: Props) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const stats = useMemo(() => {
        let totalMatches = 0;
        let matchesWon = 0;

        let totalAttackRounds = 0;
        let attackRoundsWon = 0;

        let totalDefenseRounds = 0;
        let defenseRoundsWon = 0;

        allSeriesData.forEach(series => {
            series.seriesState.games.forEach(game => {
                const teamMatch = game.teams.find(t => t.name === team.name);
                if (!teamMatch) return;

                // Step 1. Match Win Rate
                totalMatches++;
                if (teamMatch.won) matchesWon++;

                // Step 2. Round Win Rates
                game.segments.forEach(segment => {
                    const teamSegment = segment.teams.find(t => t.name === team.name);
                    if (!teamSegment) return;

                    const side = teamSegment.side.toLowerCase();
                    if (side === 'attacker') {
                        totalAttackRounds++;
                        if (teamSegment.won) attackRoundsWon++;
                    } else if (side === 'defender') {
                        totalDefenseRounds++;
                        if (teamSegment.won) defenseRoundsWon++;
                    }
                });
            });
        });

        const matchWinRate = totalMatches > 0 ? (matchesWon / totalMatches) * 100 : 0;
        const attackWinRate = totalAttackRounds > 0 ? (attackRoundsWon / totalAttackRounds) * 100 : 0;
        const defenseWinRate = totalDefenseRounds > 0 ? (defenseRoundsWon / totalDefenseRounds) * 100 : 0;

        return {
            matchWinRate,
            attackWinRate,
            defenseWinRate
        };
    }, [allSeriesData, team.name]);

    if (!stats) return;
    const { matchWinRate, attackWinRate, defenseWinRate } = stats;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-6"
        >
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Overall Team Statistics</h2>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="text-white/70 hover:text-white transition-colors"
                >
                    {isCollapsed ? <ChevronDown className="w-6 h-6" /> : <ChevronUp className="w-6 h-6" />}
                </button>
            </div>

            {!isCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 justify-center">
                    <GlassBox>
                        <div className="flex items-center gap-3 mb-2">
                            <Trophy className="w-5 h-5 text-green-400" />
                            <p className="text-blue-200 text-sm">Overall Match Win Rate</p>
                        </div>
                        <p className="text-3xl font-bold text-white">{matchWinRate.toFixed(1)}%</p>
                        <div className="mt-2 w-full bg-white/10 rounded-full h-2">
                            <div className="bg-green-400 h-2 rounded-full" style={{ width: `${matchWinRate}%` }}></div>
                        </div>
                    </GlassBox>

                    <GlassBox>
                        <div className="flex items-center gap-3 mb-2">
                            <Target className="w-5 h-5 text-red-400" />
                            <p className="text-blue-200 text-sm">Attack Round Win Rate</p>
                        </div>
                        <p className="text-3xl font-bold text-white">{attackWinRate.toFixed(1)}%</p>
                        <div className="mt-2 w-full bg-white/10 rounded-full h-2">
                            <div className="bg-red-400 h-2 rounded-full" style={{ width: `${attackWinRate}%` }}></div>
                        </div>
                    </GlassBox>

                    <GlassBox>
                        <div className="flex items-center gap-3 mb-2">
                            <Shield className="w-5 h-5 text-blue-400" />
                            <p className="text-blue-200 text-sm">Defense Round Win Rate</p>
                        </div>
                        <p className="text-3xl font-bold text-white">{defenseWinRate.toFixed(1)}%</p>
                        <div className="mt-2 w-full bg-white/10 rounded-full h-2">
                            <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${defenseWinRate}%` }}></div>
                        </div>
                    </GlassBox>
                </div>
            )}
        </motion.div>
    );
});

export default TeamLevelStatsOverview;