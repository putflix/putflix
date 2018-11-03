import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import request from 'request-promise-native';

import { BadRequestError } from '../util/errors';
import { deleteOldFiles, getAllExistingFileIds, insertNewFiles } from '../util/internal-queue';
import {
    authenticatedApi,
    PutIoFileType,
    PutIoSearchResponse,
} from '../util/putio';

interface FullIndexQuery {
    uid?: string;
    token?: string;
}

const indexAccount = async (req: functions.Request, res: functions.Response) => {
    const query = req.query as FullIndexQuery;

    if (!query.uid || !query.token) {
        throw new BadRequestError("Missing query parameters.")
    }

    // Get existing file IDs to do delta calculations
    const existingFileIds = await getAllExistingFileIds(query.uid);

    // Get all video files for the specified token
    const api = authenticatedApi(query.token);
    const { files }: PutIoSearchResponse = await request(api.search(PutIoFileType.Video), { json: true });

    // And write them to Firestore
    await insertNewFiles(files, query.uid, existingFileIds);

    // Remove old files from Firestore
    await deleteOldFiles(files, query.uid, existingFileIds);

    return existingFileIds;
};

export const fullIndex = functions.https.onRequest(async (req, res) => {
    try {
        const result = await indexAccount(req, res);
        res.status(202).json({result});
    } catch (err) {
        let code = 500;
        let msg = "Internal server error.";
        if ('code' in err && err.code > 100 && err.code < 600) {
            code = err.code;
            msg = err.message;
        }
        res.status(code).json({ msg });

        throw err;
    }
});
