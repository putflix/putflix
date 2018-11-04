import * as React from 'react';

import { putIoAuthorizationUrl } from '../../util/url';

import './login.scss';

export const Login: React.SFC = () => (
  <div className="login">
    <h1>Login with put.io</h1>

    <a
      className="btn btn-login"
      href={putIoAuthorizationUrl}
    >
      Login with put.io
    </a>
  </div>
);
