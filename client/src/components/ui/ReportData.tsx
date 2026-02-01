import {motion} from "motion/react";
import {Brain, Crosshair, DollarSign, MessageSquare, Shield, Target, Users} from "lucide-react";
import GlassBox from "./GlassBox.tsx";
import type {ReportSections, TransformedSeries} from "../../types/AIInsight.ts";

type Props = {
    reportData: ReportSections;
    selectedSeries: TransformedSeries;
}

const ReportData = ({ reportData, selectedSeries }: Props) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Executive Summary - Full Width */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="lg:col-span-3"
                >
                    <GlassBox>
                        <div className="flex items-center gap-3 mb-4">
                            <Brain className="w-6 h-6 text-blue-400" />
                            <h2 className="text-2xl font-bold text-white">Executive Summary</h2>
                            <span className="text-sm text-blue-300 bg-blue-400/10 px-3 py-1 rounded-full">
                      vs {selectedSeries.opponent} • {selectedSeries.date}
                    </span>
                        </div>
                        <p className="text-blue-100 leading-relaxed whitespace-pre-wrap">
                            {reportData.executiveSummary || 'No executive summary available.'}
                        </p>
                    </GlassBox>
                </motion.div>

                {/* 2. Attack Protocols - 2 Columns */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="lg:col-span-2"
                >
                    <GlassBox className="h-full">
                        <div className="flex items-center gap-3 mb-4">
                            <Crosshair className="w-6 h-6 text-red-400" />
                            <h2 className="text-2xl font-bold text-white">Attack Protocols</h2>
                        </div>
                        <div className="space-y-4">
                            {reportData.attackProtocols.defaultPhase && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-2">Default Phase</h3>
                                    <p className="text-blue-100">{reportData.attackProtocols.defaultPhase}</p>
                                </div>
                            )}
                            {reportData.attackProtocols.executePhase && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-2">Execute Phase</h3>
                                    <p className="text-blue-100">{reportData.attackProtocols.executePhase}</p>
                                </div>
                            )}
                            {reportData.attackProtocols.tendencies.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-2">Key Tendencies</h3>
                                    <ul className="space-y-2">
                                        {reportData.attackProtocols.tendencies.map((tendency, i) => (
                                            <li key={i} className="flex items-start gap-3">
                                                <div className="mt-1 w-2 h-2 rounded-full bg-red-400 shrink-0" />
                                                <p className="text-blue-100">{tendency}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </GlassBox>
                </motion.div>

                {/* 3. Defense Setups - 1 Column */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="lg:col-span-1"
                >
                    <GlassBox className="h-full">
                        <div className="flex items-center gap-3 mb-4">
                            <Shield className="w-6 h-6 text-blue-400" />
                            <h2 className="text-2xl font-bold text-white">Defense Setups</h2>
                        </div>
                        <div className="space-y-4">
                            {reportData.defenseSetups.standardSetups && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-2">Standard Setups</h3>
                                    <p className="text-blue-100 text-sm">{reportData.defenseSetups.standardSetups}</p>
                                </div>
                            )}
                            {reportData.defenseSetups.aggressivePlays && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-2">Aggressive Plays</h3>
                                    <p className="text-blue-100 text-sm">{reportData.defenseSetups.aggressivePlays}</p>
                                </div>
                            )}
                            {reportData.defenseSetups.tendencies.length > 0 && (
                                <ul className="space-y-2 mt-3">
                                    {reportData.defenseSetups.tendencies.slice(0, 4).map((tendency, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <div className="mt-1 w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                                            <p className="text-blue-100 text-sm">{tendency}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </GlassBox>
                </motion.div>

                {/* 4. Pistol & Economy - 1 Column */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="lg:col-span-1"
                >
                    <GlassBox className="h-full">
                        <div className="flex items-center gap-3 mb-4">
                            <DollarSign className="w-6 h-6 text-green-400" />
                            <h2 className="text-2xl font-bold text-white">Pistol & Economy</h2>
                        </div>
                        <p className="text-blue-100 whitespace-pre-wrap">
                            {reportData.pistolEconomy || 'No economy analysis available.'}
                        </p>
                    </GlassBox>
                </motion.div>

                {/* 5. Player Intel - 2 Columns */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="lg:col-span-2"
                >
                    <GlassBox className="h-full">
                        <div className="flex items-center gap-3 mb-4">
                            <Users className="w-6 h-6 text-purple-400" />
                            <h2 className="text-2xl font-bold text-white">Player Intel</h2>
                        </div>
                        {reportData.playerIntel.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-2 px-3 text-blue-200 font-semibold">Player</th>
                                        <th className="text-left py-2 px-3 text-blue-200 font-semibold">Agent</th>
                                        <th className="text-left py-2 px-3 text-blue-200 font-semibold">Key Habit / Weakness</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {reportData.playerIntel.map((player, i) => {
                                        const agentName = player.agent.trim();
                                        const agentImage = `/src/assets/agents/${agentName}.png`;

                                        return (
                                            <tr key={i} className="border-b border-white/5">
                                                <td className="py-2 px-3 text-white font-semibold">{player.player}</td>
                                                <td className="py-2 px-3">
                                                    <img
                                                        src={agentImage}
                                                        alt={agentName}
                                                        className="w-6 h-6 rounded"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                </td>
                                                <td className="py-2 px-3 text-blue-100">{player.insight}</td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-blue-200">No player intel available.</p>
                        )}
                    </GlassBox>
                </motion.div>

                {/* 6. Counter-Strat Playbook - Full Width */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="lg:col-span-3"
                >
                    <GlassBox>
                        <div className="flex items-center gap-3 mb-4">
                            <Target className="w-6 h-6 text-orange-400" />
                            <h2 className="text-2xl font-bold text-white">Counter-Strat Playbook</h2>
                        </div>
                        {reportData.counterStrats.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {reportData.counterStrats.map((strat, i) => (
                                    <div
                                        key={i}
                                        className="p-4 rounded-lg bg-orange-400/10 border border-orange-400/20"
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">
                              Priority {strat.priority}
                            </span>
                                            <span className="text-white font-semibold">{strat.name}</span>
                                        </div>
                                        <p className="text-blue-100 text-sm">{strat.advice}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-blue-200">No counter-strategies available.</p>
                        )}
                    </GlassBox>
                </motion.div>

                {/* 7. Coach's Final Note - Full Width */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                    className="lg:col-span-3"
                >
                    <GlassBox>
                        <div className="flex items-center gap-3 mb-4">
                            <MessageSquare className="w-6 h-6 text-cyan-400" />
                            <h2 className="text-2xl font-bold text-white">Coach's Final Note</h2>
                        </div>
                        <p className="text-blue-100 leading-relaxed whitespace-pre-wrap">
                            {reportData.coachNote || 'No coach notes available.'}
                        </p>
                    </GlassBox>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default ReportData;