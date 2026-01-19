import type {MatchPlayerStats} from "./MatchPlayerStats";
import type {SegmentStats} from "./SegmentStats.ts";

export type MatchStats = {
    id: string;
    sequenceNumber: number;
    duration: string;
    map: {
        name: string;
    };
    segments: SegmentStats[];
    teams: {
        name: string;
        won: boolean;
        players: MatchPlayerStats[];
    }[];
}