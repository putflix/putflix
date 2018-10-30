import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import chunk from 'lodash/chunk';
import request from 'request-promise-native';

import { BadRequestError } from '../util/errors';
import { db, firestore } from '../util/firestore';
import {
    authenticatedApi,
    PutIoFile,
    PutIoFileType,
    PutIoTransfer,
    TransferStatus,
} from '../util/putio';
import { IndexingQueueEntry, UncategorizedFile } from '../util/types';

interface WebhookQuery {
    uid?: string;
    token?: string;
}

async function listDirectoryRecursive(api: ReturnType<typeof authenticatedApi>, dirId: number): Promise<PutIoFile[]> {
    const folderQueue = [];
    const videoFiles = [];

    const { files }: { files: PutIoFile[] } = await request(
        api.fileListUrl(dirId),
        { json: true },
    );

    for(const f of files) {
        if (f.file_type === PutIoFileType.Folder) {
            folderQueue.push(listDirectoryRecursive(api, f.id));
        } else if(f.file_type === PutIoFileType.Video) {
            videoFiles.push(f);
        }
    }

    videoFiles.concat(...await Promise.all(folderQueue));

    return videoFiles;
}

const webhook = async (req: functions.Request, res: functions.Response) => {
    const query = req.query as WebhookQuery;

    if (!query.uid || !query.token) {
        throw new BadRequestError("Missing query parameters.")
    }

    const payload = req.body as PutIoTransfer;

    if (payload.status !== TransferStatus.Completed) {
        return;
    }

    const api = authenticatedApi(query.token);

    // First collect the files to be indexed from the put.io API

    const { file }: { file: PutIoFile } = await request(
        api.fileUrl(payload.file_id),
        { json: true },
    );
    const files = (file.file_type === PutIoFileType.Folder)
        ? await listDirectoryRecursive(api, file.id)
        : [file];

    // And write them to Firestore...
    // Firestore batches can only process up to 500 items at a time, so we chunk
    // the list of files to be indexed and process them in separate batches.
    const firestoreWrites = chunk(files, 250) // Two batch entries per file
        .map(ch => {
            const batch = firestore.batch();
            const user = db.user(query.uid);

            for (const file of ch) {
                const fileIdString = String(file.id);

                batch.set(user.uncategorizedFile(fileIdString), {
                    created_at: firebase.firestore.Timestamp.fromDate(new Date(file.created_at)),
                    crc32: file.crc32,
                    filename: file.name,
                    is_mp4_available: file.is_mp4_available,
                    metadata: {},
                    mime: file.content_type,
                    putio_id: file.id,
                    size: file.size,
                } as UncategorizedFile);
                batch.set(user.indexingQueueEntry(fileIdString), {
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
