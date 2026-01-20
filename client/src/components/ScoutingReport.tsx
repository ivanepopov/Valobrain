import React, { useEffect, useState } from 'react';
import {
    Zap,
    Target, 
    TrendingUp, 
    AlertCircle, 
    Loader2,
    ShieldCheck,
    Filter,
    Calendar
} from 'lucide-react';

interface ScoutingReportProps {
    teamName?: string;
    rawData: any[];
    isLoading: boolean;
    progress: { current: number; total: number; status: string };
    error: string | null;
}

const VALORANT_MAPS = ["All", "Abyss", "Ascent", "Bind", "Breeze", "Corrode", "Fracture", "Haven", "Icebox", "Lotus", "Pearl", "Split", "Sunset"];

const ScoutingReport: React.FC<ScoutingReportProps> = ({ 
    teamName, 
    rawData, 
    isLoading, 
    progress, 
    error 
}) => {
    const [scoutData, setScoutData] = useState<any>(null);
    const [selectedMap, setSelectedMap] = useState<string>("All");
    const [selectedSeries, setSelectedSeries] = useState<string>("All");

    const aggregateData = (allData: any[], mapFilter: string, seriesFilter: string) => {
        // Handle Single Series Selection (Uses Backend Analysis)
        if (seriesFilter !== "All") {
            const targetSeries = allData.find((_, index) => index.toString() === seriesFilter);
            if (targetSeries) {
                return {
                    analysis: targetSeries.analysis,
                    winConditions: targetSeries.winConditions,
                    tempo: targetSeries.tempo,
                    seriesCount: 1,
                    isSingleSeries: true
                };
            }
        }

        // Handle Aggregation (All History)
        let totalFBs = 0;
        let totalFBWins = 0;
        let totalBombRounds = 0;
        let totalElimRounds = 0;
        let totalDefused = 0;
        let totalDetonated = 0;
        const playerDamageMap: Record<string, { totalDamage: number; count: number }> = {};
        let totalContactTime = 0;
        let contactTimeCount = 0;
        let totalEliminationPct = 0;
        let matchesWithMap = 0;

        allData.forEach(series => {
            const filteredRounds = mapFilter === "All" 
                ? series.rounds 
                : series.rounds?.filter((r: any) => r.mapName === mapFilter);

            if (!filteredRounds || filteredRounds.length === 0) return;
            matchesWithMap++;

            filteredRounds.forEach((round: any) => {
                if (round.firstBlood) {
                    const isTeamFB = round.firstBlood.killerName && 
                        series.stats?.some((p: any) => p.name === round.firstBlood.killerName);
            
                    if (isTeamFB) {
                        totalFBs++;
                        if (round.winner === teamName) totalFBWins++;
                    }
                }

                if (round.winner === teamName) {
                    if (round.winType === "Detonation") {
                        totalDetonated++;
                        totalBombRounds++;
                    } else if (round.winType === "Defusal") {
                        totalDefused++;
                        totalBombRounds++;
                    } else if (round.winType === "Elimination") {
                        totalElimRounds++;
                    }
                }

                if (round.timing?.timeToFirstContact) {
                    totalContactTime += round.timing.timeToFirstContact;
                    contactTimeCount++;
                }
            });

            series.stats?.forEach((p: any) => {
                if (!playerDamageMap[p.name]) playerDamageMap[p.name] = { totalDamage: 0, count: 0 };
                playerDamageMap[p.name].totalDamage += p.damageDealt;
                playerDamageMap[p.name].count++;
            });

            const teamWins = filteredRounds.filter((r: any) => r.winner === teamName);
            if (teamWins.length > 0) {
                const elimWins = teamWins.filter((r: any) => r.winType === "Elimination").length;
                totalEliminationPct += Math.round((elimWins / teamWins.length) * 100);
            }
        });

        if (matchesWithMap === 0) return null;

        const combinedAnalysis = [
            {
                category: "Playstyle",
                title: totalBombRounds > totalElimRounds ? "Tactical Specialists" : "Aggressive & Explosive",
                description: `${teamName} won ${totalBombRounds} rounds via objective control (${totalDetonated} detonations, ${totalDefused} defusals) and ${totalElimRounds} rounds via pure eliminations${mapFilter !== 'All' ? ` on ${mapFilter}` : ''}.`
            }
        ];

        const topPlayer = Object.entries(playerDamageMap).sort(([, a], [, b]) => b.totalDamage - a.totalDamage)[0];
        if (topPlayer) {
            combinedAnalysis.push({
                category: "Key Player",
                title: `Primary Threat: ${topPlayer[0]}`,
                description: `${topPlayer[0]} has dealt a cumulative ${topPlayer[1].totalDamage.toLocaleString()} damage in the analyzed matches.`
            });
        }

        if (totalFBs > 0) {
            const winRate = Math.round((totalFBWins / totalFBs) * 100);
            combinedAnalysis.push({
                category: "Team Tendency",
                title: winRate >= 70 ? "First Blood Dependent" : "Tactical Resilience",
                description: `${teamName} secured ${totalFBs} total first bloods and converted ${winRate}% of them into round wins.`
            });
        }

        return {
            analysis: combinedAnalysis,
            winConditions: {
                overall: { eliminationPct: Math.round(totalEliminationPct / matchesWithMap) }
            },
            tempo: {
                avgTimeToFirstContact: contactTimeCount > 0 ? Math.round(totalContactTime / contactTimeCount) : '??',
                tempoStyle: contactTimeCount > 0 && (totalContactTime / contactTimeCount) < 25 ? 'Aggressive' : (totalContactTime / contactTimeCount) < 40 ? 'Balanced' : 'Methodical'
            },
            seriesCount: matchesWithMap,
            isSingleSeries: false
        };
    };

    useEffect(() => {
        if (rawData.length > 0) {
            const updated = aggregateData(rawData, selectedMap, selectedSeries);
            setScoutData(updated);
        }
    }, [selectedMap, selectedSeries, rawData]);

    if (isLoading && rawData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 bg-slate-900/20 rounded-3xl border border-slate-800/50">
                <div className="relative mb-6">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                    <Zap className="w-5 h-5 text-yellow-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-widest italic text-white">Deep Intelligence Mining</h3>
                <p className="text-slate-500 mt-2 font-medium uppercase text-[10px] tracking-[0.2em] text-center px-4 leading-relaxed">
                    {progress.status} <br />
                    <span className="text-blue-400 font-bold mt-1 inline-block">Series {progress.current} of {progress.total}</span>
                </p>
                <div className="w-48 h-1.5 bg-slate-800 rounded-full mt-6 overflow-hidden">
                    <div
                        className="h-full bg-blue-500 transition-all duration-1000 ease-in-out"
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                </div>
            </div>
        );
    }

    if (error && rawData.length === 0) {
        return (
            <div className="p-8 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-400">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <p className="font-medium uppercase tracking-wider text-sm">{error}</p>
            </div>
        );
    }

    return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between border-b border-slate-800 pb-6 gap-6">
            <div>
                <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Advanced Tactical Analysis</span>
                </div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter">
                    Scouting Report: <span className="text-blue-500">{teamName || 'Unknown Team'}</span>
                </h2>
            </div>

            <div className="flex flex-wrap gap-3">
                {/* Series Filter */}
                <div className="bg-slate-900/50 border border-slate-800 p-1.5 rounded-xl flex items-center gap-1">
                    <div className="flex items-center gap-2 px-3 py-1.5 border-r border-slate-800 mr-1 shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">History</span>
                    </div>
                    <select
                        value={selectedSeries}
                        onChange={(e) => {
                            setSelectedSeries(e.target.value);
                            if (e.target.value !== "All") setSelectedMap("All");
                        }}
                        className="bg-transparent text-[10px] font-black uppercase tracking-wider text-white px-2 py-1 outline-none cursor-pointer"
                    >
                        <option value="All" className="bg-slate-900">Aggregate All</option>
                        {rawData.map((series, idx) => {
                                // 1. Determine Opponent Name
                                const opponent = series.rounds?.[0]?.winner === teamName 
                                    ? series.rounds.find((r: any) => r.winner !== teamName)?.winner || "Unknown"
                                    : series.rounds?.[0]?.winner || "Unknown";
                                
                                // 2. Group rounds by map to calculate Map Wins
                                const mapResults: Record<string, { teamRounds: number; opponentRounds: number }> = {};
                                
                                series.rounds?.forEach((r: any) => {
                                    if (!mapResults[r.mapName]) {
                                        mapResults[r.mapName] = { teamRounds: 0, opponentRounds: 0 };
                                    }
                                    if (r.winner === teamName) mapResults[r.mapName].teamRounds++;
                                    else if (r.winner === opponent) mapResults[r.mapName].opponentRounds++;
                                });

                                let teamMapWins = 0;
                                let opponentMapWins = 0;

                                Object.values(mapResults).forEach(res => {
                                    if (res.teamRounds > res.opponentRounds) teamMapWins++;
                                    else if (res.opponentRounds > res.teamRounds) opponentMapWins++;
                                });

                                const result = teamMapWins > opponentMapWins ? 'W' : 'L';

                                return (
                                    <option key={idx} value={idx.toString()} className="bg-slate-900">
                                        vs {opponent} ({teamMapWins}-{opponentMapWins} {result})
                                    </option>
                                );
                            })}
                        </select>
                </div>

                {/* Map Filter Component */}
                <div className={`bg-slate-900/50 border border-slate-800 p-1.5 rounded-xl flex items-center gap-1 overflow-x-auto custom-scrollbar max-w-full scroll-smooth transition-opacity ${selectedSeries !== 'All' ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex items-center gap-2 px-3 py-1.5 border-r border-slate-800 mr-1 shrink-0">
                        <Filter className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Map</span>
                    </div>
                    {VALORANT_MAPS.map(m => (
                        <button
                            key={m}
                            onClick={() => setSelectedMap(m)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shrink-0 ${
                                selectedMap === m
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {!scoutData ? (
            <div className="p-24 bg-slate-900/10 border border-dashed border-slate-800 rounded-3xl text-center">
                <Target className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No match records found for {selectedMap}</p>
                <button
                    onClick={() => {
                        setSelectedMap('All');
                        setSelectedSeries('All');
                    }}
                    className="mt-4 text-blue-500 text-[10px] font-black uppercase tracking-[0.3em] hover:text-blue-400 transition-colors"
                >
                    Reset Filter
                </button>
            </div>
        ) : (
            <>
                {/* Tactical Insights Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {scoutData.analysis.map((insight: any, index: number) => (
                        <div key={index} className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-blue-500/30 transition-colors group">
                            <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-800 px-2 py-1 rounded">
                                {insight.category}
                            </span>
                                <Target className="w-4 h-4 text-slate-700 group-hover:text-blue-500 transition-colors" />
                            </div>
                            <h4 className="text-lg font-bold text-white mb-2">{insight.title}</h4>
                            <p className="text-sm text-slate-400 leading-relaxed">{insight.description}</p>
                        </div>
                    ))}
                </div>

                {/* Tempo & Execution Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-linear-to-br from-slate-900 to-black border border-slate-800 rounded-2xl p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                            <h3 className="font-black uppercase italic tracking-widest text-sm">Tempo Profile</h3>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Pace Style</p>
                                <p className="text-2xl font-black text-white uppercase italic">{scoutData.tempo.tempoStyle}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Avg. Contact</p>
                                <p className="text-2xl font-black text-blue-500 italic">{scoutData.tempo.avgTimeToFirstContact}s</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl p-8 flex flex-col justify-center">
                        <p className="text-slate-500 text-sm italic text-center leading-relaxed">
                            "The historical data for {teamName} shows a preference for <span className="text-white font-bold">{scoutData.winConditions.overall.eliminationPct}% elimination wins</span>.
                            Disrupting their coordination in mid-round aim duels is statistically the most viable counter."
                        </p>
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-slate-700 text-[9px] font-black uppercase tracking-[0.4em]">
                        {scoutData.isSingleSeries ? 'Detailed Series Analysis' : `Aggregated from ${scoutData.seriesCount} series records`}
                    </p>
                </div>
            </>
        )}
    </div>
    );
};

export default ScoutingReport;