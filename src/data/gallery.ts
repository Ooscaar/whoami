import type { ImageMetadata } from "astro";

import andorraSkiing from "../assets/gallery/2025-andorra-skiing.jpg";
import barcelonaCampNou from "../assets/gallery/2025-barcelona-camp-nou.jpg";
import barcelonaTibidabo from "../assets/gallery/2025-barcelona-tibidabo.jpg";
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
];
