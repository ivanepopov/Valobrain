    import { useMemo, memo } from "react";
import type { SeriesStats } from "../../types/SeriesStats.ts";
import type { Team } from "../../types/Team.ts";
import { GlassBox } from "../ui/GlassBox.tsx";
import { Trophy, Target, Shield } from "lucide-react";
import { motion } from "motion/react";

type Props = {
    team: Team;
    allSeriesData: SeriesStats[];
}

const TeamLevelStatsOverview = memo(({ team, allSeriesData }: Props) => {
    const stats = useMemo(() => {
        let totalMatches = 0;
        let matchesWon = 0;
        
        let totalAttackRounds = 0;
        let attackRoundsWon = 0;
        
        let totalDefenseRounds = 0;
        let defenseRoundsWon = 0;

        allSeriesData.forEach(series => {
            series.seriesState?.games?.forEach(game => {
                const teamMatch = game.teams?.find(t => t.name === team.name);
                if (!teamMatch) return;

                // 1. Match Win Rate
                totalMatches++;
                if (teamMatch.won) matchesWon++;

                // 2. Round Win Rates (Segments represent rounds in Valorant)
                game.segments?.forEach(segment => {
                    const teamSegment = segment.teams?.find(t => t.name === team.name);
                    if (!teamSegment) return;

                    const side = teamSegment.side?.toLowerCase();
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

    if (!stats) return null;

    const { matchWinRate, attackWinRate, defenseWinRate } = stats;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-6"
        >
            <h2 className="text-2xl font-bold text-white mb-4">Overall Team Statistics</h2>
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
        </motion.div>
    );
});

export default TeamLevelStatsOverview;