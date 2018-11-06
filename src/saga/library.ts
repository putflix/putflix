
import { eventChannel } from 'redux-saga';
import { call, put, take } from 'redux-saga/effects';

import { setSeries } from '../actions/library';
import { getUser } from '../util/firebase/auth';
import { firestore } from '../util/firebase/firestore';

export const sagaId = 'library';

const refChannel = (
  ref: firebase.firestore.Query | firebase.firestore.CollectionReference,
) => eventChannel(emitter => ref.onSnapshot(emitter));

export default function* loadLibrary() {
  const user: firebase.User | null = yield call(getUser);

  if (!user) {
    return;
  }

  const seriesRef = firestore
    .collection('accounts')
    .doc(user.uid)
    .collection('series');

  const seriesChannel = yield call(refChannel, seriesRef);

  while (true) {
    const snap = yield take(seriesChannel);

    yield put(setSeries(snap.docs.map(d => ({name: d.data().name, id: d.id}))));
  }
}
