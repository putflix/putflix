import { takeEvery } from 'redux-saga';

import { StartSagaAction, START_SAGA, STOP_SAGA } from '../actions/saga';

export function* startSaga({payload}: StartSagaAction) {

}

export function stopSaga() {
  // todo
}

export function* manageSagas() {
  yield takeEvery(START_SAGA, startSaga);
  yield takeEvery(STOP_SAGA, stopSaga);
}
