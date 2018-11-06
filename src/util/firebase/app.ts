import * as fb from 'firebase/app';

import config from '../../firebase.config';

export interface FirebaseInitOptions {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
}

export const firebase = fb.initializeApp(config);
export const firebaseNS = fb;
