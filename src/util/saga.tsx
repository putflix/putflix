import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@material-ui/core';
import React, { Component } from 'react';
import { connect } from 'react-redux';

import { startSaga, stopSaga } from '../actions/saga';
import { SagaId } from '../saga';

import { State } from './state';

interface SagaStarterOwnProps {
  id: SagaId;
}

interface SagaStarterStateProps {
  error: Error | null;
  failed: boolean;
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

  handleReloadClick = () => {
    window.location.reload();
  }

  render() {
    const { failed, error, children } = this.props;

    return (
      <>
        {failed && <Dialog open>
          <DialogTitle>Oh no. An error occured!</DialogTitle>
          <DialogContent>
            <Typography color="error">{error && error.message}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleReloadClick}>Reload PutFlix</Button>
          </DialogActions>
        </Dialog>}
        {children}
      </>
    );
  }
}

export const SagaStarter = connect((state: State, ownProps: SagaStarterOwnProps): SagaStarterStateProps => ({
  ...state.sagas[ownProps.id],
}), (dispatch, ownProps: SagaStarterOwnProps): SagaStarterDispatchProps => ({
  startSaga: () => dispatch(startSaga(ownProps.id)),
  stopSaga: () => dispatch(stopSaga(ownProps.id)),
}))(SagaStarterBase);
