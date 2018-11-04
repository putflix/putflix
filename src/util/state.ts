export interface AuthState {
  user: firebase.User | null;
}

export interface State {
  auth: AuthState;
}
