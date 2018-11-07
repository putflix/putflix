export const getTmdbImageUrl = (path: string, size: number) =>
  `https://image.tmdb.org/t/p/w${size}${path}`;
