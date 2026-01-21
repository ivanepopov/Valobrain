import type {MatchStats} from "./MatchStats";

export type SeriesStats = {
    seriesState: {
        startedAt: string;
        format: string;
        teams: {
            id: string;
            name: string;
            won: boolean;
        }[];
        games: MatchStats[];
    }
}