import { wrapAction } from '.';

export type Actions =
  | CheckAuthAction
  | StartLoadingAction
  | StopLoadingAction;

export type CheckAuthAction = ReturnType<typeof loginStateChanged>;
export type StartLoadingAction = ReturnType<typeof startLoading>;
export type StopLoadingAction = ReturnType<typeof stopLoading>;

export const LOGIN_STATE_CHANGED = 'auth/LOGIN_STATE_CHANGED';
export const LOGIN_LOADING_CHANGED = 'auth/LOGIN_LOADING_CHANGED';

export const loginStateChanged = (user: firebase.User | null) => wrapAction({
  type: LOGIN_STATE_CHANGED,
  payload: user,
});

export const startLoading = () => wrapAction({
  type: LOGIN_LOADING_CHANGED,
  payload: true,
});

export const stopLoading = () => wrapAction({
  type: LOGIN_LOADING_CHANGED,
  payload: false,
});
