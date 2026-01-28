import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
    const handleScrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-24"
        >
            <div className="relative backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-12 overflow-hidden hover:border-blue-400/50 transition-all duration-300">
                {/* Subtle background decoration */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl" />

                <div className="relative z-10 text-center max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Ready to Elevate Your Team Analysis?
                    </h2>

                    <p className="text-lg text-blue-200/70 mb-8">
                        Start analyzing your favorite Valorant teams with AI-powered insights and comprehensive statistics
                    </p>

                    <button
                        onClick={handleScrollToTop}
                        className="group inline-flex items-center gap-3 px-8 py-4 bg-blue-900 hover:bg-white/5 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105"
                    >
                        Get Started Now
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default CTASection;
