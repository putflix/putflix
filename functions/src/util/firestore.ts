import * as firebase from 'firebase-admin';
import { chunk, flatten } from 'lodash';
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