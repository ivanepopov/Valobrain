import axios from 'axios';
import type { TeamStats } from '../types/TeamStats';

async function getTeamStats(teamId: string, timeFrame: string, signal?: AbortSignal): Promise<TeamStats | null> {
    try {
        const res = await axios.get(`/api/stats/teams/${teamId}/${timeFrame}`, { signal });

        // Guard against non-GraphQL responses like: { error: "Failed to fetch..." }
        if (!res.data || !res.data.data || !res.data.data.teamStatistics) return null;

        // Guard against GraphQL errors: { data: null, errors: [...] }
        if (Array.isArray(res.data.errors) && res.data.errors.length > 0) return null;

        return res.data.data.teamStatistics;
    } catch (err) {
        if (axios.isCancel(err)) return null;
        console.error(err);
        return null;
    }
}

export default getTeamStats;
