import {motion} from "motion/react";
import {BarChart3, FileText, Search} from "lucide-react";

const FeaturedCards = () => {

    const features = [
        {
            icon: <BarChart3 className="w-8 h-8" />,
            title: 'Match History',
            description: 'Track and analyze all your team matches with detailed statistics',
        },
        {
            icon: <Search className="w-8 h-8" />,
            title: 'Analytics',
            description: 'Deep dive into performance metrics and tactical insights',
        },
        {
            icon: <FileText className="w-8 h-8" />,
            title: 'Scouting Report',
            description: 'Generate comprehensive reports on team strategies and patterns',
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-16"
        >
            <div className="grid md:grid-cols-3 gap-6">
                {features.map((feature, index) => (
                    <motion.div
                        key={feature.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                    >
                        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-lg p-8 hover:border-blue-400/50 hover:bg-white/10 transition-all duration-300 h-full">
                            <div className="text-blue-400 mb-4 flex justify-center">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-3 text-center">
                                {feature.title}
                            </h3>
                            <p className="text-blue-200/80 text-center">
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