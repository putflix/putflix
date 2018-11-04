import * as firebase from 'firebase-admin';
import { chunk, flatten } from 'lodash';

import { db, firestore } from './firestore';
import { PutIoFile } from './putio';
import { IndexingQueueEntry, UncategorizedFile } from './types';

export const getAllExistingFileIds = async (uid: string): Promise<number[]> => {
    const [uncategorizedFiles, ...episodesAndMovies] = await Promise.all([
        db.user(uid).uncategorizedFiles.get(),
        db.user(uid).episodesCollection.get(),
        db.user(uid).moviesCollection.get(),
    ]);

    return flatten([
        uncategorizedFiles.docs.map(doc => Number(doc.id)),
        flatten(episodesAndMovies.map(d => d.docs)).map(d => d.data().putio_id),
    ]);
}

export const deleteOldFiles = async (files: PutIoFile[], uid: string, existingFileIds: number[]) => {
    const putFileIds = files.map(f => f.id);
    const deletedFiles = existingFileIds.filter(id => !putFileIds.includes(Number(id)));

    console.log(`Deleting ${deletedFiles.length} old files from Firestore...`);

    const batch = firestore.batch();

    for (const fileId of deletedFiles) {
        const results = await Promise.all([
            db.user(uid).uncategorizedFiles.where('putio_id', '==', fileId).get(),
            db.user(uid).episodesCollection.where('putio_id', '==', fileId).get(),
            db.user(uid).moviesCollection.where('putio_id', '==', fileId).get(),
        ]);

        const refs = flatten(results.map(res => res.docs)).map(doc => doc.ref);

        for (const ref of refs) {
            batch.delete(ref);
        }
    }

    await batch.commit();
}

export const insertNewFiles = async (files: PutIoFile[], uid: string, existingFileIds?: number[]) => {
    // Filter out existing files that have already been scanned and errored
    if (!existingFileIds) {
        existingFileIds = await getAllExistingFileIds(uid);
    }
    const newFiles = files.filter(f => !existingFileIds.includes(f.id));

    console.log(`Adding ${newFiles.length} new files; Skipping ${files.length - newFiles.length} existing files...`);

    // Firestore batches can only process up to 500 items at a time, so we chunk
    // the list of files to be indexed and process them in separate batches.
    const firestoreWrites = chunk(newFiles, 250) // Two batch actions per file
        .map(async ch => {
            const batch = firestore.batch();
            const user = db.user(uid);

            for (const file of ch) {
                const fileIdString = String(file.id);

                batch.set(user.indexingQueueEntry(fileIdString), {
                    last_changed: firebase.firestore.Timestamp.now(),
                    status: 'waiting',
                    payload: {
                        created_at: firebase.firestore.Timestamp.fromDate(new Date(file.created_at)),
                        crc32: file.crc32,
                        filename: file.name,
                        is_mp4_available: file.is_mp4_available,
                        mime: file.content_type,
                        putio_id: file.id,
                        size: file.size,
                    }
                } as IndexingQueueEntry<UncategorizedFile>, { merge: true });
            }

            return batch.commit();
        });
    await Promise.all(firestoreWrites);
}