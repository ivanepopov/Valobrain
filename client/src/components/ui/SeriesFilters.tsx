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
            <GlassBox className="p-3">
                <div className="flex flex-col gap-3">
                    {/* Map Filter */}
                    {setSelectedMap !== undefined && selectedMap !== undefined &&
                        <div className="flex items-center gap-6">
                            <label className="text-xs font-medium tracking-wider whitespace-nowrap w-28" style={{ color: '#fffffe' }}>Filter by Map</label>
                            <div className="flex gap-1.5 flex-wrap">
                                {VALORANT_MAPS.map((map) => (
                                    <button
                                        key={map}
                                        onClick={() => setSelectedMap(map)}
                                        className="px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-300"
                                        style={{
                                            backgroundColor: selectedMap === map ? '#7f5af0' : 'rgba(255, 255, 255, 0.05)',
                                            color: selectedMap === map ? '#fffffe' : '#94a1b2',
                                            boxShadow: selectedMap === map ? '0 10px 15px -3px rgba(127, 90, 240, 0.2)' : 'none'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (selectedMap !== map) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (selectedMap !== map) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                        }}
                                    >
                                        {map}
                                    </button>
                                ))}
                            </div>
                        </div>
                    }

                    {/* Timeframe Filter */}
                    {setTimeRange !== undefined && timeRange !== undefined &&
                        <div className="flex items-center gap-6">
                            <label className="text-xs font-medium tracking-wider whitespace-nowrap w-28" style={{ color: '#fffffe' }}>Filter by Timeframe</label>
                            <div className="flex gap-1.5 flex-wrap">
                                {TIME_FILTERS.map((timeframe) => {
                                    const isActive = (timeframe === 'All' && timeRange === 'all') ||
                                        (timeframe === 'Last 30 Days' && timeRange === '30') ||
                                        (timeframe === 'Last 60 Days' && timeRange === '60') ||
                                        (timeframe === 'Last 90 Days' && timeRange === '90');
                                    return (
                                        <button
                                            key={timeframe}
                                            onClick={() => setTimeRange(
                                                timeframe === 'All' ? 'all' :
                                                    timeframe === 'Last 30 Days' ? '30' :
                                                        timeframe === 'Last 60 Days' ? '60' : '90'
                                            )}
                                            className="px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-300"
                                            style={{
                                                backgroundColor: isActive ? '#7f5af0' : 'rgba(255, 255, 255, 0.05)',
                                                color: isActive ? '#fffffe' : '#94a1b2',
                                                boxShadow: isActive ? '0 10px 15px -3px rgba(127, 90, 240, 0.2)' : 'none'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                            }}
                                        >
                                            {timeframe}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    }
                </div>
            </GlassBox>
        </motion.div>
    );
};

export default SeriesFilters;