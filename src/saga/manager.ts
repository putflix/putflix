import { takeEvery } from "redux-saga";

import { START_SAGA, STOP_SAGA } from "../actions/saga";

export function* startSaga() {
  // todo
}

export function stopSaga() {
  // todo
}

export function* manageSagas() {
  yield takeEvery(START_SAGA, startSaga);
  yield takeEvery(STOP_SAGA, stopSaga);
}
