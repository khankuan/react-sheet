import React from 'react';
import FixedDataTable from 'fixed-data-table';
import Immutable, { fromJS } from 'immutable';
import Radium from 'radium';
import _ from 'lodash';

import '../sass/index.scss';

const Table = FixedDataTable.Table;
const Column = FixedDataTable.Column;

import Autosize from './Autosize';
import Styles from '../styles';
import RowIndex from './RowIndex';
import ColumnHeader from './ColumnHeader';
import Cell from './Cell';
import validator from './Validator';
import AutoPosition from './AutoPosition';
import ErrorBox from './ErrorBox';
import Menu from './Menu';

import { inBetween, inBetweenArea, isInParent, ignoreKeyCodes, isCommand, isFirefox, isSafari } from './helper';

@Radium
class Sheet extends React.Component {

  /**
   * Lifecycle
   */
  constructor (props) {
    super(props);

    const columns = this._getInitialColumns(props);
    this.state = {
      columnWidthOverrides: {},
      columns,
      data: this._getInitialData(props, columns),
      selection: {},
      showError: null
    };

    this.__dragging = {};

    this.__history = [];
    this.__history.push(this.state.data);
    this.__historyIndex = this.__history.length;
  }

  _getInitialData = (props, columns) => {
    const maxRows = Math.max(props.defaultData.length, props.rowCount);
    let data = _.clone(props.defaultData);
    data[maxRows - 1] = data[maxRows - 1];
    data = data.fill({}, props.defaultData.length, maxRows)
                .map(d => { return { data: d }; });

    data = fromJS(data);
    data = this._dataWithErrors(props.rowValidator, columns, data);

    return data;
  }

  _getInitialColumns = (props) => {
    return props.columns.map((column, i) => {
      const newColumn = {column, __index: i};
      return new Immutable.Map(newColumn);
    });
  }

  componentWillMount () {
    window.addEventListener('mouseup', this._handleGlobalMouseUp);
    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('paste', this._handlePaste);
    window.addEventListener('copy', this._handleCopy);
    window.addEventListener('cut', this._handleCut);
    window.addEventListener('beforecopy', this._preventDefault);
    window.addEventListener('click', this._handleBaseClick);
  }

  componentWillUnmount () {
    window.removeEventListener('mouseup', this._handleGlobalMouseUp);
    window.removeEventListener('keydown', this._handleKeyDown);
    window.removeEventListener('paste', this._handlePaste);
    window.removeEventListener('copy', this._handleCopy);
    window.removeEventListener('cut', this._handleCut);
    window.removeEventListener('beforecopy', this._preventDefault);
    window.removeEventListener('click', this._handleBaseClick);
  }

  componentDidUpdate (prevProps, prevState) {
    const data = this.state.data;
    const previousData = this.__history[this.__historyIndex - 1];
    if (prevState.data !== data && previousData !== data){

      let foundChanges = false;
      for (let i = 0; i < data.size; i++){
        if (data.get(i).get('data') !== previousData.get(i).get('data')){
          foundChanges = true;
          break;
        }
      }

      if (!foundChanges) {
        return;
      }

      this.__history = this.__history.splice(0, this.__historyIndex );
      this.__history.push(this.state.data);
      this.__historyIndex = this.__history.length;
    }
  }

  /**
   * External Methods
   */
  getValidatedData = (cb) => {
    return new Promise((resolve, reject) => {
      const rowValidator = this.props.rowValidator;
      const columns = this.state.columns;

      const errors = [];
      this.state.data.forEach((d, i) => {
        if (d.get('data').size === 0){
          return;
        }

        const error = this._validateRow(rowValidator, columns, d);
        if (error) {
          errors.push({row: i, error});
        }
      });

      if (errors.length > 0) {
        reject(errors);
        return;
      }

      resolve(this.state.data.filter(d => d.get('data').size > 0).map(d => d.get('data')).toJS());
    });
  }


  /**
   * Internal Methods
   */
  _dataWithErrors = (rowValidator, columns, data) => {
    return data.map(row => {
      return row.set('errors', this._validateRow(rowValidator, columns, row));
    });
  }

  _validateRow (rowValidator, columns, row) {
    const errors = {};
    const rowData = row.get('data');

    //  No data
    if (rowData.size === 0){
      return errors;
    }

    //  Per column
    columns.forEach(column => {
      column = column.get('column');
      const error = validator(rowData, rowData.get(column.dataKey), column.required, column.options, column.validator);
      if (error) {
        errors[column.dataKey] = (column.label || column.dataKey) + ': ' + error;
      }
    });

    //  Per row
    if (rowValidator){
      const error = rowValidator(rowData);
      if (error) {
        errors.__row = error;
      }
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  _getDataWithSelection (prevSel, sel) {
    const data = this.state.data;

    return data.withMutations(d => {

      const doneMap = {}; //  cache for intersection

      //  Prev selection cells
      [prevSel, sel].forEach(curSel => {
        const startRow = Math.min(curSel.startRow, curSel.endRow);
        const endRow = Math.min(this.state.data.size - 1, Math.max(curSel.startRow, curSel.endRow) + 1);

        for (let i = startRow; i <= endRow; i++){
          if (doneMap[i]){
            continue;
          }

          const curData = d.get(i).set('selection', sel);
          if (curData !== d.get(i)) {
            d.set(i, curData);
          }

          doneMap[i] = true;
        }
      });

    });
  }

  _getColumnsWithSelection (prevSel, sel) {
    return this.state.columns.map((column, i) => {

      const prevSelected = inBetween(i, prevSel.startCol, prevSel.endCol);
      const selected = inBetween(i, sel.startCol, sel.endCol);
      if (prevSelected !== selected){
        return column.set('__selected', selected);
      } else {
        return column;
      }
    });
  }

  _getRowIndexDataWithSelection (sel) {
    const allSelected = sel.startRow === 0 && sel.endRow === this.state.data.size - 1 &&
                          sel.startCol === 0 && sel.endCol === this.state.columns.length - 1;

    if (!this.state.rowIndexData || this.state.rowIndexData.__allSelected !== allSelected){
      return { __allSelected: allSelected };
    } else {
      return this.state.rowIndexData;
    }
  }

  _setSelectionPoint = (startRow, endRow, startCol, endCol, force) => {
    const prevSelection = this.state.selection;
    const selection = {
      startRow: Math.max(Math.min(startRow, this.props.rowCount - 1), 0),
      endRow: Math.max(Math.min(endRow, this.props.rowCount - 1), 0),
      startCol: Math.max(Math.min(startCol, this.state.columns.length - 1), 0),
      endCol: Math.max(Math.min(endCol, this.state.columns.length - 1), 0)
    };

    if (_.isEqual(selection, this.state.selection) && !force){
      return;
    }

    const data = this._getDataWithSelection(prevSelection, selection);
    const columns = this._getColumnsWithSelection(prevSelection, selection);
    const rowIndexData = this._getRowIndexDataWithSelection(selection);

    this.setState({ selection, columns, rowIndexData, data });
  }

  _setSelectionObject (obj, force) {
    const sel = {};
    _.assign(sel, this.state.selection, obj);
    this._setSelectionPoint(sel.startRow, sel.endRow, sel.startCol, sel.endCol, force);
  }

  _rowGetter = (i) => {
    return this.state.data.get(i);
  }

  _cellDataGetter = (cellKey, row) => {
    return row.get('data').get(cellKey);
  }

  _setEditing = (editing, data) => {
    const sel = this.state.selection;
    if (editing !== !!this.state.editing){
      data = data || this.state.data;

      const prevSel = this.state.editing;
      if (prevSel) {
        const prevEditingRow = data.get(prevSel.startRow).delete('editing');
        data = data.set(prevSel.startRow, prevEditingRow);
      }

      let row = data.get(sel.startRow);
      if (editing) {
        row = row.set('editing', sel.startCol);
      } else {
        row = row.delete('editing');
      }
      data = data.set(sel.startRow, row);
    }

    this.setState({ editing: editing ? sel : null, data });
    if (!editing) {
      setTimeout(this._focusBase, 0);
    }
  }

  _focusBase = () => {
    React.findDOMNode(this.refs.base).focus();
  }

  _focusDummy = () => {
    React.findDOMNode(this.refs.dummy).select();
  }

  _dataToData (data) {
    if (data) {
      return data.map(d => { return new Immutable.Map({ data: d.get('data'), errors: d.get('errors')}); });
    } else {
      return data;
    }
  }

  _getSelectionFromChange (data, newData) {
    let selection = {};

    //  Check row
    for (let i = 0; i <= newData.size; i++){
      //  If start not found and row is different, it means startRow
      if (selection.startRow === undefined && newData.get(i) &&
          newData.get(i).get('data') !== data.get(i).get('data')) {
        selection.startRow = i;
      }

      //  If start found and row is same, or row not found, it means ended
      else if (selection.startRow !== undefined &&
               (!newData.get(i) || newData.get(i).get('data') === data.get(i).get('data'))) {
        selection.endRow = i - 1;
        break;
      }
    }

    //  Check column
    for (let i = selection.startRow; i <= selection.endRow; i++) {

      for (let j = 0; j <= this.state.columns.length; j++){
        const dataKey = this.state.columns[j] ? this.state.columns[j].get('column').dataKey : null;

        //  If start not found and col is different, it means startRow
        if ((selection.startCol === undefined || selection.startCol > j) && newData.get(i) &&
            newData.get(i).get('data').get(dataKey) !== data.get(i).get('data').get(dataKey)) {
          selection.startCol = j;
        }

        //  If start found and col is same, or col not found, it means ended
        else if (selection.startCol !== undefined && (selection.endCol === undefined || selection.endCol < j) &&
                 (!newData.get(i) || newData.get(i).get('data').get(dataKey) === data.get(i).get('data').get(dataKey))) {
          selection.endCol = j - 1;
          break;
        }
      }
    }

    return selection;
  }


  /**
   * Handlers
   */
  _preventDefault = (e) => {
    e.preventDefault();
  }

  _handleResizeColumn = (newColumnWidth, key) => {
    const columnWidthOverrides = {...this.state.columnWidthOverrides};
    columnWidthOverrides[key] = newColumnWidth;
    this.setState({ columnWidthOverrides });
  }

  _handleGlobalMouseDown = (type, selection, e) => {
    if (this.state.editing) {
      setTimeout(() => {
        this.__dragging[type] = true;
        this._setSelectionObject(selection);
        //this._focusBase();
      }, 0);
    } else {
      this.__dragging[type] = true;
      this._setSelectionObject(selection);
      //this._focusBase();
    }
  }

  _handleRowIndexMouseOver = (type, selection, errors, e) => {
    const errorsArr = [];
    for (let key in errors) {
      errorsArr.push(errors[key]);
    }

    this._handleCellMouseEnter(errorsArr, e);
    this._handleGlobalMouseOver(type, selection);
  }

  _handleGlobalMouseOver = (type, selection) => {
    if (this.__dragging[type] && !this.state.editing) {
      this._setSelectionObject(selection);
    }
  }

  _handleGlobalMouseUp = () => {
    this.__dragging = {};
  }

  _handleSelectAll = () => {
    this._setSelectionPoint(0, Math.max(this.state.data.size, this.props.rowCount), 0, this.state.columns.length);
  }

  _handleDataUpdate (rowIndex, dataKey, value){
    let data = this.state.data;
    let row = data.get(rowIndex);

    let rowData = row.get('data');
    if (value){
      row = row.set('data', rowData.set(dataKey, value));
    } else {
      row = row.set('data', rowData.delete(dataKey));
    }

    //  Errors
    row = row.set('errors', this._validateRow(this.props.rowValidator, this.state.columns, row));

    data = data.set(rowIndex, row);
    this._setEditing(false, data);
  }

  _handleKeyDown = (e) => {
    if (!isInParent(e.target, React.findDOMNode(this.refs.base))){
      return;
    }

    //  Arrow events
    const sel = this.state.selection;
    const ctrl = (e.ctrlKey || e.metaKey);
    const editing = this.state.editing;

    if (e.keyCode === 38){
      e.preventDefault();
      if (e.shiftKey){
        this._setSelectionObject({ endRow: ctrl ? 0 : sel.endRow - 1 });
      } else {
        this._setSelectionPoint(sel.startRow - 1, sel.startRow - 1, sel.startCol, sel.startCol);
      }
    }
    else if (e.keyCode === 40){
      e.preventDefault();
      if (e.shiftKey){
        this._setSelectionObject({ endRow: ctrl ? this.props.rowCount : sel.endRow + 1 });
      } else {
        this._setSelectionPoint(sel.startRow + 1, sel.startRow + 1, sel.startCol, sel.startCol);
      }
    }
    else if (e.keyCode === 37 && !editing){
      e.preventDefault();
      if (e.shiftKey){
        this._setSelectionObject({ endCol: ctrl ? 0 : sel.endCol - 1 });
      } else {
        this._setSelectionPoint(sel.startRow, sel.startRow, sel.startCol - 1, sel.startCol - 1);
      }
    }
    else if (e.keyCode === 39 && !editing){
      e.preventDefault();
      if (e.shiftKey){
        this._setSelectionObject({ endCol: ctrl ? this.props.columns.length : sel.endCol + 1 });
      } else {
        this._setSelectionPoint(sel.startRow, sel.startRow, sel.startCol + 1, sel.startCol + 1);
      }
    }
    else if (e.keyCode === 13){
      e.preventDefault();
      this._setSelectionPoint(sel.startRow + 1, sel.startRow + 1, sel.startCol, sel.startCol);
    }
    else if (e.keyCode === 9){
      e.preventDefault();
      if (e.shiftKey){
        this._setSelectionPoint(sel.startRow, sel.startRow, sel.startCol - 1, sel.startCol - 1);
      } else {
        this._setSelectionPoint(sel.startRow, sel.startRow, sel.startCol + 1, sel.startCol + 1);
      }
    }
    else if (e.keyCode === 27 && editing){
      this._setEditing(false);
    }
    else if (!editing && (e.keyCode === 8 || e.keyCode === 46)){
      this._handleDelete(e);
    }
    else if (!editing && e.keyCode === 90 && ctrl){
      if (e.shiftKey) {
        this._handleRedo();
      } else {
        this._handleUndo();
      }
      e.preventDefault();
    }
    else if (ctrl && e.keyCode === 67 && !editing){
      if (isFirefox()){
        this._focusBase();
        //  Force a selection so firefox will trigger oncopy
        const selection = document.getSelection();
        const range = document.createRange();
        range.setStartBefore(React.findDOMNode(this.refs.dummy));
        range.setEndAfter(React.findDOMNode(this.refs.dummy));
        selection.addRange(range);
        setTimeout(() => {
          selection.removeAllRanges();
        });
      }
    }
    else if (ctrl && e.keyCode === 86 && !editing){
      if (isFirefox()) {
        //  Force a selection so firefox will trigger onpaste
        this._focusDummy();
      }
    }
    else if (ctrl && e.keyCode === 65) {
      this._handleSelectAll();
    }
    else if (!ignoreKeyCodes[e.keyCode] && !this.state.editing && !isCommand(e)){
      this._setEditing(true);
    }
    else if (ctrl && !isCommand(e)) {
      //  To focus on input for safari paste event
      if (isSafari()) {
        this._focusBase();
      }
    }
  }

  _handleDoubleClick = (e) => {
    this._setEditing(true);
  }

  _handleUndo = () => {
    if (this.__historyIndex > 1){
      this.__historyIndex--;
      let data = this.__history[this.__historyIndex - 1];
      data = this._dataToData(data);

      const oldData = this.state.data;
      this._setEditing(false, data);
      setTimeout(() => {
        this._setSelectionObject(this._getSelectionFromChange(oldData, data), true);
      }, 0);
    }
  }

  _handleRedo = () => {
    if (this.__historyIndex < this.__history.length){
      this.__historyIndex++;
      let data = this.__history[this.__historyIndex - 1];
      data = this._dataToData(data);

      const oldData = this.state.data;
      this._setEditing(false, data);
      setTimeout(() => {
        this._setSelectionObject(this._getSelectionFromChange(oldData, data), true);
      }, 0);
    }
  }

  _handleDelete = (e) => {
    e.preventDefault();

    let data = this.state.data;
    const sel = this.state.selection;
    const columns = this.state.columns;

    for (let rowI = Math.min(sel.startRow, sel.endRow); rowI <= Math.max(sel.startRow, sel.endRow); rowI++){
      let row = data.get(rowI);
      let rowData = row.get('data');
      for (let colI = Math.min(sel.startCol, sel.endCol); colI <= Math.max(sel.startCol, sel.endCol); colI++){
        const dataKey = columns[colI].get('column').dataKey;
        rowData = rowData.delete(dataKey);
      }
      row = row.set('data', rowData);
      row = row.set('errors', this._validateRow(this.props.rowValidator, columns, row));
      data = data.set(rowI, row);
    }
    this.setState({ data });
  }

  _handleCopy = (e) => {
    if (!isInParent(document.activeElement, React.findDOMNode(this.refs.base)) ||
        this.state.editing){
      return;
    }

    const data = [];
    const sel = this.state.selection;
    const startRow = Math.min(sel.startRow, sel.endRow);
    const endRow = Math.max(sel.startRow, sel.endRow);
    for (let row = startRow; row <= endRow; row++){
      const rowDataRaw = [];
      const rowData = this.state.data.get(row).get('data');

      const startCol = Math.min(sel.startCol, sel.endCol);
      const endCol = Math.max(sel.startCol, sel.endCol);
      for (let col = startCol; col <= endCol; col++){
        const dataKey = this.state.columns[col].get('column').dataKey;
        rowDataRaw.push(rowData.get(dataKey));
      }
      data.push(rowDataRaw.join('\t'));
    }

    e.clipboardData.setData('text/plain', data.join('\n'));
    e.preventDefault();
  }

  _handlePaste = (e) => {
    if (!isInParent(document.activeElement, React.findDOMNode(this.refs.base)) ||
        this.state.editing){
      return;
    }

    e.preventDefault();
    let text = (e.originalEvent || e).clipboardData.getData('text/plain');

    if (text.charCodeAt(text.length - 1) === 65279){
      text = text.substring(0, text.length - 1);
    }

    let rows = text.replace(/\r/g, '\n').split('\n');
    rows = rows.map(row => {
      return row.split('\t');
    });

    let data = this.state.data;
    const sel = this.state.selection;
    const isSingle = rows.length === 1 && rows[0] && rows[0].length === 1;

    const startRow = Math.min(sel.startRow, sel.endRow);
    const endRow = Math.max(sel.startRow, sel.endRow);
    const startCol = Math.min(sel.startCol, sel.endCol);
    const endCol = Math.max(sel.startCol, sel.endCol);

    //  If single cell
    if (isSingle){
      for (let rowI = startRow; rowI <= endRow; rowI++){
        let row = data.get(rowI);
        let rowData = row.get('data');
        for (let colI = startCol; colI <= endCol; colI++){
          const dataKey = this.props.columns[colI].dataKey;
          if (rows[0][0]){
            rowData = rowData.set(dataKey, rows[0][0]);
          } else {
            rowData = rowData.delete(dataKey);
          }
        }
        row = row.set('data', rowData);
        row = row.set('errors', this._validateRow(this.props.rowValidator, this.state.columns, row));
        data = data.set(rowI, row);
      }
    }

    //  If not single cell
    else {
      rows.forEach((r, i) => {
        i += startRow;

        //  Out of bound
        if (i >= this.props.rowCount){
          return;
        }

        let row = data.get(i);
        let rowData = row.get('data');
        r.forEach((value, j) => {
          j += startCol;

          //  Out of bound
          if (j >= this.props.columns.length){
            return;
          }

          const dataKey = this.props.columns[j].dataKey;
          if (value) {
            rowData = rowData.set(dataKey, value);
          } else {
            rowData = rowData.delete(dataKey);
          }
          row = row.set('data', rowData);
          row = row.set('errors', this._validateRow(this.props.rowValidator, this.state.columns, row));
          data = data.set(i, row);
        });
      });
    }

    this.setState({ data });
    if (!isSingle) {
      this._setSelectionPoint(startRow, startRow + rows.length - 1, startCol, startCol + rows[0].length - 1);
    }
  }

  _handleCellMouseEnter = (errors, e) => {
    const cell = e.target.tagName === 'div' ? e.target : e.target.parentNode.parentNode;

    this.setState({
      showError: {
        errors: Array.isArray(errors) ? errors : [errors],
        boundingBox: cell.getBoundingClientRect()
      }
    });
  }

  _handleCellMouseLeave = () => {
    if (this.state.showError) {
      this.setState({ showError: null });
    }
  }

  _handleColumnContextMenu (column, e) {
    e.preventDefault();
    this.setState({
      columnMenu: {
        column,
        position: {left: e.clientX, top: e.clientY}
      }
    });
  }

  _handleRowContextMenu (row, e) {
    this.setState({ rowMenu: {row, e} });
  }

  _handleSelectionContextMenu (selection, e) {
    this.setState({ selectionMenu: {selection, e} });
  }

  _handleBaseClick = (e) => {
    setTimeout(() => {
      //  Reset menus
      if (this.state.columnMenu){
        this.setState({ columnMenu: null });
      }
      if (this.state.rowMenu){
        this.setState({ rowMenu: null });
      }
      if (this.state.selectionMenu){
        this.setState({ selectionMenu: null });
      }
    }, 0);
  }

  _handleSort = (direction) => {

    const column = this.state.columnMenu.column;
    const dataKey = column.get('column').dataKey;

    let data = this.state.data;
    data = data.sort((a, b) => {
      const dataA = a.get('data').get(dataKey);
      const dataB = b.get('data').get(dataKey);

      if (!dataA && !dataB) {
        return b.get('data').size - a.get('data').size;
      }

      if (!dataA) {
        return 1;
      }

      if (!dataB) {
        return -1;
      }

      return dataB > dataA ? -direction : direction;
    });

    this.setState({ data });
  }


  /**
   * Rendering
   */
  __indexHeaderRenderer = (label, cellKey, column, row, width) => {
    return (
      <RowIndex
        selected={ column.__allSelected }
        getStyle={ this.props.getRowHeaderStyle }
        onMouseDown={ this._handleSelectAll } />
    );
  }

  __indexRenderer = (cellData, cellKey, row, rowIndex, column, width) => {
    const selected = inBetween(rowIndex,
                        this.state.selection.startRow,
                        this.state.selection.endRow);

     return (
      <RowIndex
        index={ rowIndex }
        selected={ selected }
        errors={ row.get('errors') }
        getStyle={ this.props.getRowHeaderStyle }
        onMouseDown={ this._handleGlobalMouseDown.bind(this, 'row', {
          startRow: rowIndex,
          endRow: rowIndex,
          startCol: 0,
          endCol: this.state.columns.length
        }) }
        onMouseEnter={ this._handleRowIndexMouseOver.bind(this, 'row', {
          endRow: rowIndex
        }, row.get('errors')) }
        onMouseLeave={ this._handleCellMouseLeave } />
    );
  }

  _headerRenderer = (label, cellKey, column, row, width) => {
    return (
      <ColumnHeader
        column={ column.get('column') }
        selected={ column.get('__selected') }
        getStyle={ this.props.getColumnHeaderStyle }
        onMouseDown={this._handleGlobalMouseDown.bind(this, 'column', {
          startRow: 0,
          endRow: this.state.data.size,
          startCol: column.get('__index'),
          endCol: column.get('__index')
        }) }
        onMouseEnter={ this._handleGlobalMouseOver.bind(this, 'column', {
          endCol: column.get('__index')
        }) }
        onContextMenu={ this._handleColumnContextMenu.bind(this, column) } />
    );
  }

  _cellRenderer = (cellData, cellKey, row, rowIndex, column, width) => {
    const columnData = column.get('column');
    const columnIndex = column.get('__index');
    const sel = row.get('selection') || {};

    const focused = sel.startRow === rowIndex && sel.startCol === columnIndex;
    const selected = inBetweenArea(rowIndex, columnIndex, sel.startRow, sel.endRow, sel.startCol, sel.endCol);

    const prevRowFocused = (sel.startRow === rowIndex - 1) && (sel.startCol === columnIndex);
    const prevRowSelected = inBetweenArea(rowIndex - 1, columnIndex, sel.startRow, sel.endRow, sel.startCol, sel.endCol);
    const hasPrevRow = prevRowSelected && (Math.max(sel.startRow, sel.endRow) === rowIndex - 1) || prevRowFocused;

    const prevColumnFocused = (sel.startRow === rowIndex) && (sel.startCol === columnIndex - 1);
    const prevColumnSelected = inBetweenArea(rowIndex, columnIndex - 1, sel.startRow, sel.endRow, sel.startCol, sel.endCol);
    const hasPrevColumn = prevColumnSelected && (Math.max(sel.startCol, sel.endCol) === columnIndex - 1) || prevColumnFocused;

    const isLeft = Math.min(sel.startCol, sel.endCol) === columnIndex;
    const isRight = Math.max(sel.startCol, sel.endCol) === columnIndex;
    const isTop = Math.min(sel.startRow, sel.endRow) === rowIndex;
    const isBottom = Math.max(sel.startRow, sel.endRow) === rowIndex;

    const errors = row.get('errors') || {};
    const editing = row.get('editing') === columnIndex && focused;

    return (
      <Cell
        data={ (!editing && columnData.formatter) ? columnData.formatter(cellData) : cellData }
        rowData={ row.get('data') }
        editing={ editing }
        focused={ focused }
        selected={ selected }
        hasPrevRow={ hasPrevRow }
        hasPrevColumn={ hasPrevColumn }
        isLeft={ isLeft }
        isRight={ isRight }
        isTop={ isTop }
        isBottom={ isBottom }
        error={ errors[cellKey] }

        column={ columnData }
        selection={ sel }
        rowIndex={ rowIndex }
        columnIndex={ columnIndex }

        getStyle={ this.props.getCellStyle }
        onUpdate={ this._handleDataUpdate.bind(this, rowIndex, cellKey) }

        onMouseDown={this._handleGlobalMouseDown.bind(this, 'cell', {
          startRow: rowIndex,
          endRow: rowIndex,
          startCol: column.get('__index'),
          endCol: column.get('__index')
        }) }
        onMouseOver={this._handleGlobalMouseOver.bind(this, 'cell', {
          endRow: rowIndex,
          endCol: column.get('__index')
        }) }
        onMouseEnter={ errors[cellKey] ? this._handleCellMouseEnter.bind(this, errors[cellKey]) : null }
        onMouseLeave={ this._handleCellMouseLeave }
        onDoubleClick={this._handleDoubleClick} />
    );
  }

  _getColumns () {
    const columns = [];

    //  Index
    columns.push(
      <Column
        key='___index'
        dataKey='___index'
        columnData={this.state.rowIndexData}
        width={10 + 14 * ( this.state.data.size + '').length }
        headerRenderer={ this.__indexHeaderRenderer }
        cellRenderer={ this.__indexRenderer }
        fixed={true} />
    );

    //  Columns
    this.state.columns.forEach((column, i) => {
      const columnData = column.get('column');
      columnData.columnData = column;
      columnData.cellRenderer = this._cellRenderer;
      columnData.headerRenderer = this._headerRenderer;
      columnData.width = this.state.columnWidthOverrides[columnData.dataKey] || columnData.width || 150;
      columnData.allowCellsRecycling = false;
      columnData.isResizable = true;

      //  Last column fills up all the remaining width
      if (i === this.state.columns.length - 1){
        columnData.flexGrow = 1;
      }

      columns.push(
        <Column
          { ...columnData }
          cellDataGetter={ this._cellDataGetter }
          key={ columnData.dataKey } />
      );
    });

    return columns;
  }

  _getErrorPopover () {
    const showError = this.state.showError;
    if (!showError) {
      return;
    }

    return (
      <AutoPosition
        anchorBox={ showError.boundingBox } >
        <ErrorBox errors={ showError.errors } getStyle={ this.props.getCellErrorStyle }/>
      </AutoPosition>
    );
  }

  _getColumnMenu () {
    if (!this.state.columnMenu) {
      return;
    }

    const columnMenu = this.state.columnMenu;

    return (
      <AutoPosition
        anchorBox={ {left: columnMenu.position.left, top: columnMenu.position.top} } >
        <Menu items={[
            {label: 'Sort Asc', onClick: this._handleSort.bind(this, 1) },
            {label: 'Sort Desc', onClick: this._handleSort.bind(this, -1) },
            {label: 'Clear', onClick: this._handleDelete }
          ]} />
      </AutoPosition>
    );
  }

  render () {
    return (
      <div
        ref='base'
        style={ [
          Styles.FullSize,
          Styles.Sheet.base
        ] }
        tabIndex='0'>
        <Autosize>
          <Table
            rowsCount={ this.state.data.size }
            rowGetter={ this._rowGetter }
            onColumnResizeEndCallback={ this._handleResizeColumn }
            isColumnResizing={ false }
            rowHeight={ this.props.rowHeight }
            headerHeight={ this.props.rowHeight }
            width={ 0 }
            height={ 0 } >
            { this._getColumns() }
          </Table>
        </Autosize>
        <input
          ref='dummy'
          type='text'
          style={{display: 'none'}}
          onFocus={ this._preventDefault } />

        { this._getErrorPopover() }
        { this._getColumnMenu() }

      </div>
    );
  }
}

Sheet.propTypes = {
  defaultData: React.PropTypes.array,
  rowCount: React.PropTypes.number,
  columns: React.PropTypes.array.isRequired,
  rowValidator: React.PropTypes.func,
  getCellStyle: React.PropTypes.func,
  getRowHeaderStyle: React.PropTypes.func,
  getColumnHeaderStyle: React.PropTypes.func,
  getCellErrorStyle: React.PropTypes.func,
  rowHeight: React.PropTypes.number
};

Sheet.defaultProps = {
  defaultData: [],
  rowCount: 10,
  rowHeight: 32
};

export default Sheet;