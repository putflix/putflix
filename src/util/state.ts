export interface AuthState {
  user: firebase.User | null;
  isLoading: boolean;
}

export interface State {
  auth: AuthState;
}
