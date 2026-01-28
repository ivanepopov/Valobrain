import {motion} from "motion/react";
import {BarChart3, FileText, Search, Sparkles} from "lucide-react";

const FeaturedCards = () => {

    const features = [
        {
            icon: <BarChart3 className="w-8 h-8" />,
            title: 'Match History',
            description: 'Track and analyze all your team matches',
        },
        {
            icon: <Search className="w-8 h-8" />,
            title: 'Analytics',
            description: 'Deep dive into performance metrics and insights',
        },
        {
            icon: <FileText className="w-8 h-8" />,
            title: 'Tactical Report',
            description: 'Gain access to comprehensive reports on team strategies',
        },

        {
            icon: <Sparkles className="w-8 h-8" />,
            title: 'AI Insights',
            description: 'Generate AI driven insights to enhance team performance',
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-16"
        >
            <div className="grid md:grid-cols-4 gap-6">
                {features.map((feature, index) => (
                    <motion.div
                        key={feature.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                    >
                        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-lg p-6 hover:border-blue-400/50 hover:bg-white/10 transition-all duration-300 h-50 flex flex-col">
                            <div className="text-blue-400 flex justify-center mb-4">
                                {feature.icon}
                            </div>
                            <h3 className="text-lg font-semibold text-white text-center mb-4">
                                {feature.title}
                            </h3>
                            <p className="text-sm text-blue-200/80 text-center leading-snug flex-grow flex items-center justify-center">
                                {feature.description}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};

export default FeaturedCards;