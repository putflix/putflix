import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import request from 'request-promise-native';

import { BadRequestError } from '../util/errors';
import { insertNewFiles } from '../util/firestore';
import {
    authenticatedApi,
    PutIoFile,
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

    // Get all video files for the specified token
    const api = authenticatedApi(query.token);
    const { files }: PutIoSearchResponse = await request(api.search(PutIoFileType.Video), { json: true })

    // And write them to Firestore...
    await insertNewFiles(files, query.uid);
};

export const fullIndex = functions.https.onRequest(async (req, res) => {
    try {
        await indexAccount(req, res);
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
