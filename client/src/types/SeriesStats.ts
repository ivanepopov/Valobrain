import type {MatchStats} from "./MatchStats";

export type SeriesStats = {
    seriesState: {
        valid: boolean;
        format: string;
        teams: {
            id: string;
            name: string;
            won: boolean;
        }[];
        games: MatchStats[];
    }
}