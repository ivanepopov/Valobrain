import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { GlassBox } from '../ui/GlassBox';
import { capitalize } from '../../utils/formatters';
import type { TransformedSeries } from '../../types/AIInsight';

interface FilteredSeriesProps {
    selectedMap: string;

    teamName: string;
    transformedSeriesCount: number;

    isSeriesCollapsed: boolean;
    setIsSeriesCollapsed: React.Dispatch<React.SetStateAction<boolean>>;

    isCheckingAvailability: boolean;
    filteredSeries: TransformedSeries[];

    selectedSeries: TransformedSeries | null;
    setSelectedSeries: (series: TransformedSeries) => void;
}

const FilteredSeries = ({
    selectedMap,
    teamName,
    transformedSeriesCount,
    isSeriesCollapsed,
    setIsSeriesCollapsed,
    isCheckingAvailability,
    filteredSeries,
    selectedSeries,
    setSelectedSeries,
}: FilteredSeriesProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
        >
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">
                    {selectedMap === 'All' ? 'Available Series' : 'Filtered Series'}
                </h2>

                <button
                    onClick={() => setIsSeriesCollapsed((v) => !v)}
                    className="text-white/70 hover:text-white transition-colors"
                    aria-label={isSeriesCollapsed ? 'Expand series list' : 'Collapse series list'}
                    type="button"
                >
                    {isSeriesCollapsed ? <ChevronDown className="w-6 h-6" /> : <ChevronUp className="w-6 h-6" />}
                </button>
            </div>

            {!isSeriesCollapsed && (
                <GlassBox>
                    <div className="flex justify-start mb-3">
            <span className="text-blue-300 text-sm">
              {isCheckingAvailability ? 'Checking...' : `${filteredSeries.length} series with match data`}
            </span>
                    </div>

                    {isCheckingAvailability ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-blue-900 animate-spin mb-3" />
                            <p className="text-blue-200">Checking match data availability...</p>
                        </div>
                    ) : filteredSeries.length > 0 ? (
                        <div className="space-y-3 max-h-100 overflow-y-auto pr-2">
                            {filteredSeries.map((series) => (
                                <button
                                    key={series.id}
                                    onClick={() => setSelectedSeries(series)}
                                    className={`
                    w-full text-left p-4 rounded-lg border-2 transition-all duration-300
                    ${
                                        selectedSeries?.id === series.id
                                            ? 'border-blue-400 bg-blue-400/10'
                                            : series.result === 'win'
                                                ? 'border-green-400/30 bg-green-400/5 hover:border-green-400/50'
                                                : 'border-red-400/30 bg-red-400/5 hover:border-red-400/50'
                                    }
                  `}
                                    type="button"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                      <span className="text-white font-bold">
                        {teamName} vs {series.opponent}
                      </span>

                                            <span
                                                className={`
                          px-3 py-1 rounded-full text-sm font-bold
                          ${series.result === 'win' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
                        `}
                                            >
                        {series.score}
                      </span>
                                        </div>

                                        <span className="text-blue-400 text-sm">{series.date}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-blue-200 text-sm">Maps:</span>
                                        <div className="flex gap-2 flex-wrap">
                                            {series.maps.map((map, i) => (
                                                <span
                                                    key={`${series.id}-${i}-${map}`}
                                                    className={`
                            text-sm px-2 py-1 rounded
                            ${selectedMap === map ? 'bg-blue-500/30 text-blue-200 font-semibold' : 'bg-white/5 text-blue-300'}
                          `}
                                                >
                          {capitalize(map)}
                        </span>
                                            ))}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <AlertCircle className="w-12 h-12 text-blue-400/30 mx-auto mb-3" />
                            <p className="text-blue-200">No series with downloadable match data</p>
                            <p className="text-blue-400 text-sm mt-2">
                                {transformedSeriesCount > 0 ? 'Recent matches may not have public data available yet' : 'No matches found for this team'}
                            </p>
                        </div>
                    )}
                </GlassBox>
            )}
        </motion.div>
    );
}

export default FilteredSeries;