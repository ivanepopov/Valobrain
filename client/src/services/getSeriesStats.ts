import axios from 'axios';
import type { SeriesStats } from '../types/SeriesStats';

async function getSeriesStats(seriesId: string, signal?: AbortSignal): Promise<SeriesStats | null> {
    try {
        const res = await axios.get(`/api/series/${seriesId}`, { signal });
        return res.data.data;
    } catch (err) {
        if (axios.isCancel(err)) return null;
        console.error(err);
        return null;
    }
}

export default getSeriesStats;
