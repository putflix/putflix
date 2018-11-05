import * as React from 'react';
import { Provider } from 'react-redux';

import { store, sagaMiddleware } from '../../util/store';
import { Login } from '../login/login';
import appSaga from '../../saga';

import './app.scss';

const LoginRoute: any = Login;

sagaMiddleware.run(appSaga);

export const App: React.SFC = () => (
  <Provider store={store}>
    <LoginRoute/>
  </Provider>
);
