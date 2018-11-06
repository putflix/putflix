import { SagaId } from '../saga';

import { wrapAction } from '.';

export type Actions =
  | StartSagaAction
  | StopSagaAction
  | ErrorSagaAction;

export type StartSagaAction = ReturnType<typeof startSaga>;
export type StopSagaAction = ReturnType<typeof stopSaga>;
export type ErrorSagaAction = ReturnType<typeof errorSaga>;

export const START_SAGA = 'saga/START_SAGA';
export const STOP_SAGA = 'saga/STOP_SAGA';
export const ERROR_SAGA = 'saga/ERROR_SAGA';

export const startSaga = (id: SagaId) => wrapAction({
  type: START_SAGA,
  payload: id as SagaId,
});

export const stopSaga = (id: SagaId) => wrapAction({
  type: STOP_SAGA,
  payload: id as SagaId,
});

export const errorSaga = (id: SagaId, error: Error) => wrapAction({
  type: ERROR_SAGA,
  payload: {
    id: id as SagaId,
    error: error as Error,
  },
});
