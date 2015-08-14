import React from 'react';
import Radium from 'radium';
import Styles from '../styles';

const style = {
  base: {
    paddingLeft: '4px',
    paddingRight: '4px',
    paddingTop: '4px',
    paddingBottom: '4px',
    borderLeft: '1px dotted rgb(218, 218, 218)',
    borderRight: '1px dotted rgb(218, 218, 218)',
    borderTop: '1px dotted rgb(218, 218, 218)',
    borderBottom: '1px dotted rgb(218, 218, 218)',
    width: 'calc(100% - 11px)',
    height: 'calc(100% - 10px)',
    background: 'none',
    cursor: 'default',
    display: 'inline-block'
  },
  selected: {
    background: '#ECF3FF'
  },
  focused: {
    borderLeft: '2px solid rgb(59, 108, 227)',
    borderRight: '2px solid rgb(59, 108, 227)',
    borderTop: '2px solid rgb(59, 108, 227)',
    borderBottom: '2px solid rgb(59, 108, 227)',
    paddingLeft: '3px',
    paddingRight: '3px',
    paddingTop: '3px',
    paddingBottom: '3px'
  },

  edgeLeft: {
    borderLeft: '2px solid rgba(59, 108, 227, 0.3)',
    paddingLeft: '3px'
  },
  edgeRight: {
    borderRight: '2px solid rgba(59, 108, 227, 0.3)',
    paddingRight: '3px'
  },
  edgeTop: {
    borderTop: '2px solid rgba(59, 108, 227, 0.5)',
    paddingTop: '3px'
  },
  edgeBottom: {
    borderBottom: '2px solid rgba(59, 108, 227, 0.5)',
    paddingBottom: '3px'
  },

  editing: {
    paddingLeft: '2px',
    paddingRight: '2px',
    paddingTop: '2px',
    paddingBottom: '2px',
    borderColor: 'rgb(59, 108, 227)',
    borderWidth: '3px'
  },
  invalid: {
    background: '#FFCCCC'
  },
  invalidAndSelect: {
    background: '#F0D6DC'
  },

  select: {
    position: 'absolute',
    right: 0,
    top: 0,
    appearance: 'none',
    WebkitAppearance: 'none',
    background: 'none',
    border: 'none',
    width: '24px',
    height: '100%',
    padding: '4px',
    opacity: 0
  },
  arrow: {
    fontSize: '0.6em',
    opacity: 0.25,
    position: 'absolute',
    right: '6px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none'
  }

};

@Radium
class Cell extends React.Component {

  constructor (props) {
    super();
    this.state = {
      data: props.data
    };
  }

  componentWillReceiveProps (nextProps) {
    const startingEdit = (!this.props.editing && nextProps.editing);
    if (startingEdit){
      this.setState({
        data: nextProps.data
      }, () => {
        this._focusInput();
      });
    }
  }

  componentWillUnmount () {
    if (this.__keyDownListener){
      window.removeEventListener('keydown', this.__keyDownListener, true);
    }
  }

  _handleKeyUp (e) {
    if (e.key === 'Enter') {
      this._commitEdit(true);
    } else if (e.key === 'Escape'){
      this._revert();
    }
  }

  _handleChange (e) {
    this.setState({
      data: e.target.value
    });
  }

  _focusInput (){
    const node = React.findDOMNode(this.refs.input);
    if (node){
      node.focus();
      node.setSelectionRange(0, node.value.length);
    }
  }

  _commitEdit (jumpDown) {
    this.props.onUpdate(this.state.data, jumpDown);
  }

  _revert () {
    this.setState({data: this.props.data}, () => {
      this.props.onUpdate(this.props.data, false);
    });
  }

  _handleOptions (e) {
    this.props.onUpdate(e.target.value, false);
  }

  _getOptions () {
    const options = this.props.options.map((option, i) => {
      return (
        <option
          key={option}
          value={option}>
          {option}
        </option>
      );
    });

    options.unshift(<option key=' ' value=' ' disabled>- Choose -</option>);
    return options;
  }

  _getSelect () {
    if (this.props.options){
      return (
        <div style={[Styles.Unselectable]}>
          <select
            ref='select'
            style={[style.select, Styles.Unselectable]}
            value={' '}
            onChange={this._handleOptions.bind(this)} >
            { this._getOptions() }
          </select>
          <div style={[Styles.Unselectable, style.arrow]}>▼</div>
        </div>
      );
    }
  }

  render () {
    const styles = [style.base, Styles.Unselectable];

    if (this.props.edgeLeft){ styles.push(style.edgeLeft); }
    if (this.props.edgeRight){ styles.push(style.edgeRight); }
    if (this.props.edgeTop){ styles.push(style.edgeTop); }
    if (this.props.edgeBottom){ styles.push(style.edgeBottom); }

    if (this.props.selected){
      styles.push(style.selected);
    }

    if (this.props.focused){
      styles.push(style.focused);
    }

    if (this.props.editing && this.props.focused){
      styles.push(style.editing);
    }

    if (!this.props.valid){
      if (this.props.selected){
        styles.push(style.invalidAndSelect);
      } else {
        styles.push(style.invalid);
      }
    }

    return (
      <div style={[Styles.FullSize, Styles.Unselectable]}>
        <input
          ref='input'
          type='text'
          style={styles}
          value={this.props.editing ? this.state.data : this.props.data}
          onKeyUp={this._handleKeyUp.bind(this)}
          onChange={this._handleChange.bind(this)}
          onBlur={this._commitEdit.bind(this, false)}
          onDoubleClick={this.props.onEdit}
          disabled={!this.props.editing} />
        { this._getSelect() }
      </div>
    );
  }

  shouldComponentUpdate (nextProps, nextState) {
    if (this.props.focused !== nextProps.focused) { return true; }
    if (this.props.selected !== nextProps.selected) { return true; }
    if (this.props.editing !== nextProps.editing) { return true; }
    if (this.props.data !== nextProps.data) { return true; }
    if (this.props.valid !== nextProps.valid) { return true; }
    if (this.props.options !== nextProps.options) { return true; }
    if (this.state.data !== nextState.data) { return true; }

    if (this.props.edgeLeft !== nextProps.edgeLeft) { return true; }
    if (this.props.edgeRight !== nextProps.edgeRight) { return true; }
    if (this.props.edgeTop !== nextProps.edgeTop) { return true; }
    if (this.props.edgeBottom !== nextProps.edgeBottom) { return true; }

    return false;
  }

}

Cell.propTypes = {
  focused: React.PropTypes.bool,
  selected: React.PropTypes.bool,
  editing: React.PropTypes.bool,
  data: React.PropTypes.any,
  onEdit: React.PropTypes.func.isRequired,
  onUpdate: React.PropTypes.func.isRequired,
  valid: React.PropTypes.bool,
  options: React.PropTypes.array,
  edgeLeft: React.PropTypes.bool,
  edgeRight: React.PropTypes.bool,
  edgeTop: React.PropTypes.bool,
  edgeBottom: React.PropTypes.bool
};

export default Cell;
