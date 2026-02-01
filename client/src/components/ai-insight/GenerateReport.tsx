import {motion} from "motion/react";
import {FileText, Loader2, X} from "lucide-react";
import GlassBox from "../ui/GlassBox.tsx";
import type {TransformedSeries} from "../../types/AIInsight.ts";

type Props = {
    selectedSeries: TransformedSeries;
    getSeriesMaps: () => string[];
    selectedReportMap: string;
    setSelectedReportMap: (map: string) => void;
    generationStage: string;
    generationStatus: string;
    isGenerating: boolean;
    handleGenerateReport: () => void;
    handleCancelGeneration: () => void;
    isLoadingMaps: boolean;
    error: string | null;
}

const GenerateReport = ({
    selectedSeries,
    getSeriesMaps,
    selectedReportMap,
    setSelectedReportMap,
    generationStage,
    generationStatus,
    isGenerating,
    handleGenerateReport,
    handleCancelGeneration,
    isLoadingMaps,
    error,
}: Props) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <GlassBox>
                <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-white mb-1">
                            Selected Series: vs {selectedSeries.opponent}
                        </h3>
                        <p className="text-blue-300 text-sm">
                            {selectedSeries.date} • {selectedSeries.score}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {error && (
                            <span className="text-red-400 text-sm">{error}</span>
                        )}
                        <div className="flex items-center gap-2">
                            {isGenerating && (
                                <button
                                    onClick={handleCancelGeneration}
                                    className="px-4 py-3 rounded-xl font-semibold bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-all duration-300 flex items-center gap-2"
                                >
                                    <X className="w-5 h-5" />
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={handleGenerateReport}
                                disabled={isGenerating}
                                className={`
                      flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300
                      ${isGenerating
                                    ? 'bg-blue-900/50 text-white/50 cursor-not-allowed'
                                    : 'bg-blue-900 text-white hover:scale-105'
                                }
                    `}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="w-5 h-5" />
                                        Generate AI Report
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Map Selection */}
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-blue-200 text-sm">Generate report for:</span>
                    {isLoadingMaps ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 text-blue-900 animate-spin" />
                            <span className="text-blue-300 text-sm">Loading maps...</span>
                        </div>
                    ) : (
                        <div className="flex gap-2 flex-wrap">
                            {getSeriesMaps().map((map, i) => (
                                <button
                                    key={i}
                                    onClick={() => setSelectedReportMap(map)}
                                    disabled={isGenerating}
                                    className={`
                        px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300
                        ${selectedReportMap === map
                                        ? 'bg-blue-900 text-white'
                                        : 'bg-white/5 text-blue-200 hover:bg-white/10'
                                    }
                        ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                                >
                                    Map {i + 1}: {map}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Progress Bar */}
                {isGenerating && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6"
                    >
                        {/* Stage Labels */}
                        <div className="flex justify-between mb-2">
                            {[
                                { key: 'digest', label: 'Building Digest' },
                                { key: 'analyst', label: 'AI Analysis' },
                                { key: 'writer', label: 'Writing Report' },
                            ].map((stage, index) => {
                                const stageOrder = ['digest', 'analyst', 'writer'];
                                const currentIndex = stageOrder.indexOf(generationStage);
                                const thisIndex = stageOrder.indexOf(stage.key);
                                const isActive = stage.key === generationStage;
                                const isComplete = currentIndex > thisIndex;

                                return (
                                    <div key={stage.key} className="flex flex-col items-center flex-1">
                                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-all duration-300
                          ${isComplete
                                            ? 'bg-green-500 text-white'
                                            : isActive
                                                ? 'bg-blue-900 text-white'
                                                : 'bg-white/10 text-blue-300'
                                        }
                        `}>
                                            {isComplete ? (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : isActive ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <span className="text-sm font-bold">{index + 1}</span>
                                            )}
                                        </div>
                                        <span className={`
                          text-xs font-medium transition-colors duration-300
                          ${isActive ? 'text-blue-300' : isComplete ? 'text-green-400' : 'text-blue-400/50'}
                        `}>
                          {stage.label}
                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Progress Bar Track */}
                        <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                className="absolute left-0 top-0 h-full bg-blue-900 rounded-full"
                                initial={{ width: '0%' }}
                                animate={{
                                    width: generationStage === 'digest' ? '33%'
                                        : generationStage === 'analyst' ? '66%'
                                            : generationStage === 'writer' ? '90%'
                                                : generationStage === 'complete' ? '100%'
                                                    : '5%'
                                }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                        </div>

                        {/* Current Status */}
                        <p className="text-center text-blue-300 text-sm mt-3">
                            {generationStatus || 'Initializing...'}
                        </p>
                    </motion.div>
                )}
            </GlassBox>
        </motion.div>
    );
};

export default GenerateReport;