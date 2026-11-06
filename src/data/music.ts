import type { ImageMetadata } from "astro";

import cruzCafune from "../assets/music/cruz-cafune.jpg";
import drake from "../assets/music/drake.jpg";
import philCollins from "../assets/music/phil-collins.jpg";
import estopa from "../assets/music/estopa.jpg";

export interface Artist {
  name: string;
  /** A short line about them. */
  note: string;
  image: ImageMetadata;
  /** Photo credit — the images are CC BY-SA from Wikimedia Commons, so they need attribution. */
  credit: { author: string; license: string; href: string };
}

// To add an artist: drop a square photo in src/assets/music, import it above, and add an entry here.
export const artists: Artist[] = [
  {
    name: "Cruz Cafuné",
    note: "rap from the canary islands",
    image: cruzCafune,
    credit: {
      author: "Mordecai30",
      license: "CC BY-SA 4.0",
      href: "https://commons.wikimedia.org/wiki/File:CruzCafun%C3%A9_Cru%C3%AFlla2023.jpg",
    },
  },
  {
    name: "Drake",
    note: "toronto, rap and r&b",
    image: drake,
    credit: {
      author: "GabboT",
      license: "CC BY-SA 2.0",
      href: "https://commons.wikimedia.org/wiki/File:Drake_at_The_Carter_Effect_2017_(36818935200)_(cropped).jpg",
    },
  },
  {
    name: "Phil Collins",
    note: "genesis and the solo years",
    image: philCollins,
    credit: {
      author: "Will Ireland, courtesy of Concord",
      license: "CC BY-SA 4.0",
      href: "https://commons.wikimedia.org/wiki/File:Phil_Collins,_2025_for_%22Eras%22_(cropped).jpg",
    },
  },
  {
    name: "Estopa",
    note: "rumba rock from cornellà",
    image: estopa,
    credit: {
      author: "livepict.com",
      license: "CC BY-SA 3.0",
      href: "https://commons.wikimedia.org/wiki/File:Estopa_2008.06.13_007.jpg",
    },
  },
];
