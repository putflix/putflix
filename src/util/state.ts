import { SagaIds } from '../saga';

export interface AuthState {
  user: firebase.User | null;
  isLoading: boolean;
}

export type SagaState = Partial<Map<SagaIds, {
  failed: boolean,
  error: Error | null,
}>>;

export interface State {
  auth: AuthState;
  sagas: SagaState;
}
