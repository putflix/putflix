import { MediaEntry } from '../util/state';

import { wrapAction } from '.';

export type Actions =
  | SetSeriesAction;

export type SetSeriesAction = ReturnType<typeof setSeries>;

export const SET_SERIES = 'library/SET_SERIES';

export const setSeries = (docs: MediaEntry[]) => wrapAction({
  type: SET_SERIES,
  payload: docs as MediaEntry[],
});
