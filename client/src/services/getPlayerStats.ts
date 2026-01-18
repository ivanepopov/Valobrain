import axios from 'axios';
import type {PlayerStats} from "../types/PlayerStats.ts";

async function getPlayerStats(playerId: string, timeFrame: string): Promise<PlayerStats | null> {
    try {
        const res = await axios.get(`/api/player/${playerId}/${timeFrame}`)

        if (!res.data || !res.data.data || !res.data.data.playerStatistics) return null;
        return res.data.data.playerStatistics;
    } catch (err) {
        console.error(err);
        return null;
    }
}

export default getPlayerStats;
