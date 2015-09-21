import React from 'react';
import Styles from '../styles';

class AutoPosition extends React.Component {

  constructor (props) {
    super(props);
    this.state = {
      childBox: null,
      parentBox: null
    };
  }

  _getStyle () {
    const childBox = this.state.childBox;

    if (!childBox) {
      return {
        position: 'absolute',
        left: -1000000
      };
    }

    const anchorBox = this.props.anchorBox;
    const parentBox = this.state.parentBox;
    let left = anchorBox.left - parentBox.left + anchorBox.width;
    let top = anchorBox.top - parentBox.top;

    return {
      position: 'absolute',
      left,
      top
    };
  }

  _getChildren () {
    return (
      <div ref='child' style={ this._getStyle() }>
        { this.props.children }
      </div>
    );
  }

  componentDidMount () {
    window.x = React.findDOMNode(this.refs.child);
    const childBox = React.findDOMNode(this.refs.child).getBoundingClientRect();
    const parentBox = React.findDOMNode(this.refs.base).getBoundingClientRect();
    this.setState({ childBox, parentBox });
  }

  render () {
    return (
      <div ref='base' style={Styles.AutoPosition.base}>
        { this._getChildren() }
      </div>
    );
  }

}

AutoPosition.propTypes = {
  anchorBox: React.PropTypes.object
};

AutoPosition.defaultProps = {
  anchorBox: { width: 0, height: 0, top: 0, left: 0 }
};

export default AutoPosition;
