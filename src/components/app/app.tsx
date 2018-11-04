import * as React from 'react';
import { Provider } from 'react-redux';

import '../../saga';
import { store } from '../../util/store';
import { Login } from '../login/login';

import './app.scss';

const LoginRoute: any = Login;

export const App: React.SFC = () => (
  <Provider store={store}>
    <LoginRoute/>
  </Provider>
);
