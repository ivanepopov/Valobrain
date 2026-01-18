import axios from 'axios';

async function getTeamRoster(id: string): Promise<[] | null> {
    try {
        const res = await axios.get(`/api/team/${id}/roster`);
        return res.data.data.players.edges.map((edge: any) => edge.node);
    } catch (err) {
        console.error(err);
        return null;
    }
}

export default getTeamRoster;
