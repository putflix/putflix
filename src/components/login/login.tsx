import { Button, CircularProgress, Dialog, DialogContent } from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';

import { State } from '../../util/state';
import { putIoAuthorizationUrl } from '../../util/url';

import './login.scss';

const doLogin = () => location.href = putIoAuthorizationUrl;

interface LoginComponentProps {
  isLoading: boolean;
}

const LoginComponent: React.SFC<LoginComponentProps> = ({ isLoading }) => (
  <Dialog open disableBackdropClick>
    <DialogContent>
      {isLoading
        ? <CircularProgress />
        : (
          <Button onClick={doLogin} color='primary' variant='contained'>
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
