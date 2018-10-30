import * as functions from 'firebase-functions';
import request from 'request-promise-native';

import {StatusCodeError} from 'request-promise-native/errors';

import { Movie, Season, TvShow } from 'tmdb-typescript-api';
import { URL } from 'url';
import { TooManyRequestsError } from './errors';

const [movieSearch, tvSearch, seasonDetailsBase] = (() => {
    const baseUrl = 'https://api.themoviedb.org/3';

    const seasonDetails = baseUrl + '/tv';

    const search = baseUrl + '/search';
    const movieSearch = search + '/movie';
    const tvSearch = search + '/tv';

    return [movieSearch, tvSearch, seasonDetails];
})();

export async function getSeason(showId: number, seasonNumber: number): Promise<Season | null> {
    const url = new URL(seasonDetailsBase + `/${showId}/season/${seasonNumber}`);
    return doFetch<Season>(url.toString());
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

    try {
        return await request(url.toString(), { json: true });
    } catch(e) {
        if(e instanceof StatusCodeError) {
            switch(e.statusCode) {
                case 429:
                    const retryAfter = Number(e.response.headers['Retry-After']);
                    throw new TooManyRequestsError(retryAfter);
                case 404:
                    console.log(`Got 404 from ${url.toString()}.`);
                    return null;
            }
        }

        throw e;
    }
}