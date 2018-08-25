import * as firebase from 'firebase-admin';
import 'firebase-functions';

firebase.initializeApp();

export * from './functions/indexer';
