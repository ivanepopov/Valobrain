import React from "react";
import { getAgentLogo } from "../../utils/agentLogos.ts";
import { capitalize } from "../../utils/formatters.ts";

const StatsTable: React.FC<{
    teamName: string;
    isWinner: boolean;
    players: Array<{
        name: string;
        character: { name: string };
        kills: number;
        deaths: number;
        killAssistsGiven: number;
        adr?: string;
        fk?: number;
    }>;
    isMultipleAgents?: boolean;
}> = ({ teamName, isWinner, players, isMultipleAgents = false }) => (
    <div className="relative">
        <h3 className={`text-[14px] font-black uppercase tracking-[0.3em] mb-3 flex items-center gap-3 ${isWinner ? 'text-emerald-400' : 'text-rose-400'}`}>
            <span className={`w-1 h-3 rounded-full ${isWinner ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
            {teamName}
        </h3>

        <div className="backdrop-blur-sm bg-white/5 rounded-xl overflow-hidden border border-white/5">
            <table className="w-full text-lg">
                <thead>
                    <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-blue-200 font-semibold w-[20%]">Player</th>
                        <th className="text-left py-3 px-4 text-blue-200 font-semibold w-[15%]">Agents</th>
                        <th className="text-center py-3 px-4 text-blue-200 font-semibold w-[8%]">K</th>
                        <th className="text-center py-3 px-4 text-blue-200 font-semibold w-[8%]">D</th>
                        <th className="text-center py-3 px-4 text-blue-200 font-semibold w-[8%]">A</th>
                        <th className="text-center py-3 px-4 text-blue-200 font-semibold w-[10%]">+/-</th>
                        <th className="text-center py-3 px-4 text-blue-200 font-semibold w-[10%]">KD</th>
                        <th className="text-center py-3 px-4 text-blue-200 font-semibold w-[10%]">ADR</th>
                        <th className="text-center py-3 px-4 text-blue-200 font-semibold w-[11%]">FK</th>
                    </tr>
                </thead>
                <tbody>
                    {players.map((player, pIndex) => {
                        const kdDiff = player.kills - player.deaths;
                        const kd = player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills.toFixed(2);
                        const agents = isMultipleAgents ? player.character.name.split(', ') : [player.character.name];
                        
                        return (
                            <tr 
                                key={pIndex} 
                                className="border-b border-white/5 hover:bg-white/5 transition-colors"
                            >
                                <td className="py-3 px-4 text-white font-semibold truncate">{player.name}</td>
                                <td className="py-3 px-4">
                                    <div className="flex items-center gap-1">
                                        {agents.map((agentName, i) => (
                                            getAgentLogo(agentName) ? (
                                                <img 
                                                    key={i}
                                                    src={getAgentLogo(agentName)} 
                                                    alt={agentName}
                                                    title={capitalize(agentName)}
                                                    className="w-8 h-8 rounded border border-white/10 object-cover"
                                                />
                                            ) : (
                                                <span key={i} className="text-blue-100 text-sm">
                                                    {agentName}
                                                </span>
                                            )
                                        ))}
                                    </div>
                                </td>
                                <td className="py-3 px-4 text-center text-blue-100">{player.kills}</td>
                                <td className="py-3 px-4 text-center text-blue-100">{player.deaths}</td>
                                <td className="py-3 px-4 text-center text-blue-100">{player.killAssistsGiven}</td>
                                <td className={`py-3 px-4 text-center font-mono font-bold ${kdDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {kdDiff > 0 ? `+${kdDiff}` : kdDiff}
                                </td>
                                <td className="py-3 px-4 text-center text-blue-100">{kd}</td>
                                <td className="py-3 px-4 text-center text-blue-100">{player.adr || "0"}</td>
                                <td className="py-3 px-4 text-center text-blue-100">{player.fk || 0}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </div>
);

export default StatsTable;