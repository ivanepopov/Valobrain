import type {MatchStats} from "./MatchStats";

export type SeriesStats = {
    seriesState: {
        valid: boolean;
        format: string;
        teams: {
            name: string;
            won: boolean;
        }[];
        games: MatchStats[];
    }
}