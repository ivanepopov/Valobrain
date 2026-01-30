import axios from 'axios';
import type { Team } from "../types/Team.ts";

type GetTeamResponse = {
    data?: {
        team?: Team;
    } | null;
    errors?: unknown[];
};

/**
 * Fetches a team by ID from the Central API.
 *
 * @param teamId
 * @param signal
 *
 * @returns Team | null
 */
async function getTeam(teamId: string, signal?: AbortSignal): Promise<Team | null> {
    try {
        const res = await axios.get<GetTeamResponse>(`/api/central/team/${teamId}`, { signal });

        // Guard against GraphQL errors: { data: ..., errors: [...] }
        if (Array.isArray(res.data?.errors) && res.data.errors.length > 0) return null;

        // Guard against unexpected/non-GraphQL shapes
        return res.data?.data?.team ?? null;
    } catch (err: unknown) {
        // Axios may report AbortSignal cancellation as ERR_CANCELED
        if (axios.isCancel(err) || (axios.isAxiosError(err) && err.code === 'ERR_CANCELED')) return null;

        console.error(err);
        return null;
    }
}

export default getTeam;
