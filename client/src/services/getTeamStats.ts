import axios from 'axios';
import type { TeamStats } from '../types/TeamStats';

async function getTeamStats(teamId: string, timeFrame: string): Promise<TeamStats | null> {
    try {
        const res = await axios.get(`/api/teams/${teamId}/${timeFrame}`);
        return res.data.data.teamStatistics;
    } catch (err) {
        console.error(err);
        return null;
    }
}

export default getTeamStats;
