import { wrapAction } from '.';

export type Actions =
  | CheckAuthAction;

export type CheckAuthAction = ReturnType<typeof loginStateChanged>;

export const LOGIN_STATE_CHANGED = 'LOGIN_STATE_CHANGED';

export const loginStateChanged = (user: firebase.User | null) => wrapAction({
  type: LOGIN_STATE_CHANGED,
  payload: user,
});
