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
        <h3 className={`text-[11px] font-black uppercase tracking-[0.3em] mb-3 flex items-center gap-3 ${isWinner ? 'text-emerald-400' : 'text-rose-400'}`}>
            <span className={`w-1 h-3 rounded-full ${isWinner ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
            {teamName}
        </h3>

        <div className="backdrop-blur-sm bg-white/5 rounded-xl overflow-hidden border border-white/5">
            <table className="w-full text-left border-collapse table-fixed text-[13px]">
                <thead>
                    <tr className="bg-white/5 text-blue-200/50 uppercase text-[10px] font-bold tracking-tighter">
                        <th className="py-2 px-4 w-[20%]">Player</th>
                        <th className="py-2 px-2 w-[15%]">Agents</th>
                        <th className="py-2 px-1 text-center w-[8%]">K</th>
                        <th className="py-2 px-1 text-center w-[8%]">D</th>
                        <th className="py-2 px-1 text-center w-[8%]">A</th>
                        <th className="py-2 px-1 text-center w-[10%]">+/-</th>
                        <th className="py-2 px-1 text-center w-[10%]">KD</th>
                        <th className="py-2 px-1 text-center w-[10%]">ADR</th>
                        <th className="py-2 px-4 text-center w-[11%]">FK</th>
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
                                className={`
                                    border-b border-white/5 transition-colors
                                    ${pIndex % 2 === 0 
                                        ? 'bg-linear-to-r from-transparent via-blue-500/5 to-transparent' 
                                        : 'bg-linear-to-r from-transparent via-purple-500/5 to-transparent'}
                                    hover:via-white/10
                                `}
                            >
                                <td className="py-2 px-4 text-white font-bold truncate">{player.name}</td>
                                <td className="py-2 px-2">
                                    <div className="flex -space-x-1.5 items-center">
                                        {agents.map((agentName, i) => (
                                            getAgentLogo(agentName) ? (
                                                <img 
                                                    key={i}
                                                    src={getAgentLogo(agentName)} 
                                                    alt={agentName}
                                                    title={capitalize(agentName)}
                                                    className="w-5 h-5 rounded-full border border-white/20 object-cover bg-slate-900 shadow-sm"
                                                />
                                            ) : (
                                                <span key={i} className="text-[10px] text-blue-100/60 uppercase font-bold px-1">
                                                    {agentName.slice(0, 3)}
                                                </span>
                                            )
                                        ))}
                                    </div>
                                </td>
                                <td className="py-2 px-1 text-center text-blue-100/80">{player.kills}</td>
                                <td className="py-2 px-1 text-center text-blue-100/80">{player.deaths}</td>
                                <td className="py-2 px-1 text-center text-blue-100/80">{player.killAssistsGiven}</td>
                                <td className={`py-2 px-1 text-center font-mono font-bold ${kdDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {kdDiff > 0 ? `+${kdDiff}` : kdDiff}
                                </td>
                                <td className="py-2 px-1 text-center text-white font-medium">{kd}</td>
                                <td className="py-2 px-1 text-center text-blue-100/80">{player.adr || "0"}</td>
                                <td className="py-2 px-4 text-center text-orange-400 font-bold">{player.fk || 0}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </div>
);

export default StatsTable;