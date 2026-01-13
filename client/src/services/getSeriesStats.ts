import axios from 'axios';
import type { SeriesStats } from '../types/SeriesStats';

async function getSeriesStats(seriesId: string): Promise<SeriesStats | null> {
    try {
        const res = await axios.get(`/api/series/${seriesId}`);
        return res.data.data;
    } catch (err) {
        console.error(err);
        return null;
    }
}

export default getSeriesStats;
