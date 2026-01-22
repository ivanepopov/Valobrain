// Map Images utility
import abyss from '../assets/maps_images/abyss.png';
import ascent from '../assets/maps_images/ascent.png';
import bind from '../assets/maps_images/bind.png';
import breeze from '../assets/maps_images/breeze.png';
import corrode from '../assets/maps_images/corrode.png';
import fracture from '../assets/maps_images/fracture.png';
import haven from '../assets/maps_images/haven.png';
import icebox from '../assets/maps_images/icebox.png';
import lotus from '../assets/maps_images/lotus.png';
import pearl from '../assets/maps_images/pearl.png';
import split from '../assets/maps_images/split.png';
import sunset from '../assets/maps_images/sunset.png';

const mapImages: Record<string, string> = {
    abyss,
    ascent,
    bind,
    breeze,
    corrode,
    fracture,
    haven,
    icebox,
    lotus,
    pearl,
    split,
    sunset,
};

export function getMapImage(mapName: string): string | undefined {
    const normalizedName = mapName.toLowerCase().trim();
    return mapImages[normalizedName];
}
