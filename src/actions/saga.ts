export type Actions =
  | StartSagaAction
  | StopSagaAction;

export type StartSagaAction = ReturnType<typeof startSaga>;
export type StopSagaAction = ReturnType<typeof stopSaga>;

export const START_SAGA = "saga/START_SAGA";
export const STOP_SAGA = "saga/STOP_SAGA";

export const startSaga = (name: string) => ({
  type: START_SAGA,
  payload: name,
});

export const stopSaga = (name: string) => ({
  type: STOP_SAGA,
  payload: name,
});
