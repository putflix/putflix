import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import chunk from 'lodash/chunk';
import request from 'request-promise-native';

import { BadRequestError } from '../util/errors';
import { insertNewFiles } from '../util/internal-queue';
import {
    authenticatedApi,
    PutIoFile,
    PutIoFileType,
    PutIoTransfer,
    TransferStatus,
} from '../util/putio';

interface WebhookQuery {
    uid?: string;
    token?: string;
}

async function listDirectoryRecursive(
    api: ReturnType<typeof authenticatedApi>,
    dirId: number,
): Promise<PutIoFile[]> {
    const folderQueue = [];
    const videoFiles = [];

    const { files }: { files: PutIoFile[] } = await request(
        api.fileListUrl(dirId),
        { json: true },
    );

    for (const f of files) {
        if (f.file_type === PutIoFileType.Folder) {
            folderQueue.push(listDirectoryRecursive(api, f.id));
        } else if (f.file_type === PutIoFileType.Video) {
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
    await insertNewFiles(files, query.uid);
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
