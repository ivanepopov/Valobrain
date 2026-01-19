import React from 'react';
import type { MatchStats } from '../types/MatchStats';
import type {Team} from "../types/Team.ts";
import { getAgentLogo } from '../utils/agentLogos';

interface MatchProps {
    match: MatchStats;
    team: Team | null;
}

const Match: React.FC<MatchProps> = ({ match }) => {
    return (
        <div className="flex flex-col gap-8">
            {/* Teams Stacked as Rows */}
            <div className="flex flex-col gap-10">
                {match.teams.map((team, teamIndex) => (
                    <div key={teamIndex} className="relative">
                        <h3 className={`text-sm font-black uppercase tracking-[0.3em] mb-4 flex items-center gap-3 ${team.won ? 'text-green-500' : 'text-red-500'}`}>
                            <span className={`w-1 h-4 rounded-full ${team.won ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            {team.name}
                        </h3>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 border-b border-gray-900">
                                        <th className="pb-2 pl-1">Player</th>
                                        <th className="pb-2">Agent</th>
                                        <th className="pb-2 text-center">K</th>
                                        <th className="pb-2 text-center">D</th>
                                        <th className="pb-2 text-center">A</th>
                                        <th className="pb-2 text-center">+/-</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-900/50">
                                    {team.players.map((player, pIndex) => (
                                        <tr key={pIndex} className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="py-2 pl-1 text-sm font-bold text-gray-300">{player.name}</td>
                                            <td className="py-2">
                                                {getAgentLogo(player.character.name) ? (
                                                    <img 
                                                        src={getAgentLogo(player.character.name)} 
                                                        alt={player.character.name}
                                                        title={player.character.name}
                                                        className="w-8 h-8 rounded object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                                                        {player.character.name}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2 text-center font-mono text-xs text-gray-400">{player.kills}</td>
                                            <td className="py-2 text-center font-mono text-xs text-gray-500">{player.deaths}</td>
                                            <td className="py-2 text-center font-mono text-xs text-gray-500">{player.killAssistsGiven}</td>
                                            <td className={`py-2 text-center font-mono text-xs font-bold ${
                                                player.kills - player.deaths >= 0 ? 'text-green-500/70' : 'text-red-500/70'
                                            }`}>
                                                {player.kills - player.deaths > 0 ? '+' : ''}{player.kills - player.deaths}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Match;