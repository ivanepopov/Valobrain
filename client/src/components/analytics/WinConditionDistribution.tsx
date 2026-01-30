import type { Team } from "../../types/Team.ts";
import type { SeriesStats } from "../../types/SeriesStats.ts";
import { GlassBox } from "../ui/GlassBox.tsx";
import { useMemo, useState, memo } from "react";
import { motion } from "motion/react";
import { Target, Shield } from "lucide-react";

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
    team: Team;
    allSeriesData: SeriesStats[];
};

const WinConditionDistribution = memo(({ team, allSeriesData }: Props) => {
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

        allSeriesData.forEach(series => {
            series.seriesState?.games?.forEach(game => {
                game.segments?.forEach(round => {
                    const teamInRound = round.teams?.find(t => t.name === team.name);
                    const oppInRound = round.teams?.find(t => t.name !== team.name);

                    if (!teamInRound || !oppInRound) return;

                    const side = teamInRound.side; // 'attacker' or 'defender'
                    const teamWon = teamInRound.won;
                    const winner = teamWon ? teamInRound : oppInRound;
                    const loser = teamWon ? oppInRound : teamInRound;
                    
                    const objectives = winner.objectives?.map(o => o.id) || [];
                    const loserObjectives = loser.objectives?.map(o => o.id) || [];

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
    }, [team.name, allSeriesData]);

    const [visibility, setVisibility] = useState({
        attack: { wins: true, losses: true },
        defense: { wins: true, losses: true }
    });

    const toggle = (side: 'attack' | 'defense', type: 'wins' | 'losses') => {
        setVisibility(prev => ({
            ...prev,
            [side]: {
                ...prev[side],
                [type]: !prev[side][type]
            }
        }));
    };

    const renderBarGroup = (label: string, winVal: number, lossVal: number, max: number, winColor: string, lossColor: string, winShadow: string, lossShadow: string, showWins: boolean, showLosses: boolean) => {
        const winPct = max > 0 ? (winVal / max) * 100 : 0;
        const lossPct = max > 0 ? (lossVal / max) * 100 : 0;

        return (
            <div className="group space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-lg text-white font-semibold">{label}</span>
                    <div className="flex gap-4 text-xs font-bold">
                        {showWins && <span className="text-blue-300">W: {winVal}</span>}
                        {showLosses && <span className="text-rose-300">L: {lossVal}</span>}
                    </div>
                </div>
                <div className="space-y-2">
                    {/* Wins Bar */}
                    {showWins && (
                        <div className="relative h-2.5 bg-slate-900/70 rounded-lg overflow-hidden border border-white/10 group-hover:border-white/20 transition-all duration-300">
                            <div 
                                className={`h-full ${winColor} transition-all duration-700 ease-out rounded-r-lg shadow-lg ${winShadow} relative overflow-hidden hover:brightness-110 cursor-pointer`}
                                style={{ width: `${winPct}%` }}
                            >
                                
                            </div>
                        </div>
                    )}
                    {/* Losses Bar */}
                    {showLosses && (
                        <div className="relative h-2.5 bg-slate-900/70 rounded-lg overflow-hidden border border-white/10 group-hover:border-white/20 transition-all duration-300">
                            <div 
                                className={`h-full ${lossColor} transition-all duration-700 ease-out rounded-r-lg shadow-lg ${lossShadow} relative overflow-hidden hover:brightness-110 cursor-pointer`}
                                style={{ width: `${lossPct}%` }}
                            >
                                
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderSideSection = (title: string, sideData: SideStats, winColor: string, lossColor: string, winShadow: string, lossShadow: string, legendWinColor: string, legendLossColor: string, side: 'attack' | 'defense') => {
        const { wins: showWins, losses: showLosses } = visibility[side];

        const conditions = [
            { label: 'Bomb Detonation', wins: sideData.wins.bomb, losses: sideData.losses.bomb },
            { label: 'Bomb Defusal', wins: sideData.wins.defuse, losses: sideData.losses.defuse },
            { label: 'Kills (Pre-Plant)', wins: sideData.wins.killsPrePlant, losses: sideData.losses.killsPrePlant },
            { label: 'Kills (Post-Plant)', wins: sideData.wins.killsPostPlant, losses: sideData.losses.killsPostPlant },
            { label: 'Time Expired', wins: sideData.wins.timeExpired, losses: sideData.losses.timeExpired }
        ];

        const maxVal = Math.max(...conditions.map(c => Math.max(showWins ? c.wins : 0, showLosses ? c.losses : 0)), 1);

        return (
            <GlassBox className="flex-1 border-white/10">
                <div className="mb-6 pb-4 border-b border-white/10">
                    <div className="flex justify-between items-center">
                        <h3 className="text-white text-lg font-bold flex items-center gap-2">
                            {title.includes('Attack') ? <Target className="w-5 h-5 text-red-400" /> : <Shield className="w-5 h-5 text-blue-400" />}
                            {title}
                        </h3>
                        <div className="flex gap-4 bg-gradient-to-r from-slate-950/60 to-slate-900/60 p-2.5 rounded-lg border border-white/10 backdrop-blur-sm">
                            <button 
                                onClick={() => toggle(side, 'wins')}
                                className={`flex items-center gap-2 transition-all duration-300 hover:scale-105 cursor-pointer ${showWins ? 'opacity-100' : 'opacity-40'}`}
                            >
                                <div className={`w-3.5 h-3.5 rounded-md ${legendWinColor} shadow-lg ${winShadow}`} />
                                <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wide">{title.includes('Attack') ? 'Attacking' : 'Defending'} Wins</span>
                            </button>
                            <button 
                                onClick={() => toggle(side, 'losses')}
                                className={`flex items-center gap-2 transition-all duration-300 hover:scale-105 cursor-pointer ${showLosses ? 'opacity-100' : 'opacity-40'}`}
                            >
                                <div className={`w-3.5 h-3.5 rounded-md ${legendLossColor} shadow-lg ${lossShadow}`} />
                                <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wide">{title.includes('Attack') ? 'Attacking' : 'Defending'} Losses</span>
                            </button>
                        </div>
                    </div>
                </div>
                <div className="space-y-5">
                    {conditions.map((c, idx) => (
                        <div key={idx}>
                            {renderBarGroup(c.label, c.wins, c.losses, maxVal, winColor, lossColor, winShadow, lossShadow, showWins, showLosses)}
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
                {renderSideSection("Attack Win Conditions", stats.attack, "bg-red-400", "bg-red-400/20", "shadow-red-400/40", "shadow-none", "bg-red-400", "bg-red-400/30", "attack")}
                {renderSideSection("Defense Win Conditions", stats.defense, "bg-blue-400", "bg-blue-400/20", "shadow-blue-400/40", "shadow-none", "bg-blue-400", "bg-blue-400/30", "defense")}
            </div>
        </motion.div>
    );
});

export default WinConditionDistribution;