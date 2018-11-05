import * as React from 'react';

import { putIoAuthorizationUrl } from '../../util/url';
import { Dialog, DialogContent, Button, CircularProgress } from '@material-ui/core';

import './login.scss';
import { State } from '../../util/state';
import { connect } from 'react-redux';

const doLogin = () => location.href = putIoAuthorizationUrl

interface LoginComponentProps {
  isLoading: boolean;
}

const LoginComponent: React.SFC<LoginComponentProps> = ({ isLoading }) => (
  <Dialog open disableBackdropClick>
    <DialogContent>
      {isLoading
        ? <CircularProgress />
        : (
          <Button onClick={doLogin} color="primary" variant="contained">
            Login with put.io
          </Button>
        )
      }
    </DialogContent>
  </Dialog>
);

export const Login = connect((state: State) => ({
  isLoading: state.auth.isLoading,
}))(LoginComponent);
