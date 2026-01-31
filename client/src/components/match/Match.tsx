import { memo } from 'react';
import type { MatchStats } from '../../types/MatchStats';
import StatsTable from "./StatsTable.tsx";

type Props = {
    match: MatchStats | null;
    allMaps?: MatchStats[]; // For "All Maps" aggregation
    selectedTeamName?: string;
}

// Helper to aggregate player stats from all maps
const aggregatePlayerStats = (games: MatchStats[], teamName: string) => {
    const playerStatsMap: Record<string, {
        name: string;
        agents: Set<string>;
        kills: number;
        deaths: number;
        killAssistsGiven: number;
        damageDealt: number;
        roundsPlayed: number;
        firstKills: number;
    }> = {};

    games.forEach(game => {
        const teamData = game.teams.find(t => t.name === teamName);
        if (!teamData) return;

        teamData.players.forEach(player => {
            if (!playerStatsMap[player.name]) {
                playerStatsMap[player.name] = {
                    name: player.name,
                    agents: new Set(),
                    kills: 0,
                    deaths: 0,
                    killAssistsGiven: 0,
                    damageDealt: 0,
                    roundsPlayed: 0,
                    firstKills: 0
                };
            }
            playerStatsMap[player.name].agents.add(player.character.name);
            playerStatsMap[player.name].kills += player.kills;
            playerStatsMap[player.name].deaths += player.deaths;
            playerStatsMap[player.name].killAssistsGiven += player.killAssistsGiven;

            // Aggregate from segments (rounds)
            game.segments.forEach(segment => {
                const pSegment = segment.teams.flatMap(t => t.players).find(p => p.name === player.name);
                if (pSegment) {
                    playerStatsMap[player.name].roundsPlayed++;
                    playerStatsMap[player.name].damageDealt += pSegment.damageDealt || 0;
                    if (pSegment.firstKill) playerStatsMap[player.name].firstKills++;
                }
            });
        });
    });

    return Object.values(playerStatsMap).map(p => ({
        name: p.name,
        character: { name: Array.from(p.agents).join(', ') },
        kills: p.kills,
        deaths: p.deaths,
        killAssistsGiven: p.killAssistsGiven,
        adr: p.roundsPlayed > 0 ? (p.damageDealt / p.roundsPlayed).toFixed(1) : "0",
        fk: p.firstKills
    })).sort((a, b) => b.kills - a.kills);
};

/**
 * A React memoized functional component for displaying match statistics in either aggregated or single-match format.
 * The component dynamically renders stats tables for teams and players, with support for multi-map scenarios
 * where aggregated statistics are shown or single-match scenarios with detailed player metrics.
 *
 * @param match The match data object for a single match. If `null`, the component handles multi-map scenarios using `allMaps`.
 * @param allMaps An array of map data objects. If provided and non-empty, aggregated statistics across multiple maps are displayed.
 * @param selectedTeamName The name of the team that should be displayed on top.
 */
const Match = memo(({ match, allMaps, selectedTeamName }: Props) => {
    // If allMaps is provided, show aggregated stats
    const isAllMaps = allMaps && allMaps.length > 0;

    if (isAllMaps) {
        let teamNames = allMaps[0]?.teams.map(t => t.name) || [];

        // Ensure selectedTeamName is always on top
        if (selectedTeamName) {
            teamNames = [...teamNames].sort((a, b) => {
                if (a === selectedTeamName) return -1;
                if (b === selectedTeamName) return 1;
                return 0;
            });
        }

        return (
            <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-10">
                    {teamNames.map((teamName, teamIndex) => {
                        const aggregatedPlayers = aggregatePlayerStats(allMaps, teamName);
                        const winsCount = allMaps.filter(g =>
                            g.teams.find(t => t.name === teamName)?.won
                        ).length;
                        const isWinner = winsCount > allMaps.length / 2;

                        return (
                            <StatsTable
                                key={teamIndex}
                                teamName={teamName}
                                isWinner={isWinner}
                                players={aggregatedPlayers}
                                isMultipleAgents={true}
                            />
                        );
                    })}
                </div>
            </div>
        );
    }

    // Single map view
    if (!match) return null;

    let sortedTeams = [...match.teams];
    if (selectedTeamName) {
        sortedTeams.sort((a, b) => {
            if (a.name === selectedTeamName) return -1;
            if (b.name === selectedTeamName) return 1;
            return 0;
        });
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-10">
                {sortedTeams.map((matchTeam, teamIndex) => {
                    // Calculate ADR and FK for each player from the segments in this specific match
                    const enhancedPlayers = matchTeam.players.map(player => {
                        let totalDamage = 0;
                        let totalRounds = 0;
                        let firstKills = 0;

                        match.segments.forEach(segment => {
                            const playerSegment = segment.teams
                                .flatMap(t => t.players)
                                .find(p => p.name === player.name);
                            
                            if (playerSegment) {
                                totalRounds++;
                                totalDamage += playerSegment.damageDealt || 0;
                                if (playerSegment.firstKill) firstKills++;
                            }
                        });

                        return {
                            ...player,
                            adr: totalRounds > 0 ? (totalDamage / totalRounds).toFixed(1) : "0",
                            fk: firstKills
                        };
                    }).sort((a, b) => b.kills - a.kills);

                    return (
                        <StatsTable
                            key={teamIndex}
                            teamName={matchTeam.name}
                            isWinner={matchTeam.won}
                            players={enhancedPlayers}
                            isMultipleAgents={false}
                        />
                    );
                })}
            </div>
        </div>
    );
});

export default Match;
