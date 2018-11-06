import * as React from 'react';

import './library.scss';

import { sagaId } from '../../saga/library';
import { SagaStarter } from '../../util/saga';

class LibraryComponent extends React.Component {
  render() {
    return (
      <SagaStarter id={sagaId}>
        <div></div>
      </SagaStarter>
    );
  }
}

export const Library = LibraryComponent;
