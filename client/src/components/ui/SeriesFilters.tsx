import React from 'react';
import {motion} from "motion/react";
import GlassBox from "./GlassBox.tsx";

const VALORANT_MAPS = ["All", "Abyss", "Ascent", "Bind", "Breeze", "Corrode", "Fracture", "Haven", "Icebox", "Lotus", "Pearl", "Split", "Sunset"];
const TIME_FILTERS = ['All', 'Last 30 Days', 'Last 60 Days', 'Last 90 Days'];

type Props = {
    setSelectedMap?: React.Dispatch<React.SetStateAction<string>>;
    selectedMap?: string;
    setTimeRange?: React.Dispatch<React.SetStateAction<string>>;
    timeRange?: string;
}

/**
 * Filter component for series data. Optionally includes map and timeframe filters.
 *
 * @param setSelectedMap
 * @param selectedMap
 * @param setTimeRange
 * @param timeRange
 */
const SeriesFilters = (
    { setSelectedMap = undefined,
        selectedMap = undefined,
        setTimeRange = undefined,
        timeRange = undefined,
    }: Props
) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6"
        >
            <GlassBox>
                {/* Map Filter */}
                {setSelectedMap !== undefined && selectedMap !== undefined &&
                    <div>
                        <label className="text-blue-200 text-sm mb-2 block">Filter by Map</label>
                        <div className="flex gap-2 flex-wrap">
                            {VALORANT_MAPS.map((map) => (
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
                }
                {/* Timeframe Filter */}
                {setTimeRange !== undefined && timeRange !== undefined &&
                    <div>
                        <label className="text-blue-200 text-sm mt-6 mb-2 block">Filter by Timeframe</label>
                        <div className="flex gap-2 flex-wrap">
                            {TIME_FILTERS.map((timeframe) => (
                                <button
                                    key={timeframe}
                                    onClick={() => setTimeRange(
                                        timeframe === 'All' ? 'all' :
                                            timeframe === 'Last 30 Days' ? '30' :
                                                timeframe === 'Last 60 Days' ? '60' : '90'
                                    )}
                                    className={`
                                            px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300
                                            ${(timeframe === 'All' && timeRange === 'all') ||
                                    (timeframe === 'Last 30 Days' && timeRange === '30') ||
                                    (timeframe === 'Last 60 Days' && timeRange === '60') ||
                                    (timeframe === 'Last 90 Days' && timeRange === '90')
                                        ? 'bg-blue-900 text-white'
                                        : 'bg-white/5 text-blue-200 hover:bg-white/10'
                                    }
                                        `}
                                >
                                    {timeframe}
                                </button>
                            ))}
                        </div>
                    </div>
                }
            </GlassBox>
        </motion.div>
    );
};

export default SeriesFilters;