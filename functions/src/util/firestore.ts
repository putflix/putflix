import * as firebase from 'firebase-admin';
import { chunk } from 'lodash';
import { PutIoFile } from './putio';
import { IndexingQueueEntry, UncategorizedFile } from './types';

export const firestore = new firebase.firestore.Firestore({
    timestampsInSnapshots: true
});

const dbCollections = {
    tmdbMovies: firestore.collection('tmdb_movies'),
    tmdbSeries: firestore.collection('tmdb_series'),
    tmdbSeasons: firestore.collection('tmdb_seasons'),
    tmdbEpisodes: firestore.collection('tmdb_episodes'),
    tmdbQueue: firestore.collection('tmdb_queue'),
    dedupMap: firestore.collection('dedup_map'),
    accounts: firestore.collection('accounts'),
};

const dbSingles = {
    movie: (id: string) => dbCollections.tmdbMovies.doc(id),
    series: (id: string) => dbCollections.tmdbSeries.doc(id),
    season: (id: string) => dbCollections.tmdbSeasons.doc(id),
    episode: (id: string) => dbCollections.tmdbEpisodes.doc(id),
    tmdbQueueEntry: (id: string) => dbCollections.tmdbQueue.doc(id),
    dedupMapping: (id: string) => dbCollections.dedupMap.doc(id),
    account: (putIoAccountId: string) => dbCollections.accounts.doc(putIoAccountId),
    user: (putIoAccountId: string) => {
        const account = dbCollections.accounts.doc(putIoAccountId);
        const collections = {
            moviesCollection: account.collection('movies'),
            seriesCollection: account.collection('series'),
            seasonsCollection: account.collection('seasons'),
            episodesCollection: account.collection('episodes'),
            uncategorizedFiles: account.collection('uncategorized_files'),
            indexingQueue: account.collection('indexing_queue'),
        }
        return {
            ...collections,
            movie: (id: string) => collections.moviesCollection.doc(id),
            series: (id: string) => collections.seriesCollection.doc(id),
            season: (id: string) => collections.seasonsCollection.doc(id),
            episode: (id: string) => collections.episodesCollection.doc(id),
            uncategorizedFile: (putIoFileId: string) => collections.uncategorizedFiles.doc(putIoFileId),
            indexingQueueEntry: (putIoFileId: string) => collections.indexingQueue.doc(putIoFileId),
        };
    },
};

export const db = {
    ...dbCollections,
    ...dbSingles,
};

export const insertNewFiles = async (files: PutIoFile[], uid: string) => {
    // Filter out existing files that have already been scanned and errored
    const existingFiles = await db.user(uid).uncategorizedFiles.get();
    const existingFileIds = existingFiles.docs.map(doc => doc.id);
    const newFiles = files.filter(f => !existingFileIds.includes(String(f.id)));

    // Firestore batches can only process up to 500 items at a time, so we chunk
    // the list of files to be indexed and process them in separate batches.
    const firestoreWrites = chunk(newFiles, 250) // Two batch actions per file
        .map(async ch => {
            const batch = firestore.batch();
            const user = db.user(uid);

            for (const file of ch) {
                const fileIdString = String(file.id);

                batch.set(user.uncategorizedFile(fileIdString), {
                    created_at: firebase.firestore.Timestamp.fromDate(new Date(file.created_at)),
                    crc32: file.crc32,
                    filename: file.name,
                    is_mp4_available: file.is_mp4_available,
                    mime: file.content_type,
                    putio_id: file.id,
                    size: file.size,
                } as UncategorizedFile, { merge: true });
                batch.set(user.indexingQueueEntry(fileIdString), {
                    last_changed: firebase.firestore.Timestamp.now(),
                    status: 'waiting',
                } as IndexingQueueEntry, { merge: true });
            }

            return batch.commit();
        });
    await Promise.all(firestoreWrites);
}