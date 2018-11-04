import { combineReducers } from 'redux';

import { State } from '../util/state';

import authReducer from './auth';

export default combineReducers<State>({
  auth: authReducer,
});
