import React from 'react';
import Radium from 'radium';
import Styles from '../styles';

@Radium
class CellWrapper extends React.Component {

  render () {
    return (
      <div
        {...this.props}
        style={[Styles.FullSize, Styles.Unselectable]}>
        {this.props.children}
      </div>
    );
  }
}

export default CellWrapper;
