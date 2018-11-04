import * as fb from 'firebase/app';

import config from '../../firebase.config';

export const firebase = fb.initializeApp(config);
export const firebaseNS = fb;
