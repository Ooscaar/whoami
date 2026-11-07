import type { ImageMetadata } from "astro";

import andorraForest from "../assets/gallery/2023-andorra-forest.jpg";
import andorraSkiing from "../assets/gallery/2025-andorra-skiing.jpg";
import barcelonaCampNou from "../assets/gallery/2025-barcelona-camp-nou.jpg";
import barcelonaTibidabo from "../assets/gallery/2025-barcelona-tibidabo.jpg";
import tarifaSunset from "../assets/gallery/2021-tarifa-sunset.jpg";
import switzerlandOeschinensee from "../assets/gallery/2023-switzerland-oeschinensee.jpg";
import leuvenSnow from "../assets/gallery/2023-leuven-snow.jpg";
import londonFulham from "../assets/gallery/2025-london-fulham.jpg";
import mallorcaCala from "../assets/gallery/2025-mallorca-cala.jpg";
import madridAtleticoBarcelona from "../assets/gallery/2026-madrid-atletico-barcelona.jpg";

export interface Photo {
  src: ImageMetadata;
  year: number;
  title: string;
  description: string;
}

// To add a photo: drop the file in src/assets/gallery, import it above, and add an entry here.
// Order is by year, newest first (sorted below), so new photos land in the right place.
// Name files year-place-subject in lowercase kebab-case, e.g. 2026-madrid-atletico-barcelona.jpg.
const entries: Photo[] = [
  {
    src: madridAtleticoBarcelona,
    year: 2026,
    title: "Atlético Madrid vs Barcelona",
    description: "Zernio 1M ARR celebration and Atlético Madrid vs Barcelona, Champions League. 2026, Madrid.",
  },
  {
    src: barcelonaTibidabo,
    year: 2025,
    title: "Tibidabo, Barcelona, 2025",
    description: "The Ferris wheel at sunset.",
  },
  {
    src: barcelonaCampNou,
    year: 2025,
    title: "Camp Nou, Barcelona, 2025",
    description: "Barça vs Atlético Madrid under the lights.",
  },
  {
    src: andorraSkiing,
    year: 2025,
    title: "Andorra, 2025",
    description: "On the slopes with my Armadas.",
  },
  {
    src: londonFulham,
    year: 2025,
    title: "London, 2025",
    description: "Parent and child day out at Craven Cottage for a Fulham match.",
  },
  {
    src: mallorcaCala,
    year: 2025,
    title: "Mallorca, 2025",
    description: "Cala ? The name stays a secret.",
  },
  {
    src: switzerlandOeschinensee,
    year: 2023,
    title: "Oeschinensee, Switzerland, 2023",
    description: "A summer day by the lake, below the Blüemlisalp.",
  },
  {
    src: andorraForest,
    year: 2023,
    title: "Andorra, 2023",
    description: "A casual day in the snowy forest.",
  },
  {
    src: leuvenSnow,
    year: 2023,
    title: "Leuven, 2023",
    description: "A snowy day from my Erasmus residence.",
  },
  {
    src: tarifaSunset,
    year: 2021,
    title: "Tarifa, 2021",
    description: "Sunset at Tarifa, heading into the sea with friends.",
  },
];

// Newest first; photos from the same year keep the order they are listed in.
export const photos = entries.toSorted((a, b) => b.year - a.year);
