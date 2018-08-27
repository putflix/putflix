import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import chunk from 'lodash/chunk';
import fetch from 'node-fetch';

import { firestore } from '../util/firestore';
import { collect } from '../util/iteration';
import { File, IndexingQueueEntry } from '../util/types';

type FakeBool = 'True' | 'False';

interface PutIoFile {
    content_type: string;
    crc32: string | null;
    created_at: string;
    extension: string | null;
    file_type: 'FOLDER' | 'TEXT' | 'VIDEO' | 'IMAGE';
    first_accessed_at: string | null;
    folder_type: 'REGULAR';
    icon: string;
    id: number;
    is_hidden: boolean;
    is_mp4_available: boolean;
    is_shared: boolean;
    name: string;
    opensubtitles_hash: string | null;
    parent_id: number;
    screenshot: string | null;
    size: number;
}

interface PutIoTransfer {
    callback_url: string;
    completion_percent: number;
    created_at: string;
    created_torrent: FakeBool;
    current_ratio: number;
    download_id: number;
    downloaded: number;
    down_speed: number;
    extract: FakeBool;
    file_id: number;
    finished_at: string;
    id: number;
    is_private: FakeBool;
    name: string;
    percent_done: number;
    peers_connected: number;
    peers_getting_from_us: number;
    peers_sending_to_us: number;
    save_parent_id: number;
    simulated: FakeBool;
    size: number;
    source: string;
    status: 'COMPLETED' | 'DOWNLOADING' | 'IN_QUEUE';
    status_message: string;
    torrent_link: string;
    type: string;
    uploaded: number;
    up_speed: number;
}

const fileUrl = 'https://api.put.io/v2/files/';
const fileListUrl = 'https://api.put.io/v2/files/';

async function* listDirectoryRecursive(dirId: number): AsyncIterable<PutIoFile> {
    const listResp = await fetch(`${fileListUrl}?parent_id=${dirId}`);
    if (!listResp.ok) {
        throw new Error(`Got invalid status code ${listResp.status} from put.io API.`);
    }

    const { files }: { files: PutIoFile[] } = await listResp.json();
    for (const f of files) {
        if (f.file_type === 'FOLDER') {
            yield* listDirectoryRecursive(f.id);
        } else {
            yield f;
        }
    }
}

const webhook = async (req: functions.Request, res: functions.Response) => {
    if (!req.query.account) {
        return res.status(400).json({
            success: false,
            msg: "Missing 'account' query parameter.",
        });
    }

    // First collect the files to be indexed from the put.io API

    const fileResp = await fetch(fileUrl + (req.body as PutIoTransfer).file_id);
    if (!fileResp.ok) {
        throw new Error("Got invalid response from put.io API.");
    }
    const { file }: { file: PutIoFile } = await fileResp.json();

    const files = (file.file_type === 'FOLDER')
        ? await collect(listDirectoryRecursive(file.id))
        : [file];

    // And write them to Firestore...

    const indexableFiles = files.filter(f => f.file_type === 'VIDEO');

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

    return res.json({ success: true });
};

export const putioWebhook = functions.https.onRequest(async (req, res) => {
    try {
        await webhook(req, res);
    } catch (err) {
        res.status(500).json({
            success: false,
            msg: "Internal server error.",
        });

        throw err;
    }
});
