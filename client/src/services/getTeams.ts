import axios from 'axios';
import type {Team} from "../types/Team.ts";

type TeamEdge = {
    node: Team;
};

type GetTeamsResponse = {
    data?: {
        teams?: {
            edges?: TeamEdge[];
        };
    } | null;
    errors?: unknown[];
};

/**
 * Fetches teams matching the given search query from the Central API.
 *
 * @param contains
 * @param signal
 *
 * @returns Team[]
 */
async function getTeams(contains: string, signal?: AbortSignal): Promise<Team[]> {
    if (!contains.trim()) return [];

    try {
        const res = await axios.get<GetTeamsResponse>(`/api/central/teams/${contains}`, { signal });

        // Guard against GraphQL errors: { data: ..., errors: [...] }
        if (Array.isArray(res.data?.errors) && res.data.errors.length > 0) return [];

        // Extract nodes from GraphQL edges
        return res.data?.data?.teams?.edges?.map((edge) => edge.node) ?? [];
    } catch (err: unknown) {
        // Axios may report AbortSignal cancellation as ERR_CANCELED
        if (axios.isCancel(err) || (axios.isAxiosError(err) && err.code === 'ERR_CANCELED')) return [];

        console.error('Error fetching teams:', err);
        return [];
    }
}

export default getTeams;
