import axios from 'axios';
import type {Team} from "../types/Team.ts";

async function getTeam(id: string): Promise<Team | null> {
    try {
        const res = await axios.get(`/api/team/${id}`);
        // Extract nodes from GraphQL edges
        return res.data;
    } catch (err) {
        console.error(err);
        return null;
    }
}

export default getTeam;
