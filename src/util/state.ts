import { importSaga, SagaId } from '../saga';

export interface AuthState {
  user: firebase.User | null;
  isLoading: boolean;
}

export interface SagaState {
  [k: string]: {
    failed: boolean,
    error: Error | null,
  };
}

export interface State {
  auth: AuthState;
  sagas: SagaState;
}
