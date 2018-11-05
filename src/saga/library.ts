import { call, put } from 'redux-saga/effects';

import { firestore } from '../util/firebase/firestore';
import { sagaMiddleware } from '../util/store';
import { SagaIterator } from 'redux-saga';

export function* loadLibrary() {
  firestore.collection('accounts').doc()
}
