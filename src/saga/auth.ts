import { SagaIterator } from 'redux-saga';
import { call, put } from 'redux-saga/effects';

import { loginStateChanged, startLoading, stopLoading } from '../actions/auth';
import { getUser, handleOAuthLogin } from '../util/firebase/auth';

export function* handleOAuthAndSignIn(): SagaIterator {
  try {
    yield put(startLoading());

    const params = new URLSearchParams(location.search);
    const code = params.get('code');

    if (code) {
      yield call(handleOAuthLogin, code);
    }

    const u: firebase.User | null = yield call(getUser);
    yield put(loginStateChanged(u));
  } finally {
    yield put(stopLoading());
  }
}
