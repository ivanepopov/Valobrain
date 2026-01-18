import type {MatchPlayerStats} from "./MatchPlayerStats";

export type MatchStats = {
    id: string;
    sequenceNumber: number;
    duration: string;
    map: {
        name: string;
    };
    teams: {
        name: string;
        won: boolean;
        players: MatchPlayerStats[];
    }[];
}