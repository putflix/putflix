import { MuiThemeProvider } from '@material-ui/core';
import { Router, RouteComponentProps } from '@reach/router';
import * as React from 'react';
import { connect, Provider } from 'react-redux';

import appSaga from '../../saga';
import theme from '../../theme';
import { State } from '../../util/state';
import { sagaMiddleware, store } from '../../util/store';
import { Library } from '../library/library';
import { Login } from '../login/login';

import './app.scss';

sagaMiddleware.run(appSaga);

interface LoginOverlayStateProps {
  isLoggedIn: boolean;
}

const withLoginOverlayState = connect((state: State) => ({
  isLoggedIn: !!state.auth.user,
}));
const LoginOverlay = withLoginOverlayState(({ isLoggedIn }: LoginOverlayStateProps) => {
  return isLoggedIn ? null : <Login />;
});

const LibraryRoute: React.ComponentType<RouteComponentProps> = Library as any;

export const App: React.SFC = () => {
  return (
    <Provider store={store}>
      <MuiThemeProvider theme={theme}>
        <LoginOverlay />
        <Router>
          <LibraryRoute path="/" />
        </Router>
      </MuiThemeProvider>
    </Provider>
  );
};
