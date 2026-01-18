export type PlayerStats = {
    id: string;
    game : {
        count: number;
        won: {
            value: boolean;
            count: number;
            percentage: number;
        }[];
    }
    segment: {
        type: string;
        count: number;
        kills: {
            sum: number;
            min: number;
            max: number;
            avg: number;
        };
        deaths: {
            sum: number;
            min: number;
            max: number;
            avg: number;
        };
        killAssistsGiven: {
            sum: number;
            min: number;
            max: number;
            avg: number;
        };
        firstKill: {
            value: boolean;
            count: number;
            percentage: number;
        };
    }[];
}