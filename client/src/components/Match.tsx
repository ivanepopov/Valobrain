import React from 'react';
import type { MatchStats } from '../types/MatchStats';

interface MatchProps {
    match: MatchStats;
}

const Match: React.FC<MatchProps> = ({ match }) => {
    return (
        <div className="flex flex-col flex-1 gap-4 p-4 bg-gray-900/60 rounded-lg border border-white/5 shadow-xl">
            {/* Header: Map and Sequence */}
            <div className="flex justify-between items-end border-b border-white/10 pb-3">
                <div>
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block mb-1">
                        Map #{match.sequenceNumber}
                    </span>
                    <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">
                        {match.map.name}
                    </h2>
                </div>
            </div>

            {/* Teams Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {match.teams.map((team, teamIndex) => (
                    <div 
                        key={teamIndex} 
                        className={`relative overflow-hidden rounded-md border ${
                            team.won 
                                ? 'bg-green-500/5 border-green-500/20' 
                                : 'bg-red-500/5 border-red-500/20'
                        } p-3`}
                    >
                        {/* Win/Loss Indicator Label */}
                        <div className={`absolute top-0 right-0 px-2 py-0.5 text-[10px] font-black uppercase ${
                            team.won ? 'bg-green-500 text-black' : 'bg-red-600 text-white'
                        }`}>
                            {team.won ? 'Victory' : 'Defeat'}
                        </div>

                        <h3 className={`text-lg font-bold mb-3 ${team.won ? 'text-green-400' : 'text-red-400'}`}>
                            {team.name}
                        </h3>

                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-left text-gray-500 border-b border-white/5">
                                    <th className="pb-2 font-medium">PLAYER</th>
                                    <th className="pb-2 text-center font-medium">K</th>
                                    <th className="pb-2 text-center font-medium">D</th>
                                    <th className="pb-2 text-center font-medium">A</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {team.players.map((player, pIndex) => (
                                    <tr key={pIndex} className="group hover:bg-white/5 transition-colors">
                                        <td className="py-2 font-bold text-gray-200">{player.name}</td>
                                        <td className="py-2 text-center text-gray-300">{player.kills}</td>
                                        <td className="py-2 text-center text-gray-400">{player.deaths}</td>
                                        <td className="py-2 text-center text-gray-400">{player.killAssistsGiven}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Match;