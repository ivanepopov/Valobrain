import React, { useEffect, useState } from 'react';
import {
    Target,
    AlertCircle,
    Loader2,
    Trophy,
    Crosshair,
    Shield,
    Users,
    Zap,
} from 'lucide-react';
import { GlassBox } from "../ui/GlassBox.tsx";

interface ScoutingReportProps {
    teamName?: string;
    rawData: any[];
    isLoading: boolean;
    progress: { current: number; total: number; status: string };
    error: string | null;
}

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

    const timeframeOptions = [
        { value: "All", label: "All" },
        { value: "Last 30 Days", label: "Last 30 Days" },
        { value: "Last 60 Days", label: "Last 60 Days" },
        { value: "Last 90 Days", label: "Last 90 Days" },
    ];

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
            <GlassBox className="flex flex-col items-center justify-center py-24">
                <div className="relative mb-6">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-900"/>
                    <Trophy className="w-5 h-5 text-blue-900 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse"/>
                </div>
                <h3 className="text-xl font-bold text-white">
                    Analyzing Match Data
                </h3>
                <p className="text-blue-200/70 mt-2 text-sm">
                    {progress.status}
                </p>
                <p className="text-blue-400 font-semibold text-sm mt-1">
                    Series {progress.current} of {progress.total}
                </p>
                <div className="w-48 h-1.5 bg-white/10 rounded-full mt-6 overflow-hidden">
                    <div
                        className="h-full bg-blue-900 transition-all duration-1000 ease-in-out"
                        style={{width: `${(progress.current / progress.total) * 100}%` }}
                    />
                </div>
            </GlassBox>
        );
    }

    if (error && rawData.length === 0) {
        return (
            <GlassBox className="flex items-center gap-4 text-red-400">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <p className="font-medium text-sm">{error}</p>
            </GlassBox>
        );
    }

    const VALORANT_MAPS = ["All", "Abyss", "Ascent", "Bind", "Breeze", "Corrode", "Fracture", "Haven", "Icebox", "Lotus", "Pearl", "Split", "Sunset"];

    const getCategoryIcon = (category: string) => {
        const lowerCategory = category.toLowerCase();
        if (lowerCategory.includes('attack')) return { Icon: Crosshair, color: 'text-red-400' };
        if (lowerCategory.includes('defense')) return { Icon: Shield, color: 'text-blue-400' };
        if (lowerCategory.includes('player')) return { Icon: Users, color: 'text-purple-400' };
        if (lowerCategory.includes('conditioning') || lowerCategory.includes('playstyle')) return { Icon: Zap, color: 'text-yellow-400' };
        return { Icon: Target, color: 'text-green-400' };
    };

    return (
    <div className="space-y-8">
        {/* Header Section */}
       

        {/* Filters */}
        <GlassBox>
            <div className="space-y-6">
                {/* Map Filter */}
                <div>
                    <label className="text-blue-200 text-sm mb-2 block">Filter by Map</label>
                    <div className="flex gap-2 flex-wrap">
                        {VALORANT_MAPS.map(map => (
                            <button
                                key={map}
                                onClick={() => setSelectedMap(map)}
                                className={`
                                    px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300
                                    ${selectedMap === map
                                        ? 'bg-blue-900 text-white'
                                        : 'bg-white/5 text-blue-200 hover:bg-white/10'
                                    }
                                `}
                            >
                                {map}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Timeframe Filter */}
                <div>
                    <label className="text-blue-200 text-sm mb-2 block">Filter by Timeframe</label>
                    <div className="flex gap-2 flex-wrap">
                        {timeframeOptions.map((option, idx) => (
                            <button
                                key={`${option.value}-${idx}`}
                                onClick={() => setSelectedSeries(option.value)}
                                className={`
                                    px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300
                                    ${selectedSeries === option.value
                                        ? 'bg-blue-900 text-white'
                                        : 'bg-white/5 text-blue-200 hover:bg-white/10'
                                    }
                                `}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </GlassBox>

        {!scoutData ? (
            <GlassBox className="p-24 text-center">
                <Target className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <p className="text-blue-200/70 text-sm">No match records found for {selectedMap}</p>
                <button
                    onClick={() => {
                        setSelectedMap('All');
                        setSelectedSeries('All');
                    }}
                    className="mt-4 px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors text-sm font-medium"
                >
                    Reset Filter
                </button>
            </GlassBox>
        ) : (
            <>
                {/* Tactical Insights Section */}
                <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Tactical Insights</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {scoutData.analysis.map((insight: any, index: number) => {
                            const { Icon, color } = getCategoryIcon(insight.category);
                            return (
                                <GlassBox key={index} className="hover:border-blue-400/50 transition-colors">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Icon className={`w-5 h-5 ${color}`} />
                                        <p className="text-2xl font-bold text-white">{insight.title}</p>
                                    </div>
                                    <p className="text-sm text-white leading-relaxed">{insight.description}</p>
                                </GlassBox>
                            );
                        })}
                    </div>
                </div>

                {/* Tempo & Execution Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <div className="flex flex-col h-full">
                        <h2 className="text-2xl font-bold text-white mb-4">Tempo</h2>
                        <GlassBox className="flex-1">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-2xl font-bold text-white">Pace Style</p>
                                    <p className="text-xl font-bold text-white">{scoutData.tempo.tempoStyle}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-white text-sm mb-1">Avg. Contact</p>
                                    <p className="text-2xl font-bold text-white">{scoutData.tempo.avgTimeToFirstContact}s</p>
                                </div>
                            </div>
                        </GlassBox>
                    </div>

                    <div className="flex flex-col h-full">
                        <h2 className="text-2xl font-bold text-white mb-4">Analysis Summary</h2>
                        <GlassBox className="flex-1 flex flex-col justify-center">
                            <p className="text-white text-sm text-center leading-relaxed">
                                The historical data for {teamName} shows a preference for <span className="font-semibold">{scoutData.winConditions.overall.eliminationPct}% elimination wins</span>.
                                Disrupting their coordination in mid-round aim duels is statistically the most viable counter.
                            </p>
                        </GlassBox>
                    </div>
                </div>

            </>
        )}
    </div>
    );
};

export default ScoutingReport;