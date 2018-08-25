import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import ptn from 'parse-torrent-name';

import { searchMovies } from './tmdb';
import { File, IndexingQueueEntry, QueueStatus, DedupeEntry } from './types';

functions.runWith({ memory: '128MB', timeoutSeconds: 60 }).firestore
    .document('accounts/{accountId}/indexing_queue')
    .onCreate(async (queueSnap, ctx) => {
        await queueSnap.ref.update({
            last_changed: firebase.firestore.Timestamp.now(),
            status: QueueStatus.Processing,
        } as IndexingQueueEntry);

        const fileSnap = await firebase.firestore()
            .collection('accounts')
            .doc(ctx.params.accountId)
            .collection('files')
            .doc(queueSnap.id)
            .get();
        const file = fileSnap.data() as File;

        // Check if we have seen this file already

        const dedupSnap = await firebase.firestore()
            .collection('dedup_map')
            .doc(`${file.crc32}-${file.size}`)
            .get();

        if (dedupSnap.exists) {
            // We have seen this file already. Move it to the appropriate location
            // in the DB and remove the queue entry. We're done.

            const { reference } = dedupSnap.data() as DedupeEntry;
            const [type] = reference.split('-', 2);

            const batch = firebase.firestore().batch();
            batch.set(
                firebase.firestore()
                    .collection('accounts')
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

        // We have not seen this file yet. Parse info from the file name and query TMDb.

        const details = ptn(file.filename);
        const isTvShow = Boolean(details.season && details.episode);

        if (isTvShow) {
            throw new Error("We don't support TV Shows right now.");
        }

        const movies = await searchMovies(details.title, details.year);
        if (!movies.length) {
            console.log(`Could not find ${queueSnap.id} / ${JSON.stringify(details)} on TMDb.`);
            await queueSnap.ref.delete();
        }

        const bestMatch = movies[0];
        const tmdbFirestoreId = `movies-${bestMatch.id}`;

        const batch = firebase.firestore().batch();
        batch.set(
            firebase.firestore()
                .collection('tmdb_metadata')
                .doc(tmdbFirestoreId),
            bestMatch
        );
        batch.set(
            firebase.firestore()
                .collection('accounts')
                .doc(ctx.params.accountId)
                .collection('movies')
                .doc(tmdbFirestoreId),
            file,
        );
        batch.delete(fileSnap.ref);
        batch.delete(queueSnap.ref);

        await batch.commit();
    });
