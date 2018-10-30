import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import chunk from 'lodash/chunk';
import request from 'request-promise-native';

import { firestore } from '../util/firestore';
import { collect } from '../util/iteration';
import {
    fileListUrl,
    fileUrl,
    PutIoFile,
    PutIoFileType,
    PutIoTransfer,
    TransferStatus,
} from '../util/putio';
import { File, IndexingQueueEntry } from '../util/types';

async function* listDirectoryRecursive(dirId: number): AsyncIterable<PutIoFile> {
    const { files }: { files: PutIoFile[] } = await request(fileListUrl(dirId), { json: true });

    for (const f of files) {
        if (f.file_type === PutIoFileType.Folder) {
            yield* listDirectoryRecursive(f.id);
        } else {
            yield f;
        }
    }
}

interface HTTPError {
    code: number
}

class BadRequestError extends Error implements HTTPError {
    get code() {
        return 400;
    }
}

class InternalServerError extends Error implements HTTPError {
    get code() {
        return 500;
    }
}

const webhook = async (req: functions.Request, res: functions.Response) => {
    if (!req.query.account) {
        throw new BadRequestError("Missing 'account' query parameter.")
    }

    const payload = req.body as PutIoTransfer;

    if (payload.status !== TransferStatus.Completed) {
        return;
    }

    // First collect the files to be indexed from the put.io API

    const { file }: { file: PutIoFile } = await request(fileUrl(payload.file_id), { json: true });
    const files = (file.file_type === PutIoFileType.Folder)
        ? await collect(listDirectoryRecursive(file.id))
        : [file];

    // And write them to Firestore...

    const indexableFiles = files.filter(f => f.file_type === PutIoFileType.Video);

    // Firestore batches can only process up to 500 items at a time, so we chunk
    // the list of files to be indexed and process them in separate batches.
    const firestoreWrites = chunk(indexableFiles, 250) // Two batch entries per file
        .map(ch => {
            const batch = firestore.batch();
            const accountRef = firestore.collection('accounts').doc('');

            for (const file of ch) {
                const fileIdString = file.id.toString();

                batch.set(accountRef.collection('files').doc(fileIdString), {
                    created_at: firebase.firestore.Timestamp.fromDate(new Date(file.created_at)),
                    crc32: file.crc32,
                    filename: file.name,
                    is_mp4_available: file.is_mp4_available,
                    metadata: {},
                    mime: file.content_type,
                    putio_id: file.id,
                    size: file.size,
                } as File);
                batch.set(accountRef.collection('indexing_queue').doc(fileIdString), {
                    last_changed: firebase.firestore.Timestamp.now(),
                    status: 'waiting',
                } as IndexingQueueEntry);
            }

            return batch.commit();
        });
    await Promise.all(firestoreWrites);
};

export const putioWebhook = functions.https.onRequest(async (req, res) => {
    try {
        await webhook(req, res);
        res.status(202).send();
    } catch (err) {
        let code = 500;
        let msg = "Internal server error.";
        if ('code' in err) {
            code = err.code;
            msg = err.message;
        }
        res.status(code).json({ msg });

        throw err;
    }
});
