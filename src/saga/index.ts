import { take, fork } from 'redux-saga/effects';

import { handleOAuthAndSignIn } from './auth';
import { sagaId as libraryId } from './library';
import { loginStateChanged } from '../actions/auth';

export type SagaIds =
  | typeof libraryId;

export default function* app() {
  while(true) {
    yield fork(handleOAuthAndSignIn);
    const user = yield take(loginStateChanged);
    if (!user) {
      continue;
    }

    break;
  }
}
