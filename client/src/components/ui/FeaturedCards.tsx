import {motion} from "motion/react";
import {BarChart3, FileText, Search, Sparkles} from "lucide-react";
import { useState } from "react";

const FeaturedCards = () => {
    const [activeFeature, setActiveFeature] = useState(0);

    const features = [
        {
            icon: <BarChart3 className="w-8 h-8" />,
            title: 'Match History',
            description: 'Track and analyze all your team matches',
            previewImage: '/featured/match-history-preview.png',
        },
        {
            icon: <Search className="w-8 h-8" />,
            title: 'Analytics',
            description: 'Deep dive into performance metrics and insights',
            previewImage: '/featured/analytics-preview.png',
        },
        {
            icon: <FileText className="w-8 h-8" />,
            title: 'Tactical Report',
            description: 'Gain access to comprehensive reports on team strategies',
            previewImage: '/featured/tactical-preview.png',
        },

        {
            icon: <Sparkles className="w-8 h-8" />,
            title: 'AI Insights',
            description: 'Generate AI driven insights to enhance team performance',
            previewImage: '/featured/ai-insights-preview.png',
        },
    ];

    return (
        <div className="mb-12">
            {/* Feature Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mb-6"
            >
                <div className="grid md:grid-cols-4 gap-4">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                        >
                            <button
                                onClick={() => setActiveFeature(index)}
                                className={`w-full backdrop-blur-md bg-white/5 border rounded-lg p-4 hover:border-blue-400/50 hover:bg-white/10 transition-all duration-300 h-40 flex flex-col justify-center ${
                                    activeFeature === index ? 'border-blue-400 bg-white/10 ring-2 ring-blue-400/30' : 'border-white/10'
                                }`}
                            >
                                <div className={`flex justify-center mb-2 transition-colors ${
                                    activeFeature === index ? 'text-blue-300' : 'text-blue-400'
                                }`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-base font-semibold text-white text-center mb-2">
                                    {feature.title}
                                </h3>
                                <p className="text-s text-blue-200/70 text-center leading-tight">
                                    {feature.description}
                                </p>
                            </button>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Preview Image Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="relative max-w-4xl mx-auto"
            >
                <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-4 overflow-hidden">
                    <motion.div
                        key={activeFeature}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                        className="relative aspect-video bg-gradient-to-br from-slate-800/50 to-blue-900/30 rounded-xl overflow-hidden border border-white/10"
                    >
                        {/* Placeholder image - replace with actual screenshots later */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                                <div className="text-6xl mb-4 text-blue-400/50">
                                    {features[activeFeature].icon}
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">
                                    {features[activeFeature].title}
                                </h3>
                                <p className="text-blue-200/60">
                                    Preview image coming soon
                                </p>
                            </div>
                        </div>
                        
                        {/* Optional: Add actual image when ready */}
                        {/* <img 
                            src={features[activeFeature].previewImage} 
                            alt={features[activeFeature].title}
                            className="w-full h-full object-cover"
                        /> */}
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

export default FeaturedCards;