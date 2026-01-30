import axios from 'axios';
import type {Team} from "../types/Team.ts";

async function getTeam(id: string, signal?: AbortSignal): Promise<Team | null> {
    try {
        const res = await axios.get(`/api/central/team/${id}`, { signal });
        // GraphQL responses are wrapped in a data object
        return res?.data?.data?.team || null;
    } catch (err) {
        if (axios.isCancel(err)) return null;
        console.error(err);
        return null;
    }
}

export default getTeam;
