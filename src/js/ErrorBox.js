import React from 'react';
import Styles from '../styles';
import Radium from 'radium';

@Radium
class ErrorBox extends React.Component {

  _getErrors () {
    const errors = this.props.errors;
    return Object.keys(errors).map((key, i) => {
      return (
        <p key={i}>
          { errors[key] }
        </p>
      );
    });
  }

  _getStyle () {
    let styles = [Styles.ErrorBox.base];

    if (this.props.getStyle) {
      styles = this.props.getStyle(this.props.errors, styles);
    }

    return styles;
  }

  render () {
    return (
      <div style={ this._getStyle() }>
        { this._getErrors() }
      </div>
    );
  }

}

ErrorBox.propTypes = {
  errors: React.PropTypes.array.isRequired,
  getStyle: React.PropTypes.func
};

export default ErrorBox;
