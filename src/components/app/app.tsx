import * as React from 'react';
import { Provider } from 'react-redux';
import { createMuiTheme, MuiThemeProvider } from '@material-ui/core';
import { yellow } from '@material-ui/core/colors';

import { store, sagaMiddleware } from '../../util/store';
import { Login } from '../login/login';
import appSaga from '../../saga';

import './app.scss';

const LoginRoute: any = Login;

sagaMiddleware.run(appSaga);

const theme = createMuiTheme({
  palette: {
    type: 'dark',
    primary: yellow,
  },
});

export const App: React.SFC = () => (
  <Provider store={store}>
    <MuiThemeProvider theme={theme}>
      <LoginRoute/>
    </MuiThemeProvider>
  </Provider>
);
