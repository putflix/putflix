import { combineReducers } from "redux";

import { State } from "../util/state";

import authReducer from "./auth";
import sagaReducer from "./sagas";

export default combineReducers<State>({
  auth: authReducer,
  sagas: sagaReducer,
});
