import { Actions, LOGIN_LOADING_CHANGED, LOGIN_STATE_CHANGED } from '../actions/auth';
import { AuthState } from '../util/state';

export default (state: AuthState = { user: null, isLoading: false }, ac: Actions) => {
  switch (ac.type) {
    case LOGIN_STATE_CHANGED:
      return {
        ...state,
        user: ac.payload,
      };
    case LOGIN_LOADING_CHANGED:
      return {
        ...state,
        isLoading: ac.payload,
      };
    default:
      return state;
  }
};
