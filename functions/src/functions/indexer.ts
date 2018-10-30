import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import ptn from 'parse-torrent-name';

import { firestore } from '../util/firestore';
import { getSeason, searchMovies, searchShows } from '../util/tmdb';
import { DedupeEntry, IndexingQueueEntry, QueueStatus, UncategorizedFile } from '../util/types';

const indexer = async (queueSnap: firebase.firestore.DocumentSnapshot, ctx: functions.EventContext) => {
    console.log(`Processing put.io ID ${queueSnap.id}...`);

    const queueEntryUpdate = queueSnap.ref.update({
        last_changed: firebase.firestore.Timestamp.now(),
        status: QueueStatus.Processing,
    } as IndexingQueueEntry);
    const fileSnapPromise = firestore.collection('accounts')
        .doc(ctx.params.accountId)
        .collection('files')
        .doc(queueSnap.id)
        .get();

    const [fileSnap] = await Promise.all([
        fileSnapPromise,
        queueEntryUpdate,
    ]);

    if (!fileSnap.exists) {
        console.error(`Could not find file corresponding to queue entry ${queueSnap.id}.`);
        await queueSnap.ref.delete();
        return;
    }

    const file = fileSnap.data() as UncategorizedFile;

    // Check if we have seen this file already

    const dedupId = `${file.crc32}-${file.size}`;
    const dedupRef = firestore.collection('dedup_map').doc(dedupId);
    const dedupSnap = await dedupRef.get()

    if (dedupSnap.exists) {
        // We have seen this file already. Move it to the appropriate location
        // in the DB and remove the queue entry. We're done.

        const { reference, season_reference, series_reference } = dedupSnap.data() as DedupeEntry;
        console.log(`Association ${dedupId} -> ${reference} found.`);
        const [type] = reference.split('-', 2);

        const batch = firestore.batch();

        switch (type) {
            case 'episodes':
                if (!season_reference || !series_reference) {
                    throw new Error("Found an episode reference but missing season and series reference.");
                }

                const seriesRef = firestore.collection('accounts')
                    .doc(ctx.params.accountId)
                    .collection('series')
                    .doc(series_reference);
                const seasonRef = seriesRef.collection('seasons')
                    .doc(season_reference);
                const epRef = seasonRef.collection('episodes')
                    .doc(reference);

                batch.set(seriesRef, { metadata: {} });
                batch.set(seasonRef, { metadata: {} });
                batch.set(epRef, file);
                break;
            case 'movies':
                batch.set(
                    firestore.collection('accounts')
                        .doc(ctx.params.accountId)
                        .collection(type)
                        .doc(reference),
                    file,
                );
                break;
            default:
                throw new Error(`Unknown reference type '${type}'.`);
        }

        batch.delete(queueSnap.ref);
        batch.delete(fileSnap.ref);

        await batch.commit();

        return;
    }

    console.log("This file is not known yet. Parsing filename & querying TMDb...");

    // We have not seen this file yet. Parse info from the file name and query TMDb.

    const details = ptn(file.filename);
    const isTvShow = details.season && details.episode;

    const batch = firestore.batch();
    batch.delete(fileSnap.ref);
    batch.delete(queueSnap.ref);

    if (isTvShow) {
        const shows = await searchShows(details.title);
        if (!shows.length) {
            console.log(`Could not find ${queueSnap.id} / ${JSON.stringify(details)} on TMDb.`);
            await queueSnap.ref.delete();
            return;
        }

        // We know the TV show, but still lack season / episode info

        const bestMatch = shows[0];
        const seriesFbId = `series-${bestMatch.id}`;

        console.log(`Got a match for TMDb ID ${bestMatch.id} (${bestMatch.name} / ${bestMatch.first_air_date}). Querying season...`);

        const season = await getSeason(bestMatch.id, details.season);
        if (!season) {
            console.log(`Could not find season ${details.season}.`);
            await queueSnap.ref.delete();
            return;
        }

        // Got the season now, now try to find the appropriate episode

        const seasonFbId = `seasons-${season.id}`;
        // tslint:disable-next-line:no-unnecessary-type-assertion
        const { episodes, ...seasonData } = season as any;
        const episode = episodes.find(ep => ep.episode_number === details.episode);

        if (!episode) {
            console.log(`Could not find episode ${details.episode}.`);
            await queueSnap.ref.delete();
            return;
        }

        // Got all the info now, update Firestore...

        console.log(`Found season (${season.season_number}) & episode (${episode.episode_number}). Updating Firestore...`);

        // tslint:disable-next-line:no-unnecessary-type-assertion
        const { crew, guest_stars, ...episodeData } = episode as any;
        const episodeFbId = `episodes-${episode.id}`;

        const metaCollection = firestore.collection('tmdb_metadata');
        const dedupRef = firestore.collection('dedup_map')
            .doc(`${file.crc32}-${file.size}`);
        const seriesRef = firestore.collection('accounts')
            .doc(ctx.params.accountId)
            .collection('series')
            .doc(seriesFbId);
        const seasonRef = seriesRef.collection('seasons')
            .doc(seasonFbId);
        const epRef = seasonRef.collection('episodes')
            .doc(episodeFbId);

        batch.set(metaCollection.doc(seriesFbId), bestMatch);
        batch.set(metaCollection.doc(seasonFbId), seasonData);
        batch.set(metaCollection.doc(episodeFbId), episodeData);
        batch.set(dedupRef, {
            reference: episodeFbId,
            season_reference: seasonFbId,
            series_reference: seriesFbId,
        } as DedupeEntry);
        batch.set(seriesRef, { metadata: {} });
        batch.set(seasonRef, { metadata: {} });
        batch.set(epRef, file);
    } else {
        const movies = await searchMovies(details.title, details.year);
        if (!movies.length) {
            console.log(`Could not find ${queueSnap.id} / ${JSON.stringify(details)} on TMDb.`);
            await queueSnap.ref.delete();
            return;
        }

        // We've got the info now, update Firestore

        const bestMatch = movies[0];
        const tmdbFirestoreId = `movies-${bestMatch.id}`;

        console.log(`Got a match for TMDb ID ${bestMatch.id} (${bestMatch.title} / ${bestMatch.release_date}). Updating DB...`);

        const movieRef = firestore.collection('accounts')
            .doc(ctx.params.accountId)
            .collection('movies')
            .doc(tmdbFirestoreId);
        const metadataRef = firestore.collection('tmdb_metadata')
            .doc(tmdbFirestoreId);

        batch.set(movieRef, file);
        batch.set(dedupRef, { reference: tmdbFirestoreId } as DedupeEntry);
        batch.set(metadataRef, bestMatch);
    }

    await batch.commit();
};

export const indexFiles = functions.runWith({ memory: '128MB', timeoutSeconds: 60 }).firestore
    .document('/accounts/{accountId}/indexing_queue/{putioId}')
    .onCreate(async (queueSnap, ctx) => {
        try {
            await indexer(queueSnap, ctx);
        } catch (err) {
            await queueSnap.ref.update({ status: QueueStatus.Errored } as Partial<IndexingQueueEntry>);
            throw err;
        }
    });
