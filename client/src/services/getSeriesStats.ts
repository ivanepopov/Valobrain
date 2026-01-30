import axios from 'axios';
import type { SeriesStats } from '../types/SeriesStats';

type GetSeriesStatsResponse = {
    data?: SeriesStats | null;
    errors?: unknown[];
};

/**
 * Fetches series statistics from the Central API.
 *
 * @param seriesId
 * @param signal
 *
 * @returns SeriesStats | null
 */
async function getSeriesStats(seriesId: string, signal?: AbortSignal): Promise<SeriesStats | null> {
    try {
        const res = await axios.get<GetSeriesStatsResponse>(`/api/series/${seriesId}`, { signal });

        // Guard against GraphQL errors: { data: ..., errors: [...] }
        if (Array.isArray(res.data?.errors) && res.data.errors.length > 0) return null;

        // Guard against unexpected/non-GraphQL shapes
        return res.data?.data ?? null;
    } catch (err: unknown) {
        // Axios may report AbortSignal cancellation as ERR_CANCELED
        if (axios.isCancel(err) || (axios.isAxiosError(err) && err.code === 'ERR_CANCELED')) return null;

        console.error(err);
        return null;
    }
}

export default getSeriesStats;
