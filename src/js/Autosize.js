import React from 'react';

class Autosize extends React.Component {

  constructor () {
    super();
    this.state = {
      width: 0,
      height: 0
    };
  }

  componentDidMount () {
    this._autosize();
    this._handleWindowResize = this._handleWindowResize.bind(this);
    window.addEventListener('resize', this._handleWindowResize);
  }

  componentWillUnmount () {
    window.removeEventListener('resize', this._handleWindowResize);
  }

  _handleWindowResize () {
    clearTimeout(this._resizeTimeout);
    this._resizeTimeout = setTimeout(() => {
      this._autosize();
    }, 300);
  }

  _autosize () {
    const node = React.findDOMNode(this);
    const box = node.parentNode.getBoundingClientRect();
    this.setState({
      width: box.width,
      height: box.height
    });
  }

  render () {
    if (React.Children.count(this.props.children) > 1) {
      console.warn('AutoSize only works with a single child element.');
    }

    const { width, height } = this.state;
    const child = this.props.children;
    const newChild = React.cloneElement(child, { width, height });
    return newChild;
  }

}

export default Autosize;
