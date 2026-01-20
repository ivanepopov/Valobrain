import axios from 'axios';
import type {Team} from "../types/Team.ts";

async function getTeams(contains: string): Promise<Team[]> {
    try {
        const res = await axios.get(`/api/central/teams/${contains}`);
        // Extract nodes from GraphQL edges
        return res.data.data.teams.edges.map((edge: any) => edge.node);
    } catch (err) {
        console.error(err);
        return [];
    }
}

export default getTeams;
