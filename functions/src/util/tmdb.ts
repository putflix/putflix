import * as functions from 'firebase-functions';
import fetch from 'node-fetch';
import { Movie, Season, TvShow } from 'tmdb-typescript-api';
import { URL } from 'url';

const [movieSearch, tvSearch, seasonDetailsBase] = (() => {
    const baseUrl = 'https://api.themoviedb.org/3';

    const seasonDetails = baseUrl + '/tv';

    const search = baseUrl + '/search';
    const movieSearch = search + '/movie';
    const tvSearch = search + '/tv';

    return [movieSearch, tvSearch, seasonDetails];
})();

export function getSeason(showId: number, seasonNumber: number): Promise<Season | null> {
    const url = seasonDetailsBase + `/${showId}/season/${seasonNumber}`;
    return doFetch<Season | null>(url);
}

export function searchMovies(title: string, year?: number): Promise<Movie[]> {
    const url = new URL(movieSearch);
    url.searchParams.append('query', title);
    if (year) {
        url.searchParams.append('year', String(year));
    }

    return doFetch<Movie[]>(url);
}

export function searchShows(title: string): Promise<TvShow[]> {
    const url = new URL(tvSearch);
    url.searchParams.append('query', title);

    return doFetch<TvShow[]>(url);
}

async function doFetch<T>(url: string | URL): Promise<T | null> {
    if (typeof url === 'string') {
        url = new URL(url);
    }
    url.searchParams.append('api_key', functions.config().tmdb.api_key);

    const resp = await fetch(url.toString());
    if (!resp.ok) {
        if (resp.status === 404) {
            console.log(`Got 404 from ${url.toString()}.`);
            return null;
        }
        throw new Error(`Got invalid status code ${resp.status} from tmdb: ${await resp.json()}.`);
    }

    return (await resp.json()).results;
}
