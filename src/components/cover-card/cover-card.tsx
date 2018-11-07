import { Card, CardActionArea, CardMedia } from '@material-ui/core';
import React from 'react';

import { firestore } from '../../util/firebase/firestore';
import { MediaEntry } from '../../util/state';
import { getTmdbImageUrl } from '../../util/tmdb';

const typeToCollection = {
  'movie': 'tmdb_movies',
  'series': 'tmdb_series',
};

interface CoverCardProps {
  type: 'series' | 'movie';
  media: MediaEntry;
}

interface CoverCardState {
  metadata: any;
}

export default class CoverCard extends React.PureComponent<CoverCardProps, CoverCardState> {
  state = {
    metadata: null as any,
  };

  getTitle() {
    if (!this.state.metadata) {
      return this.props.media.name;
    }

    switch (this.props.type) {
      case 'movie':
        return this.state.metadata.title;
      case 'series':
        return this.state.metadata.name;
    }
  }

  async componentDidMount() {
    const metadata = (await firestore
      .collection(typeToCollection[this.props.type])
      .doc(this.props.media.id)
      .get()).data();

    this.setState({ metadata });
  }

  render() {
    return (<Card raised>
      <CardActionArea>
      <CardMedia
          title={this.getTitle()}
          component="img"
          src={this.state.metadata && getTmdbImageUrl(this.state.metadata.poster_path, 300)}
        />
      </CardActionArea>
    </Card>);
  }
}
