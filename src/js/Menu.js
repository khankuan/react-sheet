import React from 'react';
import Styles from '../styles';
import Radium from 'radium';

@Radium
class Menu extends React.Component {

  _getItems () {
    if (!this.props.items) {
      return;
    }

    return this.props.items.filter((item) => {
      return !!item;
    }).map((item, i) => {
      return (
        <div
          key={i}
          style={ Styles.Menu.item }
          onClick={ item.onClick } >
          { item.label }
        </div>
      );
    });
  }

  render () {
    return (
      <div style={ Styles.Menu.base }>
        { this._getItems() }
      </div>
    );
  }
}

Menu.propTypes = {
  items: React.PropTypes.array
};

export default Menu;
