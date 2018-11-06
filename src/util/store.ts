import { applyMiddleware, compose, createStore, Store } from "redux";
import { devToolsEnhancer } from "redux-devtools-extension/logOnlyInProduction";
import createSagaMiddleware from "redux-saga";

import { Actions } from "../actions";
import reducer from "../reducers";

import { State } from "./state";

export const sagaMiddleware = createSagaMiddleware();
export const store: Store<State, Actions> = createStore(
  reducer as any,
  compose(
    applyMiddleware(sagaMiddleware),
    devToolsEnhancer({}),
  ),
);
