import { SagaIterator } from 'redux-saga';
import { call, put } from 'redux-saga/effects';
import { navigate } from '@reach/router';

import { loginStateChanged, startLoading, stopLoading } from '../actions/auth';
import { getUser, handleOAuthLogin } from '../util/firebase/auth';

export function* handleOAuthAndSignIn(): SagaIterator {
  try {
    yield put(startLoading());

    const params = new URLSearchParams(location.search);
    const code = params.get('code');

    if (code) {
      yield call(handleOAuthLogin, code);
      yield call(navigate, location.pathname, { replace: true });
    }

    const u: firebase.User | null = yield call(getUser);
    yield put(loginStateChanged(u));
  } finally {
    yield put(stopLoading());
  }
}
