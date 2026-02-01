import React from 'react';
import { motion } from 'motion/react';
import { History, Trash2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { GlassBox } from '../ui/GlassBox';
import type { ReportSections } from '../../types/AIInsight';

export interface SavedReport {
    id: string;
    teamName: string;
    opponent: string;
    map: string;
    date: string;
    createdAt: string;
    reportData: ReportSections;
}

interface ReportHistoryProps {
    reportHistory: SavedReport[];
    onLoadReport: (report: SavedReport) => void;
    onDeleteReport: (id: string) => void;
    isCollapsed: boolean;
    setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

const ReportHistory = ({ reportHistory, onLoadReport, onDeleteReport, isCollapsed, setIsCollapsed }: ReportHistoryProps) => {
    const formatTimeAgo = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="h-full flex flex-col"
        >
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <History className="w-6 h-6 text-purple-400" />
                    Report History
                </h2>
                <button
                    onClick={() => setIsCollapsed((v) => !v)}
                    className="text-white/70 hover:text-white transition-colors"
                    aria-label={isCollapsed ? 'Expand report history' : 'Collapse report history'}
                    type="button"
                >
                    {isCollapsed ? <ChevronDown className="w-6 h-6" /> : <ChevronUp className="w-6 h-6" />}
                </button>
            </div>

            {!isCollapsed && (
                <GlassBox className="flex-1">
                    <div className="flex justify-start mb-3">
                        <span className="text-sm" style={{ color: '#fffffe' }}>
                            {reportHistory.length} saved {reportHistory.length === 1 ? 'report' : 'reports'}
                        </span>
                    </div>
                    {reportHistory.length > 0 ? (
                        <div className="space-y-3 max-h-100 overflow-y-auto pr-2">
                            {reportHistory.map((report) => (
                                <div
                                    key={report.id}
                                    className="flex items-center justify-between p-3 rounded-lg border border-white/10 hover:border-purple-500/50 transition-all duration-300 cursor-pointer group"
                                    style={{ backgroundColor: 'rgba(127, 90, 240, 0.05)' }}
                                    onClick={() => onLoadReport(report)}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-white font-semibold truncate">
                                                {report.teamName} vs {report.opponent}
                                            </span>
                                            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                                                {report.map}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-purple-300/70">
                                            <Clock className="w-3 h-3" />
                                            <span>{formatTimeAgo(report.createdAt)}</span>
                                            <span>•</span>
                                            <span>{report.date}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteReport(report.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-all duration-200"
                                        title="Delete report"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <History className="w-12 h-12 text-purple-400/30 mx-auto mb-3" />
                            <p className="text-purple-200">No saved reports yet</p>
                            <p className="text-sm mt-2" style={{ color: '#7f5af0' }}>
                                Generate a report to see it here
                            </p>
                        </div>
                    )}
                </GlassBox>
            )}
        </motion.div>
    );
};

export default ReportHistory;
