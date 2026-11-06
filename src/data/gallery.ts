import type { ImageMetadata } from "astro";

import photo1 from "../assets/gallery/photo-1.jpg";
import photo2 from "../assets/gallery/photo-2.jpg";
import photo3 from "../assets/gallery/photo-3.jpg";
import photo4 from "../assets/gallery/photo-4.jpg";
import photo5 from "../assets/gallery/photo-5.jpg";
import photo6 from "../assets/gallery/photo-6.jpg";

export interface Photo {
  src: ImageMetadata;
  title: string;
  description: string;
}

// To add a photo: drop the file in src/assets/gallery, import it above, and add an entry here.
export const photos: Photo[] = [
  { src: photo1, title: "Untitled I", description: "A short description of this photo." },
  { src: photo2, title: "Untitled II", description: "A short description of this photo." },
  { src: photo3, title: "Untitled III", description: "A short description of this photo." },
  { src: photo4, title: "Untitled IV", description: "A short description of this photo." },
  { src: photo5, title: "Untitled V", description: "A short description of this photo." },
  { src: photo6, title: "Untitled VI", description: "A short description of this photo." },
];
