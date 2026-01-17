import type {SeriesStats} from "../types/SeriesStats.ts";
import {useEffect, useState} from "react";
import getSeriesStats from "../services/getSeriesStats.ts";

type Props = {
    seriesId: string;
    selectedTeam: string;
}

function Series({ seriesId, selectedTeam }: Props) {
    const [seriesStats, setSeriesStats] = useState<SeriesStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSeriesData() {
            setLoading(true);
            try {
                await getSeriesStats(seriesId).then(stats => setSeriesStats(stats));
            } catch (error) {
                console.error("Failed to fetch series stats:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchSeriesData();
    }, [seriesId]);

    if (loading) return <div className="w-full h-20 bg-gray-700 animate-pulse rounded" />;
    if (!seriesStats?.seriesState) return null;

    const teams = seriesStats.seriesState.teams;
    const userTeam = teams.find(t => t.name === selectedTeam);
    const opposingTeam = teams.find(t => t.name !== selectedTeam);
    
    const hasWon = userTeam?.won;
    const seriesStyle = `w-full h-20 p-4 rounded flex items-center justify-between text-white font-semibold ${
        hasWon ? "bg-green-700/80" : "bg-red-900/60"
    }`;

    return (
        <div className={seriesStyle}>
            <div className="flex flex-col">
                <span className="text-sm opacity-80">{seriesStats.seriesState.format}</span>
                <span className="text-lg">
                    {selectedTeam} <span className="text-xs opacity-50 px-2">VS</span> {opposingTeam?.name || "Unknown"}
                </span>
            </div>
            <div className="text-2xl font-bold">
                {hasWon ? "WIN" : "LOSS"}
            </div>
        </div>
    );
}

export default Series;