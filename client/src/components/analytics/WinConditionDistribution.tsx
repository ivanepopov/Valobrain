import type { Team } from "../../types/Team.ts";
import type { SeriesStats } from "../../types/SeriesStats.ts";
import { GlassBox } from "../ui/GlassBox.tsx";
import { useMemo } from "react";

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
            <div className="group space-y-1.5">
                <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                    <div className="flex gap-3 text-[10px] font-mono font-bold">
                        <span className="text-blue-400">W: {winVal}</span>
                        <span className="text-rose-400">L: {lossVal}</span>
                    </div>
                </div>
                <div className="space-y-1">
                    {/* Wins Bar */}
                    <div className="relative h-2 bg-slate-900/50 rounded-sm overflow-hidden border border-white/5">
                        <div 
                            className="h-full bg-linear-to-r from-blue-600 to-blue-400 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(59,130,246,0.2)]"
                            style={{ width: `${winPct}%` }}
                        />
                    </div>
                    {/* Losses Bar */}
                    <div className="relative h-2 bg-slate-900/50 rounded-sm overflow-hidden border border-white/5">
                        <div 
                            className="h-full bg-linear-to-r from-rose-900 to-rose-600 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(225,29,72,0.2)]"
                            style={{ width: `${lossPct}%` }}
                        />
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
            <GlassBox className="flex-1">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-white text-sm font-black uppercase italic tracking-tighter">{title}</h3>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">Team Performance Breakdown</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Rounds Won</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-rose-500/50" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Rounds Lost</span>
                        </div>
                    </div>
                </div>
                <div className="space-y-6">
                    {conditions.filter(c => c.wins > 0 || c.losses > 0).map((c, idx) => (
                        <div key={idx}>
                            {renderBarGroup(c.label, c.wins, c.losses, maxVal)}
                        </div>
                    ))}
                </div>
            </GlassBox>
        );
    };

    return (
        <div className="mt-8">
            <div className="flex flex-col gap-6 lg:flex-row">
                {renderSideSection("Attack Win Conditions", stats.attack)}
                {renderSideSection("Defense Win Conditions", stats.defense)}
            </div>
        </div>
    );
};

export default WinConditionDistribution;