import type { SeriesStats } from "../types/SeriesStats.ts";
import type { Team } from "../types/Team.ts";

type Props = {
    team: Team | null;
    allSeriesData: SeriesStats[];
}

const TeamLevelStatsOverview = ({ team, allSeriesData }: Props) => {
    if (!team) return null;

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

            // 1. Match Win Rate
            totalMatches++;
            if (teamMatch.won) matchesWon++;

            // 2. Round Win Rates (Segments represent rounds in Valorant)
            game.segments?.forEach(segment => {
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

    const StatCard = ({ label, value, subtext }: { label: string, value: string, subtext: string }) => (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl flex flex-col items-center justify-center">
            <span className="text-gray-400 text-xs uppercase tracking-widest mb-2 font-bold">{label}</span>
            <span className="text-4xl font-black text-white mb-1">{value}</span>
            <span className="text-[10px] text-gray-500 font-mono uppercase tracking-tighter">{subtext}</span>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard 
                label="Match Win Rate" 
                value={`${matchWinRate.toFixed(1)}%`} 
                subtext={`${matchesWon}W - ${totalMatches - matchesWon}L`}
            />
            <StatCard 
                label="Attack Win Rate" 
                value={`${attackWinRate.toFixed(1)}%`} 
                subtext={`${attackRoundsWon} / ${totalAttackRounds} Rounds`}
            />
            <StatCard 
                label="Defense Win Rate" 
                value={`${defenseWinRate.toFixed(1)}%`} 
                subtext={`${defenseRoundsWon} / ${totalDefenseRounds} Rounds`}
            />
        </div>
    );
};

export default TeamLevelStatsOverview;