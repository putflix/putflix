import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import ptn from 'parse-torrent-name';

import { firestore } from '../util/firestore';
import { searchMovies } from '../util/tmdb';
import { DedupeEntry, File, IndexingQueueEntry, QueueStatus } from '../util/types';

export const indexFiles = functions.runWith({ memory: '128MB', timeoutSeconds: 60 }).firestore
    .document('/accounts/{accountId}/indexing_queue/{putioId}')
    .onCreate(async (queueSnap, ctx) => {
        console.log(`Processing put.io ID ${queueSnap.id}...`);

        await queueSnap.ref.update({
            last_changed: firebase.firestore.Timestamp.now(),
            status: QueueStatus.Processing,
        } as IndexingQueueEntry);

        const fileSnap = await firestore.collection('accounts')
            .doc(ctx.params.accountId)
            .collection('files')
            .doc(queueSnap.id)
            .get();

        if (!fileSnap.exists) {
            console.error(`Could not find file corresponding to queue entry ${queueSnap.id}.`);
            await queueSnap.ref.delete();
            return;
        }

        const file = fileSnap.data() as File;

        // Check if we have seen this file already

        const dedupId = `${file.crc32}-${file.size}`;
        const dedupRef = firestore.collection('dedup_map')
            .doc(dedupId);
        const dedupSnap = await dedupRef.get()

        if (dedupSnap.exists) {
            // We have seen this file already. Move it to the appropriate location
            // in the DB and remove the queue entry. We're done.

            console.log("We have seen this file already.");

            const { reference } = dedupSnap.data() as DedupeEntry;
            const [type] = reference.split('-', 2);

            const batch = firestore.batch();
            batch.set(
                firestore.collection('accounts')
                    .doc(ctx.params.accountId)
                    .collection(type)
                    .doc(reference),
                file,
            );
            batch.delete(queueSnap.ref);
            batch.delete(fileSnap.ref);
            await batch.commit();

            return;
        }

        console.log("This file is not known yet. Querying TMDb...");

        // We have not seen this file yet. Parse info from the file name and query TMDb.

        const details = ptn(file.filename);
        const isTvShow = details.season && details.episode;

        if (isTvShow) {
            throw new Error("We don't support TV Shows right now.");
        }

        const movies = await searchMovies(details.title, details.year);
        if (!movies.length) {
            console.log(`Could not find ${queueSnap.id} / ${JSON.stringify(details)} on TMDb.`);
            await queueSnap.ref.delete();
        }

        // We've got the info now

        const bestMatch = movies[0];
        const tmdbFirestoreId = `movies-${bestMatch.id}`;

        console.log(`Got a match for ${bestMatch.title} / ${bestMatch.release_date}. Updating DB...`);

        const batch = firestore.batch();
        batch.set(
            firestore.collection('accounts')
                .doc(ctx.params.accountId)
                .collection('movies')
                .doc(tmdbFirestoreId),
            file,
        );
        batch.set(dedupRef, { reference: tmdbFirestoreId });
        batch.set(
            firestore.collection('tmdb_metadata')
                .doc(tmdbFirestoreId),
            bestMatch,
        );

        batch.delete(fileSnap.ref);
        batch.delete(queueSnap.ref);

        await batch.commit();
    });
