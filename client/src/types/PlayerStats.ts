export type PlayerStats = {
    id: string;
    aggregationSeriesIds: string[];
    series: {
        count: number;
        kills: {
            sum: number;
            min: number;
            max: number;
            avg: number;
        }
    }
}