import axios from 'axios';
import type {Team} from "../types/Team.ts";

async function getTeam(id: string): Promise<Team | null> {
    try {
        const res = await axios.get(`/api/central/team/${id}`);
        // GraphQL responses are wrapped in a data object
        return res.data.data.team;
    } catch (err) {
        console.error(err);
        return null;
    }
}

export default getTeam;
