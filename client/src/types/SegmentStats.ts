export type SegmentStats = {
    id: string;
    teams: {
        name: string;
        won: boolean;
        side: string;
        objectives: {
            id: string;
        }[];
        players: {
            name: string;
            firstKill: boolean;
            damageDealt: number;
        }[];
    }[];
}