import React, { Component } from 'react';

import { SagaIds } from '../saga';
import { State } from './state';
import { connect } from 'react-redux';
import { startSaga, stopSaga } from '../actions/saga';
import { Dialog, DialogContent, DialogTitle } from '@material-ui/core';

interface SagaStarterOwnProps {
  id: SagaIds;
}

interface SagaStarterStateProps {
  error?: Error;
  failed?: boolean;
}

interface SagaStarterDispatchProps {
  startSaga: () => void;
  stopSaga: () => void;
}

type Props = SagaStarterStateProps & SagaStarterDispatchProps & SagaStarterOwnProps;

class SagaStarterBase extends Component<Props> {
  componentDidMount() {
    this.props.startSaga();
  }

  componentWillUnmount() {
    this.props.stopSaga();
  }

  render() {
    const { failed, error, children } = this.props;

    return (
      <>
        {failed && <Dialog open>
          <DialogTitle>Oh no. An error occured!</DialogTitle>
          <DialogContent>
            {error && error.message}
          </DialogContent>
        </Dialog>}
        {children}
      </>
    )
  }
}

export const SagaStarter = connect((state: State, ownProps: SagaStarterOwnProps): SagaStarterStateProps => ({
  ...state.sagas[ownProps.id],
}), (dispatch, ownProps: SagaStarterOwnProps): SagaStarterDispatchProps => ({
  startSaga: () => dispatch(startSaga(ownProps.id)),
  stopSaga: () => dispatch(stopSaga(ownProps.id)),
}))(SagaStarterBase);
