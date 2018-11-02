import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';

import { BadRequestError, NotFoundError } from '../util/errors';
import { db, firestore } from '../util/firestore';
import { QueueStatus } from '../util/types';

interface ScheduleStatusUpdate {
    status?: any;
    id?: string;
}

const getQueueItems = async (req) => {
    const limit = parseInt(req.query.limit) || 1;

    const entries = await db.tmdbQueue
        .where('status', '==', QueueStatus.Waiting)
        .orderBy('last_changed')
        .limit(limit)
        .get();

    entries.forEach(entry => entry.ref.update({status: QueueStatus.Processing}));

    return {
        items: entries.docs.map(entry => ({
            endpoint: `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/fetchMetadata`,
            id: entry.id,
            payload: entry.data().payload,
        })),
    };
}

const setItemStatus = async (req) => {
    const body = req.body as ScheduleStatusUpdate;

    if (!body.id || !body.status) {
        throw new BadRequestError('Missing parameters.');
    }

    const status = parseInt(body.status);

    if (isNaN(status)) {
        throw new BadRequestError('Invalid status.');
    }

    const entryRef = db.tmdbQueueEntry(body.id);

    if (!(await entryRef.get()).exists) {
        throw new NotFoundError('Queue entry not found.');
    }

    if (status < 300) {
        await entryRef.delete();
        return;
    }

    await entryRef.update({
        last_changed: firebase.firestore.Timestamp.now(),
        status: QueueStatus.Errored,
    });
}

export const schedule = functions.https.onRequest(async (req, res) => {
    try {
        if(req.method === 'GET') {
            const result = await getQueueItems(req);
            console.log(result);
            res.json(result);
        } else if(req.method === 'POST') {
            await setItemStatus(req);
            res.status(202).send();
        } else {
            res.status(400).send('Unexpected request method.');
        }
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
