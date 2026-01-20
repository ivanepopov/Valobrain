import axios from 'axios';

export async function getAdvancedSeriesStats(seriesId: string, teamName?: string) {
    try {
        const url = teamName 
            ? `/api/advanced-stats/${seriesId}?team=${encodeURIComponent(teamName)}`
            : `/api/advanced-stats/${seriesId}`;
            
        const res = await axios.get(url);
        return res.data;
    } catch (err) {
        console.error('Error fetching advanced stats:', err);
        throw err; // Re-throw to allow component to handle retry logic
    }
}