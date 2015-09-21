import React from 'react';
import Styles from '../styles';

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

  render () {
    return (
      <div style={Styles.ErrorBox.base}>
        { this._getErrors() }
      </div>
    );
  }

}

ErrorBox.propTypes = {
  errors: React.PropTypes.array.isRequired
};

export default ErrorBox;
