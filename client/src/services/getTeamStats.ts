import axios from 'axios';
import type { TeamStats } from '../types/TeamStats';

type TeamStatsResponse = {
    data?: {
        teamStatistics?: TeamStats;
    } | null;
    errors?: unknown[];
};

/**
 * Fetches team statistics for a given time frame from the Statistics API.
 *
 * @param teamId
 * @param timeFrame
 * @param signal
 *
 * @returns TeamStats | null
 */
async function getTeamStats(
    teamId: string,
    timeFrame: string,
    signal?: AbortSignal
): Promise<TeamStats | null> {
    try {
        const res = await axios.get<TeamStatsResponse>(`/api/stats/teams/${teamId}/${timeFrame}`, { signal });

        // Guard against GraphQL errors: { data: ..., errors: [...] }
        if (Array.isArray(res.data?.errors) && res.data.errors.length > 0) return null;

        // Guard against unexpected/non-GraphQL shapes
        return res.data?.data?.teamStatistics ?? null;
    } catch (err: unknown) {
        // Axios may report AbortSignal cancellation as ERR_CANCELED
        if (axios.isCancel(err) || (axios.isAxiosError(err) && err.code === 'ERR_CANCELED')) return null;

        console.error(err);
        return null;
    }
}

export default getTeamStats;
