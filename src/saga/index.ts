import { sagaMiddleware } from '../util/store';
import { handleOAuthAndSignIn } from './auth';
import { call, take, fork } from 'redux-saga/effects';
import { loginStateChanged } from '../actions/auth';

function* app() {
  while(true) {
    yield fork(handleOAuthAndSignIn);
    const user = yield take(loginStateChanged);
    if (!user) {
      continue;
    }


  }
}

sagaMiddleware.run(app);
