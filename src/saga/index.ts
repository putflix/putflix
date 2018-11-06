import { fork, take } from 'redux-saga/effects';

import { loginStateChanged } from '../actions/auth';

import { handleOAuthAndSignIn } from './auth';
import { sagaId as libraryId } from './library';

export type SagaIds =
  | typeof libraryId;

export const importSaga = {
  'library': () => import('./library'),
};

export default function* app() {
  while (true) {
    yield fork(handleOAuthAndSignIn);
    const user = yield take(loginStateChanged);
    if (!user) {
      continue;
    }

    break;
  }
}
