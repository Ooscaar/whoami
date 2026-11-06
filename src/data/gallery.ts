import type { ImageMetadata } from "astro";

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
];
