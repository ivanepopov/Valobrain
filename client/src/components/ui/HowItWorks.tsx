import { motion } from "motion/react";
import { Search, BarChart3, Sparkles } from "lucide-react";

const HowItWorks = () => {
    const steps = [
        {
            number: "01",
            icon: <Search className="w-10 h-10" />,
            title: "Search Your Team",
            description: "Enter any Valorant team name to get started with comprehensive analytics",
        },
        {
            number: "02",
            icon: <BarChart3 className="w-10 h-10" />,
            title: "Analyze Performance",
            description: "View detailed match history, statistics, and performance metrics",
        },
        {
            number: "03",
            icon: <Sparkles className="w-10 h-10" />,
            title: "Get AI Insights",
            description: "Receive AI-powered tactical reports and strategic recommendations",
        },
    ];

    return (
        <div className="mb-16">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-12"
            >
                <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
                <p className="text-blue-200/70 text-lg">
                    Get started with ValoBrain in three simple steps
                </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
                {steps.map((step, index) => (
                    <motion.div
                        key={step.number}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: index * 0.1 }}
                        className="relative"
                    >
                        {/* Connecting line (hidden on last item and mobile) */}
                        {index < steps.length - 1 && (
                            <div className="hidden md:block absolute top-16 left-1/2 w-full h-0.5 bg-gradient-to-r from-blue-400/50 to-transparent" />
                        )}

                        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-blue-400/50 transition-all duration-300 relative z-10">
                            {/* Step number */}
                            <div className="text-6xl font-bold text-blue-400/20 mb-4">
                                {step.number}
                            </div>

                            {/* Icon */}
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-400/10 border border-blue-400/30 text-blue-400 mb-6">
                                {step.icon}
                            </div>

                            {/* Title */}
                            <h3 className="text-xl font-semibold text-white mb-3">
                                {step.title}
                            </h3>

                            {/* Description */}
                            <p className="text-blue-200/70 leading-relaxed">
                                {step.description}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default HowItWorks;
