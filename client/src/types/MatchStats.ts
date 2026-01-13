import type {MatchPlayerStats} from "./MatchPlayerStats";

export type MatchStats = {
    id: string;
    sequenceNumber: number;
    map: {
        name: string;
    };
    teams: {
        name: string;
        won: boolean;
        players: MatchPlayerStats[];
    };
}