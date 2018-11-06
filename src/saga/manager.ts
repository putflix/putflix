import { Task } from 'redux-saga';
import { call, cancel, fork, put, take, takeEvery } from 'redux-saga/effects';

import { LOGIN_STATE_CHANGED } from '../actions/auth';
import { errorSaga, StartSagaAction, StopSagaAction, START_SAGA, STOP_SAGA } from '../actions/saga';
import { getUser } from '../util/firebase/auth';

import { importSaga, SagaId } from '.';

const loadedSagas = new Map<SagaId, Task>();

export function* startSaga({payload: id}: StartSagaAction) {
  if (!(id in importSaga)) {
    return;
  }

  if (loadedSagas.has(id) && !loadedSagas.get(id)!.isCancelled()) {
    console.warn(`Saga ${id} is already running. This is unexpected behavior.`);
    return;
  }

  loadedSagas.set(id, yield fork(sagaRunner, id));
}

function* sagaRunner(id: SagaId) {
  try {
    const user = yield call(getUser);

    if (!user) {
      const u = yield take(LOGIN_STATE_CHANGED);
      if (!u) {
        return;
      }
    }

    const {default: saga} = yield importSaga[id]();
    yield* saga();
  } catch (e) {
    console.error(e);
    yield put(errorSaga(id, e));
  }
}

export function* stopSaga({payload: id}: StopSagaAction) {
  if (!loadedSagas.has(id)) {
    console.warn(`Saga ${id} is already stopped. This is unexpected behavior.`);
    return;
  }

  yield cancel(loadedSagas.get(id)!);
  loadedSagas.delete(id);
}

export function* manageSagas() {
  yield takeEvery(START_SAGA, startSaga);
  yield takeEvery(STOP_SAGA, stopSaga);
}
