
import { firestore } from '../util/firebase/firestore';

export const sagaId = 'library';

export function* loadLibrary() {
  firestore.collection('accounts').doc();
}
