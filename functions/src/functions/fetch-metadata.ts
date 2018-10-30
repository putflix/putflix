import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import parseTorrentName from 'parse-torrent-name';

import { db, firestore } from '../util/firestore';
import { getSeason, searchMovies, searchShows, TooManyRequestsError } from '../util/tmdb';
import { DedupeEntry, MediaType, SchedulerMeta, TmdbQueueEntry } from '../util/types';

const fetch = async ({account_id, file, key}: TmdbQueueEntry & SchedulerMeta) => {
    // We have not seen this file yet. Parse info from the file name and query TMDb.
    const details = parseTorrentName(file.filename);
    const isTvShow = details.season && details.episode;

    const dedupRef = db.dedupMapping(`${file.crc32}-${file.size}`);

    const batch = firestore.batch();

    if (isTvShow) {
        const [seriesData] = await searchShows(details.title);
        if (!seriesData) {
            console.log(`Could not find ${key} / ${JSON.stringify(details)} on TMDb.`);
            return;
        }

        // We know the TV show, but still lack season / episode info
        console.log(`Got a match for TMDb ID ${seriesData.id} (${seriesData.name} / ${seriesData.first_air_date}). Querying season...`);

        const season = await getSeason(seriesData.id, details.season);
        if (!season) {
            console.log(`Could not find season ${details.season}.`);
            return;
        }

        // tslint:disable-next-line:no-unnecessary-type-assertion
        const { episodes, ...seasonData } = season as any;
        const episode = episodes.find(ep => ep.episode_number === details.episode);

        if (!episode) {
            console.log(`Could not find episode ${details.episode}.`);
            return;
        }

        // Got all the info now, update Firestore...
        console.log(`Found season (${season.season_number}) & episode (${episode.episode_number}). Updating Firestore...`);

        // tslint:disable-next-line:no-unnecessary-type-assertion
        const { crew, guest_stars, ...episodeData } = episode;

        batch.set(db.tmdbSeries.doc(String(seriesData.id)), seriesData);
        batch.set(db.tmdbSeasons.doc(String(seasonData.id)), seasonData);
        batch.set(db.tmdbEpisodes.doc(String(episodeData.id)), episodeData);

        batch.set(dedupRef, {
            type: MediaType.Episode,
            reference: episodeData.id,
            season_reference: seasonData.id,
            series_reference: seriesData.id,
        } as DedupeEntry);
    } else {
        const [movie] = await searchMovies(details.title, details.year);
        if (!movie) {
            console.log(`Could not find ${key} / ${JSON.stringify(details)} on TMDb.`);
            return;
        }

        // We've got the info now, update Firestore
        console.log(`Got a match for TMDb ID ${movie.id} (${movie.title} / ${movie.release_date}). Updating DB...`);

        batch.set(dedupRef, { reference: movie.id, type: MediaType.Movie } as DedupeEntry);
        batch.set(db.tmdbMovies.doc(String(movie.id)), movie);
    }

    await batch.commit();

    /*
     * After the batch, so we can be sure that
     * the new metadata has already been persisted.
     */
    await db.user(account_id).indexingQueueEntry(String(file.putio_id)).set({
        last_changed: firebase.firestore.Timestamp.now(),
        status: 'waiting',
    });
};

export const fetchMetadata = functions.https.onRequest(async (req, res) => {
    try {
        await fetch(req.body);
        res.status(204).send();
    } catch (err) {
        if(err instanceof TooManyRequestsError) {
            res.status(err.code).set('Retry-After', err.retryAfter).send();
            return;
        }

        let code = 500;
        let msg = "Internal server error.";
        if ("code" in err) {
            code = err.code;
            msg = err.message;
        }
        res.status(code).json({ success: false, msg });

        throw err;
    }
});
