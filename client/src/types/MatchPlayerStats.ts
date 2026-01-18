export type MatchPlayerStats = {
    name: string;
    character: {
        name: string;
    }
    kills: number;
    deaths: number;
    killAssistsGiven: number;
}