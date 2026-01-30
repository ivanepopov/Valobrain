import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type FeaturedImagesCarouselProps = {
    title?: string;
    images?: string[];
    intervalMs?: number;
};

const DEFAULT_IMAGES = [
    "/featured/DSC01465.JPG",
    "/featured/DSC01331.JPG",
    "/featured/DSC01412.JPG",
    "/featured/DSC01201.JPG",
];

const FeaturedImagesCarousel = ({
                                    title = "Showcase",
                                    images,
                                    intervalMs = 3000,
                                }: FeaturedImagesCarouselProps) => {
    const matchImages = useMemo(() => images?.length ? images : DEFAULT_IMAGES, [images]);

    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);

    // Auto-play carousel
    useEffect(() => {
        if (!isPlaying) return;

        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % matchImages.length);
        }, intervalMs);

        return () => clearInterval(timer);
    }, [intervalMs, isPlaying, matchImages.length]);

    // If the images list changes and current index is now out of bounds, reset safely
    useEffect(() => {
        if (currentSlide >= matchImages.length) setCurrentSlide(0);
    }, [currentSlide, matchImages.length]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-24"
        >
            <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-white mb-4">{title}</h2>
            </div>

            <div className="relative max-w-3xl mx-auto">
                {/* Carousel Container */}
                <div className="relative overflow-hidden rounded-3xl backdrop-blur-md bg-white/10 border border-white/10 p-4">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentSlide}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="relative aspect-video"
                        >
                            <img
                                src={matchImages[currentSlide]}
                                alt={`VALORANT Match ${currentSlide + 1}`}
                                className="w-full h-full object-cover rounded-2xl"
                                loading="lazy"
                                onError={(e) => {
                                    // Prevent infinite onError loops (e.g., fallback blocked)
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = "/vite.svg"; // local fallback in /public
                                }}
                            />
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Bottom Controls */}
                <div className="flex justify-center items-center gap-4 mt-6">
                    {/* Dots Indicator */}
                    <div className="flex gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full">
                        {matchImages.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentSlide(index)}
                                className={`transition-all duration-300 rounded-full ${
                                    currentSlide === index
                                        ? "bg-blue-400 w-12 h-2"
                                        : "bg-white/30 hover:bg-white/50 w-2 h-2"
                                }`}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>

                    {/* Play/Pause Button */}
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full transition-all duration-300"
                        aria-label={isPlaying ? "Pause carousel" : "Play carousel"}
                    >
                        {isPlaying ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default FeaturedImagesCarousel;