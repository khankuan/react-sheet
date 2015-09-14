import React from 'react';
import Radium from 'radium';
import tinycolor from 'tinycolor2';
import Styles from '../styles';

@Radium
class RowIndex extends React.Component {

  _getStyle = () => {
    const selected = this.props.selected;
    const errors = this.props.errors;
    const hasErrors = errors && errors.length > 0;
    const selectedFactor = this.props.selectedFactor;
    const styles = [Styles.Header];

    //  Background
    if (hasErrors && selected){
      styles.push({ background: tinycolor(Styles.Colors.danger).darken(selectedFactor).toHexString() });
    } else if (hasErrors) {
      styles.push({ background: Styles.Colors.danger });
    } else if (selected) {
      styles.push({ background: tinycolor(Styles.Colors.white).darken(selectedFactor).toHexString() });
    } else {
      styles.push({ background: tinycolor(Styles.Colors.white).darken(selectedFactor / 4).toHexString() });
    }

    return this.props.getStyle ? this.props.getStyle({selected, errors}, styles) : styles;
  }

  render () {
    return (
      <div
        { ...this.props }
        style={ this._getStyle() }>
        { this.props.index == null ? '' : this.props.index + 1 }
      </div>
    );
  }
}

RowIndex.propTypes = {
  index: React.PropTypes.number,
  selected: React.PropTypes.bool,
  errors: React.PropTypes.array,
  getStyle: React.PropTypes.func,

  selectedFactor: React.PropTypes.number
};

RowIndex.defaultProps = {
  selectedFactor: Styles.Colors.selectedFactor
};

export default RowIndex;
