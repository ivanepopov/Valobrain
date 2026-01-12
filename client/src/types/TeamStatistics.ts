export type TeamStatistics = {
    id: string;
    aggregationSeriesIds: string[];
    series: {
        count: number;
    };
    game: {
        count: number;
        won: {
            value: boolean;
            count: number;
            percentage: number;
            streak: {
                min: number;
                max: number;
                current: number;
            }
        }
    }
}