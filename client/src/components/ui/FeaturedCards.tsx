import {motion, AnimatePresence} from "motion/react";
import {BarChart3, Search, Sparkles} from "lucide-react";
import { useState, useEffect } from "react";
import matchHistoryImg from '../../assets/features_images/match_history.png';
import analytics1Img from '../../assets/features_images/analytics_1.png';
import analytics2Img from '../../assets/features_images/analytics_2.png';
import ai1Img from '../../assets/features_images/ai_1.png';
import ai2Img from '../../assets/features_images/ai_2.png';
import ai3Img from '../../assets/features_images/ai_3.png';

const FeaturedCards = () => {
    // All images in sequence
    const allImages = [
        matchHistoryImg,    // 0 - Match History
        analytics1Img,      // 1 - Analytics
        analytics2Img,      // 2 - Analytics
        ai1Img,            // 4 - AI Insights
        ai2Img,            // 5 - AI Insights
        ai3Img,            // 6 - AI Insights
    ];

    // Map image index to feature index
    const imageToFeatureMap = [0, 1, 1, 2, 2, 2];

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);

    // Auto-play carousel
    useEffect(() => {
        if (!isPlaying) return;

        const timer = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
        }, 3000);

        return () => clearInterval(timer);
    }, [isPlaying, allImages.length]);

    // Auto-update active feature based on current image
    const activeFeature = imageToFeatureMap[currentImageIndex];

    const features = [
        {
            icon: <BarChart3 className="w-8 h-8" />,
            title: 'Match History',
            description: 'View recent competitive matches and match statistics',
        },
        {
            icon: <Search className="w-8 h-8" />,
            title: 'Analytics',
            description: 'Deep dive into overall team stats, compositions, map performance, and win conditions',
        },
        {
            icon: <Sparkles className="w-8 h-8" />,
            title: 'AI Insights',
            description: 'Generate AI driven insights to uncover attack protocols, defensive setups, pistol strategy, economy management, and counter-strategies',
        },
    ];

    return (
        <div className="mb-24">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-center mb-12"
            >
                <motion.h2 
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-4xl font-bold mb-4"
                    style={{ color: '#ffffff' }}
                >
                    Features
                </motion.h2>
                <motion.p 
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-xl"
                    style={{ color: '#ffffff' }}
                >
                    Explore the features that ValoBrain offers
                </motion.p>
            </motion.div>

            {/* Feature Cards */}
            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="mb-12"
            >
                <div className="grid md:grid-cols-3 gap-4">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 50, scale: 0.8, rotateX: -15 }}
                            whileInView={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ 
                                duration: 0.7, 
                                delay: index * 0.15,
                                ease: [0.25, 0.46, 0.45, 0.94]
                            }}
                            whileHover={{ 
                                scale: 1.05, 
                                y: -8,
                                transition: { duration: 0.3 }
                            }}
                        >
                            <button
                                onClick={() => {
                                    const firstImageIndex = imageToFeatureMap.findIndex(f => f === index);
                                    if (firstImageIndex !== -1) {
                                        setCurrentImageIndex(firstImageIndex);
                                        setIsPlaying(false); // Pause when user manually selects
                                    }
                                }}
                                className="w-full backdrop-blur-md bg-white/5 border rounded-lg p-4 hover:bg-white/10 transition-all duration-300 h-40 flex flex-col justify-center"
                                style={{
                                    borderColor: activeFeature === index ? '#7f5af0' : 'rgba(255, 255, 255, 0.1)',
                                    boxShadow: activeFeature === index ? '0 0 0 2px rgba(127, 90, 240, 0.3)' : 'none'
                                }}
                                onMouseEnter={(e) => {
                                    if (activeFeature !== index) e.currentTarget.style.borderColor = '#7f5af0';
                                }}
                                onMouseLeave={(e) => {
                                    if (activeFeature !== index) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                }}
                            >
                                <div className="flex justify-center mb-2 transition-colors"
                                    style={{ color: '#7f5af0' }}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-base font-semibold text-center mb-2" style={{ color: '#ffffff' }}>
                                    {feature.title}
                                </h3>
                                <p className="text-s text-center leading-tight" style={{ color: '#ffffff' }}>
                                    {feature.description}
                                </p>
                            </button>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Preview Image Section with Unified Carousel */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="relative max-w-4xl mx-auto"
            >
                {/* Carousel Container */}
                <div 
                    className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-4 overflow-hidden"
                    role="region"
                    aria-label="Feature screenshots carousel"
                    aria-live="polite"
                >
                    <div className="relative">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentImageIndex}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                                className="relative aspect-video bg-gradient-to-br from-slate-800/50 to-blue-900/30 rounded-xl overflow-hidden border border-white/10"
                            >
                                <img 
                                    src={allImages[currentImageIndex]} 
                                    alt={`${features[activeFeature].title} - ${features[activeFeature].description}`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = '/brain.svg';
                                    }}
                                />
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Bottom Controls - Outside the glass box */}
                <div className="flex justify-center items-center gap-4 mt-6">
                    {/* Dots Indicator */}
                    <div className="flex gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full" role="group" aria-label="Carousel navigation">
                        {allImages.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    setCurrentImageIndex(index);
                                    setIsPlaying(false);
                                }}
                                className="transition-all duration-300 rounded-full focus:outline-none"
                                style={{
                                    backgroundColor: currentImageIndex === index ? '#7f5af0' : 'rgba(255, 255, 255, 0.3)',
                                    width: currentImageIndex === index ? '48px' : '8px',
                                    height: '8px'
                                }}
                                onMouseEnter={(e) => {
                                    if (currentImageIndex !== index) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                                }}
                                onMouseLeave={(e) => {
                                    if (currentImageIndex !== index) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                                }}
                                onFocus={(e) => e.currentTarget.style.boxShadow = '0 0 0 2px #7f5af0'}
                                onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
                                aria-label={`Go to screenshot ${index + 1} of ${allImages.length}`}
                                aria-current={currentImageIndex === index ? "true" : "false"}
                            />
                        ))}
                    </div>

                    {/* Play/Pause Button */}
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="p-3 min-h-[44px] min-w-[44px] backdrop-blur-md text-white rounded-full transition-all duration-300 focus:outline-none"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                        onFocus={(e) => e.currentTarget.style.boxShadow = '0 0 0 2px #7f5af0, 0 0 0 4px rgba(15, 23, 42, 1)'}
                        onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
                        aria-label={isPlaying ? "Pause carousel auto-play" : "Play carousel auto-play"}
                        aria-pressed={isPlaying}
                    >
                        {isPlaying ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default FeaturedCards;