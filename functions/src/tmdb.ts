import * as functions from 'firebase-functions';
import fetch from 'node-fetch';
import { Movie, TvShow, Season } from 'tmdb-typescript-api';
import { URL } from 'url';

const [movieSearch, tvSearch, seasonDetailsBase] = (() => {
    const baseUrl = new URL("https://api.themoviedb.org/3");

    const seasonDetails = new URL("/tv", baseUrl);

    const search = new URL("/search", baseUrl);
    const movieSearch = new URL("/movie", search);
    const tvSearch = new URL("/tv", search);

    return [movieSearch, tvSearch, seasonDetails]
        .map(url => url.toString());
})();

export function getSeason(showId: number, seasonNumber: number): Promise<Season | null> {
    const url = new URL(`/${showId}/season/${seasonNumber}`, seasonDetailsBase);
    return doFetch<Season | null>(url);
}

export function searchMovies(title: string, year?: number): Promise<Movie[]> {
    const url = new URL(movieSearch);
    url.searchParams.append("query", title);
    if (year) {
        url.searchParams.append("year", String(year));
    }

    return doFetch<Movie[]>(url);
}

export function searchShows(title: string): Promise<TvShow[]> {
    const url = new URL(tvSearch);
    url.searchParams.append("query", title);

    return doFetch<TvShow[]>(url);
}

async function doFetch<T>(url: URL): Promise<T | null> {
    url.searchParams.append("api_key", functions.config().tmdb.api_key);

    const resp = await fetch(url.toString());
    if (!resp.ok) {
        if (resp.status === 404) {
            return null;
        }
        throw new Error(`Got invalid status code ${resp.status} from tmdb: ${await resp.json()}.`);
    }

    return (await resp.json()).results;
}
