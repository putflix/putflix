import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import parseTorrentName from 'parse-torrent-name';

import { NotFoundError, TooManyRequestsError } from '../util/errors';

import { db, firestore } from '../util/firestore';
import { getSeason, searchMovies, searchShows } from '../util/tmdb';
import { DedupeEntry, MediaType, QueueStatus, TmdbQueueEntry, TmdbQueuePayload } from '../util/types';

const fetch = async ({account_id, file}: TmdbQueuePayload) => {
    // We have not seen this file yet. Parse info from the file name and query TMDb.
    const details = parseTorrentName(file.filename);
    const isTvShow = details.season && details.episode;

    // If we've already fetched metadata for this before, do nothing
    const dedupRef = db.dedupMapping(`${file.crc32}-${file.size}`);
    if ((await dedupRef.get()).exists) {
        return;
    }

    await db.user(account_id).indexingQueueEntry(String(file.putio_id)).update({
        last_changed: firebase.firestore.Timestamp.now(),
        status: QueueStatus.FetchingMetadata,
    });

    const batch = firestore.batch();

    if (isTvShow) {
        const [seriesData] = await searchShows(details.title);
        if (!seriesData) {
            console.log(`Could not find ${JSON.stringify(details)} on TMDb.`);
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
        const { episodes, ...seasonData } = season;
        const episode = episodes.find(ep => ep.episode_number === details.episode);

        if (!episode) {
            console.log(`Could not find episode ${details.episode}.`);
            return;
        }

        // Got all the info now, update Firestore...
        console.log(`Found season (${season.season_number}) & episode (${episode.episode_number}). Updating Firestore...`);

        const { crew, guest_stars, ...episodeData } = episode;

        batch.set(db.tmdbSeries.doc(String(seriesData.id)), seriesData);
        batch.set(db.tmdbSeasons.doc(String(seasonData.id)), seasonData);
        batch.set(db.tmdbEpisodes.doc(String(episodeData.id)), episodeData);

        batch.set(dedupRef, {
            type: MediaType.Episode,
            reference: episodeData.id,
            season_reference: seasonData.id,
            series_reference: seriesData.id,
            name: episodeData.name,
            series_name: seriesData.name,
            season_number: seasonData.season_number,
            episode_number: details.episode,
        } as DedupeEntry);
    } else {
        const [movie] = await searchMovies(details.title, details.year);
        if (!movie) {
            console.log(`Could not find ${JSON.stringify(details)} on TMDb.`);
            return;
        }

        // We've got the info now, update Firestore
        console.log(`Got a match for TMDb ID ${movie.id} (${movie.title} / ${movie.release_date}). Updating DB...`);

        batch.set(dedupRef, {
            reference: movie.id,
            type: MediaType.Movie,
            name: movie.title,
        } as DedupeEntry);
        batch.set(db.tmdbMovies.doc(String(movie.id)), movie);
    }

    await batch.commit();
};

export const fetchMetadata = functions.https.onRequest(async (req, res) => {
    try {
        await fetch(req.body);
        res.status(204).send();

        const {account_id, file} = req.body as TmdbQueuePayload;
        await db.user(account_id).indexingQueueEntry(String(file.putio_id)).update({
            last_changed: firebase.firestore.Timestamp.now(),
            status: QueueStatus.Waiting,
        });
    } catch (err) {
        if(err instanceof TooManyRequestsError) {
            res.set('Retry-After', err.retryAfter).status(err.code).send();
            return;
        }

        let code = 500;
        let msg = "Internal server error.";
        if ("code" in err) {
            code = err.code;
            msg = err.message;
        }
        res.status(code).json({ msg });

        throw err;
    }
});