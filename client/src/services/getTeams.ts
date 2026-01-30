import axios from 'axios';
import type {Team} from "../types/Team.ts";

interface TeamEdge {
    node: Team;
}

async function getTeams(contains: string, signal?: AbortSignal): Promise<Team[]> {
    if (!contains.trim()) return [];
    try {
        const res = await axios.get(`/api/central/teams/${contains}`, { signal });
        // Extract nodes from GraphQL edges
        return res?.data?.data?.teams?.edges?.map((edge: TeamEdge) => edge.node) || [];
    } catch (err) {
        if (axios.isCancel(err)) {
            return [];
        }
        console.error('Error fetching teams:', err);
        return [];
    }
}

export default getTeams;
