import { motion } from "motion/react";

type FeaturedImagesCarouselProps = {
    title?: string;
    images?: string[];
};

const DEFAULT_IMAGES = [
    "/featured/DSC01465.JPG",
    "/featured/DSC01331.JPG",
    "/featured/DSC01412.JPG",
    "/featured/DSC01201.JPG",
];

const FeaturedImagesCarousel = ({
                                    title = "Think Like the Pros",
                                    images,
                                }: FeaturedImagesCarouselProps) => {
    const matchImages = images?.length ? images : DEFAULT_IMAGES;

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

            {/* 2x2 Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
                {matchImages.slice(0, 4).map((image, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="relative overflow-hidden rounded-2xl backdrop-blur-md bg-white/5 border border-white/10"
                    >
                        <div className="relative aspect-video">
                            <img
                                src={image}
                                alt={`Professional VALORANT tournament moment ${index + 1}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = "/vite.svg";
                                }}
                            />
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};

export default FeaturedImagesCarousel;