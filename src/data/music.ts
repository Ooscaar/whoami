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
  /** Favorite song: Apple's official 30-second preview. */
  song: { title: string; preview: string };
  /** Photo credit — the images are from Wikimedia Commons; the CC BY-SA ones need attribution. */
  credit: { author: string; license: string; href: string };
}

// To add an artist: drop a square photo in src/assets/music, import it above, and add an entry here.
// Song previews come from the iTunes Search API (https://itunes.apple.com/search?entity=song&term=…):
// use the track's `previewUrl`.
export const artists: Artist[] = [
  {
    name: "Cruz Cafuné",
    note: "rap from the canary islands",
    image: cruzCafune,
    song: {
      title: "Cangrinaje",
      preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/04/a9/12/04a912f9-ab13-151d-14fb-51bd28abe967/mzaf_2074301044289205018.plus.aac.p.m4a",
    },
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
    song: {
      title: "Worst Behavior",
      preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/de/6b/e7/de6be7e2-a597-20d8-deed-44e554391651/mzaf_7294144456762347742.plus.aac.p.m4a",
    },
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
    song: {
      title: "Another Day in Paradise",
      preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/b9/90/d2/b990d24f-2025-b714-f1a3-5c6ec22afdb5/mzaf_1078964162181226497.plus.aac.p.m4a",
    },
    credit: {
      author: "Atlantic Records, 1986",
      license: "public domain",
      href: "https://commons.wikimedia.org/wiki/File:Genesis_%22Invisible_Touch%22_Phil_Collins.jpeg",
    },
  },
  {
    name: "Estopa",
    note: "rumba rock from cornellà",
    image: estopa,
    song: {
      title: "Paseo",
      preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/b5/95/0c/b5950cd4-3b67-f66a-b05f-64b235dcd5df/mzaf_15093117827919104157.plus.aac.p.m4a",
    },
    credit: {
      author: "livepict.com",
      license: "CC BY-SA 3.0",
      href: "https://commons.wikimedia.org/wiki/File:Estopa_2008.06.13_007.jpg",
    },
  },
];
