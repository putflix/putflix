import * as firebase from 'firebase-admin';

export type FileMetadata = MovieMetadata;
export type MovieMetadata = { [k: string]: any };
export type SeriesMetadata = MovieMetadata;
export type SeasonMetadata = SeriesMetadata;

export interface DedupeEntry {
    reference: string;
    season_reference?: string;
    series_reference?: string;
    type: MediaType;
}

export interface IndexingQueueEntry {
    last_changed: firebase.firestore.Timestamp;
    status: QueueStatus;
}

export interface Item<M> {
    created_at: firebase.firestore.Timestamp;
    crc32: string;
    filename: string;
    is_mp4_available: boolean;
    mime: string;
    metadata: M;
    putio_id: number;
    size: number;
}

export const enum MediaType {
    Episode = "episode",
    Movie = "movie",
    Season = "season",
    Series = "series",
}

export interface Movie extends Item<MovieMetadata> {}

export const enum QueueStatus {
    Errored = 'errored',
    Processing = 'processing',
    Waiting = 'waiting'
}

export interface Series {
    metadata: SeriesMetadata;
}

export interface Season {
    metadata: SeasonMetadata;
}

export interface UncategorizedFile extends Item<FileMetadata> {}
