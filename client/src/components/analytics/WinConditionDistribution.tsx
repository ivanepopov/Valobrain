import type { Team } from "../../types/Team.ts";
import type { SeriesStats } from "../../types/SeriesStats.ts";
import { GlassBox } from "../ui/GlassBox.tsx";
import { useMemo } from "react";
import { motion } from "motion/react";

type WinTypes = {
    bomb: number;
    killsPrePlant: number;
    killsPostPlant: number;
    defuse: number;
    timeExpired: number;
};

type SideStats = {
    wins: WinTypes;
    losses: WinTypes;
};

type Props = {
    team: Team | null;
    allSeriesData: SeriesStats[];
};

const WinConditionDistribution = ({ team, allSeriesData }: Props) => {
    const stats = useMemo(() => {
        const initial = () => ({
            bomb: 0,
            killsPrePlant: 0,
            killsPostPlant: 0,
            defuse: 0,
            timeExpired: 0
        });

        const data = {
            attack: { wins: initial(), losses: initial() },
            defense: { wins: initial(), losses: initial() }
        };

        if (!team) return data;

        allSeriesData.forEach(series => {
            series.seriesState.games.forEach(game => {
                game.segments.forEach(round => {
                    const teamInRound = round.teams.find(t => t.name === team.name);
                    const oppInRound = round.teams.find(t => t.name !== team.name);

                    if (!teamInRound || !oppInRound) return;

                    const side = teamInRound.side; // 'attacker' or 'defender'
                    const teamWon = teamInRound.won;
                    const winner = teamWon ? teamInRound : oppInRound;
                    const loser = teamWon ? oppInRound : teamInRound;
                    
                    const objectives = winner.objectives.map(o => o.id);
                    const loserObjectives = loser.objectives.map(o => o.id);

                    const isPlant = objectives.includes('plantBomb') || loserObjectives.includes('plantBomb');
                    const isExplode = objectives.includes('explodeBomb');
                    const isDefuse = objectives.includes('defuseBomb');

                    if (side === 'attacker') {
                        const target = data.attack;
                        if (teamWon) {
                            if (isExplode) target.wins.bomb++;
                            else if (!isPlant) target.wins.killsPrePlant++;
                            else target.wins.killsPostPlant++;
                        } else {
                            if (isDefuse) target.losses.defuse++;
                            else if (!isPlant && objectives.length === 0 && loserObjectives.length === 0) {
                                target.losses.timeExpired++;
                            } else if (!isPlant) {
                                target.losses.killsPrePlant++;
                            } else {
                                target.losses.killsPostPlant++;
                            }
                        }
                    } else {
                        const target = data.defense;
                        if (teamWon) {
                            if (isDefuse) target.wins.defuse++;
                            else if (!isPlant && objectives.length === 0 && loserObjectives.length === 0) {
                                target.wins.timeExpired++;
                            } else if (!isPlant) {
                                target.wins.killsPrePlant++;
                            } else {
                                target.wins.killsPostPlant++;
                            }
                        } else {
                            if (isExplode) target.losses.bomb++;
                            else if (!isPlant) target.losses.killsPrePlant++;
                            else target.losses.killsPostPlant++;
                        }
                    }
                });
            });
        });

        return data;
    }, [team, allSeriesData]);

    if (!team) return null;

    const renderBarGroup = (label: string, winVal: number, lossVal: number, max: number) => {
        const winPct = max > 0 ? (winVal / max) * 100 : 0;
        const lossPct = max > 0 ? (lossVal / max) * 100 : 0;

        return (
            <div className="group space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-white font-semibold">{label}</span>
                    <div className="flex gap-4 text-xs font-bold">
                        <span className="text-blue-300">W: {winVal}</span>
                        <span className="text-rose-300">L: {lossVal}</span>
                    </div>
                </div>
                <div className="space-y-2">
                    {/* Wins Bar */}
                    <div className="relative h-2.5 bg-slate-900/70 rounded-lg overflow-hidden border border-white/10 group-hover:border-white/20 transition-all duration-300">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 via-blue-500 to-blue-600 transition-all duration-700 ease-out rounded-r-lg shadow-lg shadow-blue-500/40 relative overflow-hidden"
                            style={{ width: `${winPct}%` }}
                        >
                            {/* Shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                        </div>
                    </div>
                    {/* Losses Bar */}
                    <div className="relative h-2.5 bg-slate-900/70 rounded-lg overflow-hidden border border-white/10 group-hover:border-white/20 transition-all duration-300">
                        <div 
                            className="h-full bg-gradient-to-r from-rose-500 via-rose-500 to-rose-600 transition-all duration-700 ease-out rounded-r-lg shadow-lg shadow-rose-500/40 relative overflow-hidden"
                            style={{ width: `${lossPct}%` }}
                        >
                            {/* Shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderSideSection = (title: string, sideData: SideStats) => {

        const conditions = [
            { label: 'Bomb Detonation', wins: sideData.wins.bomb, losses: sideData.losses.bomb },
            { label: 'Bomb Defusal', wins: sideData.wins.defuse, losses: sideData.losses.defuse },
            { label: 'Kills (Pre-Plant)', wins: sideData.wins.killsPrePlant, losses: sideData.losses.killsPrePlant },
            { label: 'Kills (Post-Plant)', wins: sideData.wins.killsPostPlant, losses: sideData.losses.killsPostPlant },
            { label: 'Time Expired', wins: sideData.wins.timeExpired, losses: sideData.losses.timeExpired }
        ];

        const maxVal = Math.max(...conditions.map(c => Math.max(c.wins, c.losses)), 1);

        return (
            <GlassBox className="flex-1 border-white/10">
                <div className="mb-6 pb-4 border-b border-white/10">
                    <div className="flex justify-between items-center">
                        <h3 className="text-white text-lg font-bold">{title}</h3>
                        <div className="flex gap-4 bg-gradient-to-r from-slate-950/60 to-slate-900/60 p-2.5 rounded-lg border border-white/10 backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30" />
                                <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wide">Rounds Won</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-md bg-gradient-to-br from-rose-500 to-rose-600 shadow-lg shadow-rose-500/30" />
                                <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wide">Rounds Lost</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="space-y-5">
                    {conditions.map((c, idx) => (
                        <div key={idx}>
                            {renderBarGroup(c.label, c.wins, c.losses, maxVal)}
                        </div>
                    ))}
                </div>
            </GlassBox>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mb-6"
        >
            <h2 className="text-2xl font-bold text-white mb-4">Win Condition Distribution</h2>
            <div className="flex flex-col gap-6 lg:flex-row">
                {renderSideSection("Attack Win Conditions", stats.attack)}
                {renderSideSection("Defense Win Conditions", stats.defense)}
            </div>
        </motion.div>
    );
};

export default WinConditionDistribution;