import { motion } from "motion/react";
import { Search, BarChart3, Sparkles } from "lucide-react";

const HowItWorks = () => {
    const steps = [
        {
            number: "01",
            icon: <Search className="w-10 h-10" />,
            title: "Search Your Team",
            description: "Enter any Valorant team name to get started",
        },
        {
            number: "02",
            icon: <BarChart3 className="w-10 h-10" />,
            title: "Analyze Performance",
            description: "View detailed match history, analytics, and overall performance metrics",
        },
        {
            number: "03",
            icon: <Sparkles className="w-10 h-10" />,
            title: "Get AI Insights",
            description: "Receive AI-powered tactical reports and strategic recommendations",
        },
    ];

    return (
        <div className="mb-24">
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-center mb-12"
            >
                <motion.h2 
                    initial={{ opacity: 0, y: -20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    className="text-4xl font-bold text-white mb-4"
                >
                    How It Works
                </motion.h2>
                <motion.p 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-gray-200 text-xl"
                >
                    Get started with ValoBrain in three simple steps
                </motion.p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
                {steps.map((step, index) => (
                    <motion.div
                        key={step.number}
                        initial={{ opacity: 0, y: 60 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ 
                            duration: 0.8, 
                            delay: index * 0.2,
                            ease: [0.25, 0.46, 0.45, 0.94]
                        }}
                        whileHover={{ 
                            scale: 1.02, 
                            y: -12,
                            transition: { duration: 0.3 }
                        }}
                        className="relative"
                    >
                        {/* Connecting line (hidden on last item and mobile) */}
                        {index < steps.length - 1 && (
                            <div className="hidden md:block absolute top-16 left-1/2 w-full h-0.5 bg-gradient-to-r from-blue-400/50 to-transparent" />
                        )}

                        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-blue-400/50 transition-all duration-300 relative z-10 h-full min-h-[380px] flex flex-col">
                            {/* Step number */}
                            <motion.div 
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.2 + 0.3 }}
                                className="text-6xl font-bold text-white mb-4"
                            >
                                {step.number}
                            </motion.div>

                            {/* Icon */}
                            <motion.div 
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.2 + 0.4, ease: "easeOut" }}
                                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-400/10 border border-blue-400/30 text-blue-400 mb-6"
                            >
                                {step.icon}
                            </motion.div>

                            {/* Title */}
                            <motion.h3 
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.2 + 0.5 }}
                                className="text-xl font-semibold text-white mb-3"
                            >
                                {step.title}
                            </motion.h3>

                            {/* Description */}
                            <motion.p 
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.2 + 0.6 }}
                                className="text-white leading-relaxed"
                            >
                                {step.description}
                            </motion.p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default HowItWorks;
