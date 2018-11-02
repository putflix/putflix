import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';

import { db, firestore } from '../util/firestore';
import { DedupeEntry, IndexingQueueEntry, MediaType, QueueStatus, TmdbQueueEntry, UncategorizedFile } from '../util/types';

const indexer = async (
    queueSnap: firebase.firestore.DocumentSnapshot,
    ctx: functions.EventContext,
) => {
    console.log(`Processing put.io ID ${queueSnap.id}...`);

    const queueEntryUpdate = queueSnap.ref.update({
        last_changed: firebase.firestore.Timestamp.now(),
        status: QueueStatus.Processing,
    } as IndexingQueueEntry);
    const fileSnapPromise = db
        .user(ctx.params.accountId)
        .uncategorizedFile(queueSnap.id)
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
    const dedupRef = db.dedupMapping(dedupId);
    const dedupSnap = await dedupRef.get();

    if (dedupSnap.exists) {
        // We have seen this file already. Move it to the appropriate location
        // in the DB and remove the queue entry. We're done.
        const { type, reference, season_reference, series_reference, series_name, season_number, episode_number, name } = dedupSnap.data() as DedupeEntry;
        console.log(`Association ${dedupId} -> ${reference} found.`);

        const batch = firestore.batch();
        const user = db.user(ctx.params.accountId);

        switch (type) {
            case MediaType.Episode:
                if (!season_reference || !series_reference) {
                    throw new Error("Found an episode reference but missing season and series reference.");
                }

                batch.set(user.series(String(series_reference)), { created_at: firebase.firestore.Timestamp.now(), name: series_name }, {merge: true});
                batch.set(user.season(String(season_reference)), { created_at: firebase.firestore.Timestamp.now(), season_number }, {merge: true});
                batch.set(user.episode(String(reference)), { ...file, name, season_number, episode_number }, {merge: true});
                break;
            case MediaType.Movie:
                batch.set(user.movie(String(reference)), { ...file, name }, {merge: true});
                break;
            default:
                throw new Error(`Unknown reference type '${type}'.`);
        }

        batch.delete(queueSnap.ref);
        batch.delete(fileSnap.ref);

        await batch.commit();
        return;
    }

    console.log("This file is not known yet. Adding it to the TMDb queue...");

    await db.tmdbQueue.add({
        last_changed: firebase.firestore.Timestamp.now(),
        status: QueueStatus.Waiting,
        payload: {
            account_id: ctx.params.accountId,
            file,
        },
    } as TmdbQueueEntry);
};

const indexerFuncRef = functions.firestore.document('/accounts/{accountId}/indexing_queue/{putioId}')

export const indexFileCreate = indexerFuncRef
    .onCreate(async (queueSnap, ctx) => {
        try {
            await indexer(queueSnap, ctx);
        } catch (err) {
            await queueSnap.ref.update({
                last_changed: firebase.firestore.Timestamp.now(),
                status: QueueStatus.Errored
            } as Partial<IndexingQueueEntry>);
            throw err;
        }
    });
export const indexFileUpdate = indexerFuncRef
    .onUpdate(async (queueSnap, ctx) => {
        try {
            if (queueSnap.after.data().status === queueSnap.before.data().status ||
                queueSnap.after.data().status !== QueueStatus.Waiting) {
                return;
            }
            await indexer(queueSnap.after, ctx);
        } catch (err) {
            await queueSnap.after.ref.update({
                last_changed: firebase.firestore.Timestamp.now(),
                status: QueueStatus.Errored
            } as Partial<IndexingQueueEntry>);
            throw err;
        }
    });