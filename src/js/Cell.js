import React from 'react';
import Radium from 'radium';
import tinycolor from 'tinycolor2';
import Styles from '../styles';

import { inBetween } from './helper';

@Radium
class Cell extends React.Component {

  /*
    Lifecycle
   */
  constructor (props) {
    super(props);
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

  /**
   * Internal Methods
   */
  _focusInput = () => {
    const node = React.findDOMNode(this.refs.input);
    if (node){
      node.focus();
      node.setSelectionRange(0, node.value.length);
    }
  }

  _commitEdit = () => {
    this.props.onUpdate(this.state.data);
  }

  _revert = () => {
    this.setState({data: this.props.data}, () => {
      this.props.onUpdate(this.props.data, false);
    });
  }

  _getEdges (sel, selected, focused, rowIndex, columnIndex) {
    return {
      left: selected && (Math.min(sel.startCol, sel.endCol) === columnIndex) || focused,
      right: selected && (Math.max(sel.startCol, sel.endCol) === columnIndex) || focused,
      top: selected && (Math.min(sel.startRow, sel.endRow) === rowIndex) || focused,
      bottom: selected && (Math.max(sel.startRow, sel.endRow) === rowIndex) || focused
    };
  }

  /**
   * Handlers
   */
  _handleKeyUp = (e) => {
    if (e.key === 'Enter') {
      this._commitEdit();
    } else if (e.key === 'Escape'){
      this._revert();
    }
  }

  _handleChange = (e) => {
    this.setState({ data: e.target.value });
  }

  _handleOptions = (e) => {
    this.props.onUpdate(e.target.value, false);
  }

  _handleOptionsClick = (e) => {
    React.findDOMNode(this.refs.select).click();
  }

  _handleSelect = (hover) => {
    this.setState({ hoverOptions: hover });
  }


  /*
    Render
   */
  _getOptions () {
    const options = this.props.column.options.map((option, i) => {
      return (
        <option
          key={option}
          value={option}>
          {option}
        </option>
      );
    });

    options.unshift(<option key=' ' value=' ' disabled>Choose below</option>);
    return options;
  }

  _getSelect () {
    if (this.props.column.options){
      return (
        <div style={ [Styles.Unselectable] }>
          <div
            style={ [Styles.Cell.arrow, this.state.hoverOptions ? {opacity: 0.5} : null] }>▼</div>
          <select
            ref='select'
            style={ [Styles.Cell.select] }
            value={' '}
            onChange={ this._handleOptions }
            onMouseEnter={ this._handleSelect.bind(this, true) }
            onMouseLeave={ this._handleSelect.bind(this, false) } >
            { this._getOptions() }
          </select>
        </div>
      );
    }
  }

  getStyle () {
    const sel = this.props.selection;
    const editing = this.props.editing;
    const selected = this.props.selected;
    const focused = this.props.focused;
    const error = this.props.error;
    const rowIndex = this.props.rowIndex;
    const columnIndex = this.props.columnIndex;

    const styles = [Styles.Cell.input];

    if (!editing) {
      styles.push(Styles.Unselectable);
    }

    //  Background color
    const highlightFactor = Styles.Colors.highlightFactor;
    if (selected && error) {
      styles.push({ background: tinycolor
                                .mix(tinycolor(Styles.Colors.danger), tinycolor(Styles.Colors.primary), 30)
                                .setAlpha(highlightFactor).toRgbString() });
    } else if (error) {
      styles.push({ background: tinycolor(Styles.Colors.danger).setAlpha(highlightFactor).toRgbString() });
    } else if (selected) {
      styles.push({ background: tinycolor(Styles.Colors.primary).setAlpha(highlightFactor).toRgbString() });
    }

    //  Edges
    const edges = this._getEdges(sel, selected, focused, rowIndex, columnIndex);

    const prevRowFocused = (sel.startRow === rowIndex - 1) && sel.startCol === columnIndex;
    const prevRowSelected = inBetween(rowIndex - 1, sel.startRow, sel.endRow) &&
                    inBetween(columnIndex, sel.startCol, sel.endCol);
    const hasPrevRow = prevRowSelected && (Math.max(sel.startRow, sel.endRow) === rowIndex - 1) || prevRowFocused;

    const prevColumnFocused = sel.startRow === rowIndex && (sel.startCol === columnIndex - 1);
    const prevColumnSelected = inBetween(rowIndex, sel.startRow, sel.endRow) &&
                    inBetween(columnIndex - 1, sel.startCol, sel.endCol);
    const hasPrevColumn = prevColumnSelected && (Math.max(sel.startCol, sel.endCol) === columnIndex - 1) || prevColumnFocused;

    const px = focused ? 2 : 1;
    const color = Styles.Colors.primary;

    if (edges.left){
      styles.push({paddingLeft: (6 + 1 - px) + 'px', borderLeftWidth: px + 'px', borderLeftColor: color});
    }
    if (edges.right){
      styles.push({paddingRight: (6 - px) + 'px', borderRightWidth: px + 'px', borderRightColor: color});
    }
    if (edges.top){
      styles.push({paddingTop: (4 + 1 - px) + 'px', borderTopWidth: px + 'px', borderTopColor: color});
    }
    if (edges.bottom){
      styles.push({paddingBottom: (4 - px) + 'px', borderBottomWidth: px + 'px', borderBottomColor: color});
    }

    //  Previous edges
    if (hasPrevRow){
      styles.push({paddingTop: (4 + 1) + 'px', borderTopWidth: 0 + 'px'});
    }
    if (hasPrevColumn){
      styles.push({paddingLeft: (6 + 1) + 'px', borderLeftWidth: 0 + 'px'});
    }

    //  Final style before customisation
    return this.props.getStyle ?
      this.props.getStyle(this.props.data,
                          this.props.rowData,
                          this.props.column,
                          { selected, focused, editing, error, selection: sel },
                          styles)
      : styles;
  }


  /**
   * Rendering
   */
  render () {
    return (
      <div
        style={ [Styles.FullSize, Styles.Unselectable] }
        onMouseDown={ this.props.onMouseDown }
        onMouseOver={ this.props.onMouseOver } >
        <input
          ref='input'
          type='text'
          style={ this.getStyle() }
          value={ this.props.editing ? this.state.data : this.props.data}
          onKeyUp={ this._handleKeyUp }
          onChange={ this._handleChange}
          onBlur={ this._commitEdit }
          disabled={ !this.props.editing } />
        { this._getSelect() }
      </div>
    );
  }
}

Cell.propTypes = {
  data: React.PropTypes.any,
  rowData: React.PropTypes.object,
  editing: React.PropTypes.bool,
  selected: React.PropTypes.bool,
  focused: React.PropTypes.bool,
  error: React.PropTypes.string,

  column: React.PropTypes.shape({
    options: React.PropTypes.array
  }),
  selection: React.PropTypes.shape({
    startRow: React.PropTypes.number,
    endRow: React.PropTypes.number,
    startCol: React.PropTypes.number,
    endCol: React.PropTypes.number
  }),
  rowIndex: React.PropTypes.number,
  columnIndex: React.PropTypes.number,

  getStyle: React.PropTypes.func,
  onUpdate: React.PropTypes.func.isRequired,

  onMouseDown: React.PropTypes.func,
  onMouseOver: React.PropTypes.func
};

export default Cell;
