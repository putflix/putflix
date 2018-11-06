import * as React from "react";

import { sagaId } from "../../saga/library";
import { SagaStarter } from "../../util/saga";

import "./library.scss";

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
