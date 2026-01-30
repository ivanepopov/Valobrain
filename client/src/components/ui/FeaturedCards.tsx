import {motion} from "motion/react";
import {BarChart3, FileText, Search, Sparkles, ChevronLeft, ChevronRight} from "lucide-react";
import { useState } from "react";
import matchHistoryImg from '../../assets/features_images/match_history.png';
import analytics1Img from '../../assets/features_images/analytics_1.png';
import analytics2Img from '../../assets/features_images/analytics_2.png';
import ai1Img from '../../assets/features_images/ai_1.png';
import ai2Img from '../../assets/features_images/ai_2.png';
import ai3Img from '../../assets/features_images/ai_3.png';

const FeaturedCards = () => {
    const [activeFeature, setActiveFeature] = useState(0);
    const [analyticsImageIndex, setAnalyticsImageIndex] = useState(0);
    const [aiImageIndex, setAiImageIndex] = useState(0);

    const analyticsImages = [ analytics1Img, analytics2Img];
    const aiImages = [ai1Img, ai2Img, ai3Img];

    const features = [
        {
            icon: <BarChart3 className="w-8 h-8" />,
            title: 'Match History',
            description: 'Track and analyze team matches',
            previewImage: matchHistoryImg,
        },
        {
            icon: <Search className="w-8 h-8" />,
            title: 'Analytics',
            description: 'Deep dive into performance metrics and overall team stats',
            previewImage: analyticsImages[analyticsImageIndex],
            hasCarousel: true,
            carouselType: 'analytics',
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
            description: 'Generate AI driven insights to enhance in-game performance',
            previewImage: aiImages[aiImageIndex],
            hasCarousel: true,
            carouselType: 'ai',
        },
    ];

    return (
        <div className="mb-24">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-12"
            >
                <h2 className="text-4xl font-bold text-white mb-4">Features</h2>
                <p className="text-blue-200/70 text-lg">
                    Explore the features that ValoBrain offers
                </p>
            </motion.div>

            {/* Feature Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mb-12"
            >
                <div className="grid md:grid-cols-4 gap-4">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
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
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="relative max-w-4xl mx-auto"
            >
                <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-4 overflow-hidden">
                    <div className="relative">
                        <motion.div
                            key={`${activeFeature}-${analyticsImageIndex}-${aiImageIndex}`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4 }}
                            className="relative aspect-video bg-gradient-to-br from-slate-800/50 to-blue-900/30 rounded-xl overflow-hidden border border-white/10"
                        >
                            <img 
                                src={features[activeFeature].previewImage} 
                                alt={features[activeFeature].title}
                                className="w-full h-full object-cover"
                            />
                        </motion.div>
                        
                        {/* Carousel arrows for features with carousel */}
                        {features[activeFeature].hasCarousel && (
                            <>
                                <button
                                    onClick={() => {
                                        if (features[activeFeature].carouselType === 'analytics') {
                                            setAnalyticsImageIndex((prev) => (prev === 0 ? analyticsImages.length - 1 : prev - 1));
                                        } else if (features[activeFeature].carouselType === 'ai') {
                                            setAiImageIndex((prev) => (prev === 0 ? aiImages.length - 1 : prev - 1));
                                        }
                                    }}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-all duration-300 hover:scale-110"
                                    aria-label="Previous image"
                                >
                                    <ChevronLeft className="w-8 h-8" />
                                </button>
                                <button
                                    onClick={() => {
                                        if (features[activeFeature].carouselType === 'analytics') {
                                            setAnalyticsImageIndex((prev) => (prev === analyticsImages.length - 1 ? 0 : prev + 1));
                                        } else if (features[activeFeature].carouselType === 'ai') {
                                            setAiImageIndex((prev) => (prev === aiImages.length - 1 ? 0 : prev + 1));
                                        }
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-all duration-300 hover:scale-110"
                                    aria-label="Next image"
                                >
                                    <ChevronRight className="w-8 h-8" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default FeaturedCards;