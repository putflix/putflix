// tslint:disable:ordered-imports

import { firebase } from './app';
import 'firebase/firestore';

export const firestore = firebase.firestore();
firestore.settings({ timestampsInSnapshots: true });
