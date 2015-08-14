import React from 'react';
import Radium from 'radium';
import Styles from '../styles';

const style = {
  colBase: {
    padding: '8px',
    margin: 0,
    height: '100%',
    cursor: 'default'
  },
  rowBase: {
    textAlign: 'center',
    display: 'inline-block',
    borderTop: '1px dotted #d1d1d1',
    lineHeight: '30px',
    background: '#F3F3F3',
    fontWeight: 100,
    fontSize: '85%',
    cursor: 'default'
  },
  notSelected : {
    background: '#F3F3F3'
  },
  selected: {
    background: '#DDDDDD'
  },
  highlighted: {
    background: '#FFE135'
  },
  selectedAndHighlighted: {
    background: '#EFDE54'
  }
};

@Radium
class Header extends React.Component {

  render () {
    return (
      <div
        {...this.props}
        style={[
          this.props.isRowHeader ? style.rowBase : style.colBase,
          this.props.isRowHeader ? Styles.FullSize : null,
          Styles.Unselectable,
          (this.props.selected && this.props.highlighted ? style.selectedAndHighlighted :
            this.props.selected ? style.selected :
            this.props.highlighted ? style.highlighted : null)
        ]}>
        {this.props.label}
      </div>
    );
  }

  shouldComponentUpdate (nextProps, nextState) {
    if (this.props.label !== nextProps.label) { return true; }
    if (this.props.selected !== nextProps.selected) { return true; }
    if (this.props.highlighted !== nextProps.highlighted) { return true; }
    if (this.props.isRowHeader !== nextProps.isRowHeader) { return true; }
    return false;
  }

}

Header.propTypes = {
  label: React.PropTypes.string,
  selected: React.PropTypes.bool,
  highlighted: React.PropTypes.bool,
  isRowHeader: React.PropTypes.bool
};

export default Header;
