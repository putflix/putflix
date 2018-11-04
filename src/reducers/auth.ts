import { Actions, LOGIN_STATE_CHANGED } from '../actions/auth';
import { AuthState } from '../util/state';

export default (state: AuthState = { user: null }, ac: Actions) => {
  switch (ac.type) {
    case LOGIN_STATE_CHANGED:
      return {
        ...state,
        user: ac.payload,
      };
    default:
      return state;
  }
}
