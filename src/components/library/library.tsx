import { Card, CardMedia } from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';

import { sagaId } from '../../saga/library';
import { SagaStarter } from '../../util/saga';
import { LibraryState, State } from '../../util/state';
import CoverCard from '../cover-card/cover-card';

import './library.scss';

type LibraryProps = LibraryState;

class LibraryComponent extends React.Component<LibraryProps> {
  render() {
    return (
      <SagaStarter id={sagaId}>
        <section className="library">
          <div className="cover-grid">
            {this.props.series.map(series => (
              <CoverCard type="series" media={series} key={series.id} />
            ))}
          </div>
        </section>
      </SagaStarter>
    );
  }
}

export const Library = connect((state: State) => state.library)(LibraryComponent);
