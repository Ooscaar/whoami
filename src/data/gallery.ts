import type { ImageMetadata } from "astro";

import andorraForest from "../assets/gallery/2023-andorra-forest.jpg";
import andorraSkiing from "../assets/gallery/2025-andorra-skiing.jpg";
import barcelonaCampNou from "../assets/gallery/2025-barcelona-camp-nou.jpg";
import barcelonaTibidabo from "../assets/gallery/2025-barcelona-tibidabo.jpg";
import tarifaSunset from "../assets/gallery/2021-tarifa-sunset.jpg";
import switzerlandOeschinensee from "../assets/gallery/2023-switzerland-oeschinensee.jpg";
import leuvenSnow from "../assets/gallery/2023-leuven-snow.jpg";
import londonFulham from "../assets/gallery/2025-london-fulham.jpg";
import madridAtleticoBarcelona from "../assets/gallery/2026-madrid-atletico-barcelona.jpg";

export interface Photo {
  src: ImageMetadata;
  title: string;
  description: string;
}

// To add a photo: drop the file in src/assets/gallery, import it above, and add an entry here.
// Name files year-place-subject in lowercase kebab-case, e.g. 2026-madrid-atletico-barcelona.jpg.
export const photos: Photo[] = [
  {
    src: madridAtleticoBarcelona,
    title: "Atlético Madrid vs Barcelona",
    description: "Zernio 1M ARR celebration and Atlético Madrid vs Barcelona, Champions League. 2026, Madrid.",
  },
  {
    src: barcelonaTibidabo,
    title: "Tibidabo, Barcelona, 2025",
    description: "The Ferris wheel at sunset.",
  },
  {
    src: barcelonaCampNou,
    title: "Camp Nou, Barcelona, 2025",
    description: "Barça vs Atlético Madrid under the lights.",
  },
  {
    src: andorraSkiing,
    title: "Andorra, 2025",
    description: "On the slopes with my Armadas.",
  },
  {
    src: tarifaSunset,
    title: "Tarifa, 2021",
    description: "Sunset at Tarifa, heading into the sea with friends.",
  },
  {
    src: switzerlandOeschinensee,
    title: "Oeschinensee, Switzerland, 2023",
    description: "A summer day by the lake, below the Blüemlisalp.",
  },
  {
    src: andorraForest,
    title: "Andorra, 2023",
    description: "A casual day in the snowy forest.",
  },
  {
    src: londonFulham,
    title: "London, 2025",
    description: "Parent and child day out at Craven Cottage for a Fulham match.",
  },
  {
    src: leuvenSnow,
    title: "Leuven, 2023",
    description: "A snowy day from my Erasmus residence.",
  },
];
