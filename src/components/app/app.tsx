import * as React from 'react';
import { Provider } from 'react-redux';
import { MuiThemeProvider } from '@material-ui/core';

import { store, sagaMiddleware } from '../../util/store';
import theme from '../../theme';
import { Login } from '../login/login';
import appSaga from '../../saga';

import './app.scss';

const LoginRoute: any = Login;

sagaMiddleware.run(appSaga);

export const App: React.SFC = () => (
  <Provider store={store}>
    <MuiThemeProvider theme={theme}>
      <LoginRoute/>
    </MuiThemeProvider>
  </Provider>
);
