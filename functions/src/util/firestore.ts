import * as firebase from 'firebase-admin';

export const firestore = new firebase.firestore.Firestore({
    timestampsInSnapshots: true
});