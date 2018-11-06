import { Actions } from '../actions';
import { ERROR_SAGA, START_SAGA } from '../actions/saga';
import { SagaState } from '../util/state';

export default (state: SagaState = {}, ac: Actions) => {
  switch (ac.type) {
    case START_SAGA:
      return {
        ...state,
        [ac.payload]: {
          failed: false,
          error: null,
        },
      };
    case ERROR_SAGA:
      return {
        ...state,
        [ac.payload.id]: {
          failed: true,
          error: ac.payload.error,
        },
      };
    default:
      return state;
  }
};
