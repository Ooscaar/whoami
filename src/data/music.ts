export interface Track {
  title: string;
  artist: string;
  /** Spotify, YouTube, Bandcamp… anything. Optional. */
  href?: string;
  /** A short line about why you like it. Optional. */
  note?: string;
}

// To add a song: add an entry here. Newest first.
export const tracks: Track[] = [
  { title: "Song title", artist: "Artist", note: "Why this one matters to me." },
  { title: "Song title", artist: "Artist" },
  { title: "Song title", artist: "Artist", note: "On repeat lately." },
  { title: "Song title", artist: "Artist" },
];
