import * as React from 'react';

import { putIoAuthorizationUrl } from '../../util/url';
import { Dialog, DialogContent, Button } from '@material-ui/core';

import './login.scss';

const doLogin = () => location.href = putIoAuthorizationUrl

export const Login: React.SFC = () => (
  <Dialog open disableBackdropClick>
    <DialogContent>
      <Button onClick={doLogin} color="primary" variant="contained">Login with put.io</Button>
    </DialogContent>
  </Dialog>
);
