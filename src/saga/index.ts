import { cancel, fork, take } from 'redux-saga/effects';

import { loginStateChanged, LOGIN_STATE_CHANGED } from '../actions/auth';

import { handleOAuthAndSignIn } from './auth';
import { sagaId as libraryId } from './library';
import { manageSagas } from './manager';

export type SagaId = keyof typeof importSaga;

export const importSaga = {
  [libraryId]: () => import('./library'),
};

export default function* app() {
  const manager = yield fork(manageSagas);

  while (true) {
    yield fork(handleOAuthAndSignIn);
    const loginUser = yield take(LOGIN_STATE_CHANGED);
    if (!loginUser) {
      break;
    }

    const logoutUser = yield take(LOGIN_STATE_CHANGED);
    if (!logoutUser) {
      yield cancel(manager);
    }
  }
}
