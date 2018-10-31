import * as firebase from 'firebase-admin';
import 'firebase-functions';

firebase.initializeApp();

export * from './functions/indexer';
export * from './functions/putio-webhook';
export * from './functions/fetch-metadata';
export * from './functions/schedule';
