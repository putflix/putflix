import { Actions } from '../actions';
import { SET_SERIES } from '../actions/library';
import { LibraryState } from '../util/state';

export default (
  state: LibraryState = {
    movies: [],
    series: [],
  },
  ac: Actions,
) => {
  switch (ac.type) {
    case SET_SERIES:
      return {
        ...state,
        series: ac.payload,
      };
    default:
      return state;
  }
};
