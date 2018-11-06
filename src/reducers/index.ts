import { combineReducers } from 'redux';

import { State } from '../util/state';

import authReducer from './auth';
import libraryReducer from './library';
import sagaReducer from './sagas';

export default combineReducers<State>({
  auth: authReducer,
  library: libraryReducer,
  sagas: sagaReducer,
});
