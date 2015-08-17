import React from 'react';
import FixedDataTable from 'fixed-data-table';
import Immutable from 'immutable';
import Radium from 'radium';

import '../sass/index.scss';

import Cell from './Cell';
import Header from './Header';
import Autosize from './Autosize';
import CellWrapper from './CellWrapper';
import validator from './Validator';
import Styles from '../styles';

const Table = FixedDataTable.Table;
const Column = FixedDataTable.Column;

const ignoreKeyCodes = {
  37: true,
  38: true,
  39: true,
  40: true,
  16: true,
  17: true,
  18: true,
  27: true,
  91: true,
  93: true
};

@Radium
class Sheet extends React.Component {

  constructor (props) {
    super();

    let data = [...props.defaultData];
    while (data.length < props.rowCount){
      data.push({});
    }

    data = data.map(d => {
      return new Immutable.Map(d);
    });

    this.state = {
      columnWidthOverrides: {},
      data: new Immutable.List(data),
      selection: {},
      columnReverseIndex: this._getColumnReverseIndex(props.columns)
    };

    this.__history = [this.state.data];
    this.__historyIndex = 0;

    if (props.window){
      window[props.window] = this;
    }
  }

  componentWillMount () {
    this._handleCellKeyDown = this._handleCellKeyDown.bind(this);
    this._handleWindowMouseUp = this._handleWindowMouseUp.bind(this);
    this._handlePaste = this._handlePaste.bind(this);
    this._handleCopy = this._handleCopy.bind(this);
    this._handleCut = this._handleCut.bind(this);
    window.addEventListener('keydown', this._handleCellKeyDown);
    window.addEventListener('mouseup', this._handleWindowMouseUp);
    window.addEventListener('paste', this._handlePaste);
    window.addEventListener('copy', this._handleCopy);
    window.addEventListener('cut', this._handleCut);
  }

  componentWillUnmount () {
    window.removeEventListener('keydown', this._handleCellKeyDown);
    window.removeEventListener('mouseup', this._handleWindowMouseUp);
    window.removeEventListener('paste', this._handlePaste);
    window.removeEventListener('copy', this._handleCopy);
    window.removeEventListener('cut', this._handleCut);
  }

  componentDidUpdate (prevProps, prevState) {
    if (prevState.data !== this.state.data && this.__history[this.__historyIndex - 1] !== this.state.data){
      this.__history.push(this.state.data);
      this.__historyIndex = this.__history.length;
    }
  }

  getValidatedData (cb) {
    let data = this.state.data;

    //  Filter rows
    data = data.filter(d => {
      return d.size > 0;
    });

    let errors = {};
    data.forEach((d, i) => {
      const rowErrors = [];
      this.props.columns.forEach(column => {
        const curErrors = validator(d, d.get(column.dataKey), column.required, column.options, column.validator);
        if (curErrors.length){
          rowErrors.push({key: column.dataKey, errors: curErrors});
        }
      });

      if (rowErrors.length > 0){
        errors[i] = rowErrors;
      }
    });

    if (Object.keys(errors).length > 0){
      cb(errors);
    } else {
      cb(null, data);
    }
  }

  _getColumnReverseIndex (columns) {
    const index = {};
    columns.forEach((column, i) => {
      index[column.dataKey] = i;
    });
    return index;
  }

  _handleResizeColumn (newColumnWidth, key) {
    const columnWidthOverrides = {...this.state.columnWidthOverrides};
    columnWidthOverrides[key] = newColumnWidth;
    this.setState({
      columnWidthOverrides
    });
  }

  _handleCopy (e) {
    if (this.state.editing){
      return;
    }

    const data = [];
    const sel = this.state.selection;
    for (let row = sel.startRow; row <= sel.endRow; row++){
      const rowDataRaw = [];
      const rowData = this.state.data.get(row);
      for (let col = sel.startCol; col <= sel.endCol; col++){
        const dataKey = this.props.columns[col].dataKey;
        rowDataRaw.push(rowData.get(dataKey));
      }
      data.push(rowDataRaw.join('\t'));
    }

    e.clipboardData.setData('text/plain', data.join('\n'));
    e.preventDefault();
  }

  _handleCut (e) {
    if (this.state.editing){
      return;
    }

    let data = this.state.data;
    const copiedData = [];
    const sel = this.state.selection;
    for (let row = sel.startRow; row <= sel.endRow; row++){
      const rowDataRaw = [];
      const rowData = data.get(row);
      for (let col = sel.startCol; col <= sel.endCol; col++){
        const dataKey = this.props.columns[col].dataKey;
        rowDataRaw.push(rowData.get(dataKey));
        data = data.set(row, rowData.delete(dataKey));
      }
      copiedData.push(rowData.join('\t'));
    }

    e.clipboardData.setData('text/plain', copiedData.join('\n'));
    e.preventDefault();
    this.setState({data});
  }

  _handleDelete (e) {
    if (this.state.editing){
      return;
    }

    e.preventDefault();

    let data = this.state.data;
    const sel = this.state.selection;
    for (let rowI = Math.min(sel.startRow, sel.endRow); rowI <= Math.max(sel.startRow, sel.endRow); rowI++){
      let rowData = data.get(rowI);
      for (let colI = Math.min(sel.startCol, sel.endCol); colI <= Math.max(sel.startCol, sel.endCol); colI++){
        const dataKey = this.props.columns[colI].dataKey;
        rowData = rowData.delete(dataKey);
      }
      data = data.set(rowI, rowData);
    }
    this.setState({data});
  }

  _handlePaste (e) {
    if (this.state.editing){
      return;
    }

    e.preventDefault();
    const text = (e.originalEvent || e).clipboardData.getData('text/plain');
    let rows = text.split(/[\n\r]+/);
    rows = rows.map(row => {
      return row.split('\t');
    });

    let data = this.state.data;
    const sel = this.state.selection;
    const isSingle = rows.length === 1 && rows[0].length === 1;

    //  If single cell
    if (isSingle){
      for (let rowI = sel.startRow; rowI <= sel.endRow; rowI++){
        let rowData = data.get(rowI);
        for (let colI = sel.startCol; colI <= sel.endCol; colI++){
          const dataKey = this.props.columns[colI].dataKey;
          rowData = rowData.set(dataKey, rows[0][0]);
        }
        data = data.set(rowI, rowData);
      }
    }

    //  If not single cell
    else {
      rows.forEach((row, i) => {
        i += sel.startRow;

        //  Out of bound
        if (i >= this.props.rowCount){
          return;
        }

        let rowData = data.get(i) || new Immutable.Map();
        row.forEach((value, j) => {
          j += sel.startCol;

          //  Out of bound
          if (j >= this.props.columns.length){
            return;
          }

          const dataKey = this.props.columns[j].dataKey;
          rowData = rowData.set(dataKey, value);
          data = data.set(i, rowData);
        });
      });
    }

    this.setState({data});
  }

  _inBetween (x, start, end){
    if (start < end){
      return x >= start && x <= end;
    } else {
      return x <= start && x >= end;
    }
  }

  _indexRenderer (cellData, cellKey, rowData, rowIndex, columnData, width) {
    const selected = this._inBetween(rowIndex,
                        this.state.selection.startRow,
                        this.state.selection.endRow);

     return (
      <Header
        isRowHeader={true}
        selected={selected}
        label={(rowIndex + 1) + ''}
        onMouseDown={this._handleIndexMouseDown.bind(this, rowIndex, 0, rowIndex, this.props.columns.length)}
        onMouseEnter={this._handleIndexMouseOver.bind(this, rowIndex)} />
    );
  }

  _handleIndexMouseDown () {
    this.__draggingRow = true;
    this._setSelectionPoint.apply(this, Array.prototype.slice.call(arguments, 0));
  }

  _handleIndexMouseOver (rowIndex) {
    if (this.__draggingRow){
      const sel = this.state.selection;
      this._setSelectionPoint(sel.startRow, sel.startCol, rowIndex, sel.endCol);
    }
  }

  _handleIndexMouseUp () {
    this.__draggingRow = false;
  }

  _headerRenderer (label, cellKey, columnData, rowData, width) {
    const sel = this.state.selection;
    const colIndex = this.state.columnReverseIndex[cellKey];
    const selected = this._inBetween(colIndex, sel.startCol, sel.endCol);

    if (cellKey === '__index'){
      const allSelected = sel.startRow === 0 && sel.endRow === this.props.rowCount &&
                          sel.startCol === 0 && sel.endCol === this.props.columns.length - 1;
      return (
        <Header
          label={label}
          selected={allSelected}
          onMouseDown={this._handleColumnMouseDown.bind(this, 0, 0, this.props.rowCount, this.props.columns.length - 1)} />
      );
    } else {
      return (
        <Header
          label={label}
          selected={selected}
          highlighted={columnData.required}
          onMouseDown={this._handleColumnMouseDown.bind(this, 0, colIndex, this.props.rowCount, colIndex)}
          onMouseEnter={this._handleColumnMouseOver.bind(this, colIndex)} />
      );
    }
  }

  _handleColumnMouseDown () {
    this.__draggingCol = true;
    this._setSelectionPoint.apply(this, Array.prototype.slice.call(arguments, 0));
  }

  _handleColumnMouseOver (colIndex) {
    if (this.__draggingCol){
      const sel = this.state.selection;
      this._setSelectionPoint(sel.startRow, sel.startCol, sel.endRow, colIndex);
    }
  }

  _handleWindowMouseUp () {
    this.__draggingRow = false;
    this.__draggingCol = false;
    this.__dragging = false;
  }

  _cellRenderer (cellData, cellKey, rowData, rowIndex, columnData, width) {
    const sel = this.state.selection;
    const colIndex = this.state.columnReverseIndex[cellKey];


    const focused = sel.startRow === rowIndex && sel.startCol === colIndex;
    const selected = this._inBetween(rowIndex, sel.startRow, sel.endRow) &&
                      this._inBetween(colIndex, sel.startCol, sel.endCol) &&
                      (sel.startRow !== rowIndex || sel.startCol !== colIndex);

    const edgeLeft = selected && (Math.min(sel.startCol, sel.endCol) === colIndex);
    const edgeRight = selected && (Math.max(sel.startCol, sel.endCol) === colIndex);
    const edgeTop = selected && (Math.min(sel.startRow, sel.endRow) === rowIndex);
    const edgeBottom = selected && (Math.max(sel.startRow, sel.endRow) === rowIndex);

    const errors = validator(rowData, cellData, columnData.required, columnData.options, columnData.validator);

    return (
      <CellWrapper
        onMouseDown={this._handleCellClick.bind(this, rowIndex, colIndex)}
        onMouseMove={this._handleCellDragOver.bind(this, rowIndex, colIndex)}>
        <Cell
          {...columnData}
          focused={focused}
          selected={selected}
          data={((!this.state.editing || !focused) && columnData.formatter) ? columnData.formatter(cellData) : cellData}
          editing={focused ? this.state.editing : false}
          onEdit={this._handleEdit.bind(this)}
          onUpdate={this._handleDataUpdate.bind(this, rowIndex, cellKey)}
          valid={errors.length === 0}
          edgeLeft={edgeLeft}
          edgeRight={edgeRight}
          edgeTop={edgeTop}
          edgeBottom={edgeBottom} />
      </CellWrapper>
    );
  }

  _setSelectionPoint (startRow, startCol, endRow, endCol) {
    const selection = {
      startRow: Math.max(Math.min(startRow, this.props.rowCount - 1), 0),
      endRow: Math.max(Math.min(endRow, this.props.rowCount - 1), 0),
      startCol: Math.max(Math.min(startCol, this.props.columns.length - 1), 0),
      endCol: Math.max(Math.min(endCol, this.props.columns.length - 1), 0)
    };

    this.setState({selection});
  }

  _handleCellKeyDown (e) {
    if (this.state.lockKeyDown){
      return;
    }

    const sel = this.state.selection;
    const ctrl = (e.ctrlKey || e.metaKey);

    if (e.keyCode === 38){
      e.preventDefault();
      if (e.shiftKey){
        const newEnd = ctrl ? 0 : sel.endRow - 1;
        this._setSelectionPoint(sel.startRow, sel.startCol, newEnd, sel.endCol);
      } else {
        this._setSelectionPoint(sel.startRow - 1, sel.startCol, sel.startRow - 1, sel.startCol);
      }
    }
    else if (e.keyCode === 40){
      e.preventDefault();
      if (e.shiftKey){
        const newEnd = ctrl ? this.props.rowCount : sel.endRow + 1;
        this._setSelectionPoint(sel.startRow, sel.startCol, newEnd, sel.endCol);
      } else {
        this._setSelectionPoint(sel.startRow + 1, sel.startCol, sel.startRow + 1, sel.startCol);
      }
    }
    else if (e.keyCode === 37){
      e.preventDefault();
      if (e.shiftKey){
        const newEnd = ctrl ? 0 : sel.endCol - 1;
        this._setSelectionPoint(sel.startRow, sel.startCol, sel.endRow, newEnd);
      } else {
        this._setSelectionPoint(sel.startRow, sel.startCol - 1, sel.startRow, sel.startCol - 1);
      }
    }
    else if (e.keyCode === 39){
      e.preventDefault();
      if (e.shiftKey){
        const newEnd = ctrl ? this.props.columns.length : sel.endCol + 1;
        this._setSelectionPoint(sel.startRow, sel.startCol, sel.endRow, newEnd);
      } else {
        this._setSelectionPoint(sel.startRow, sel.startCol + 1, sel.startRow, sel.startCol + 1);
      }
    } else if (e.keyCode === 8 || e.keyCode === 46){
      this._handleDelete(e);
    } else if (e.keyCode === 90 && ctrl){
      if (e.shiftKey && this.__historyIndex < this.__history.length){
        this.__historyIndex++;
        const data = this.__history[this.__historyIndex - 1];
        this.setState({data});
      } else if (!e.shiftKey && this.__historyIndex > 0){
        this.__historyIndex--;
        const data = this.__history[this.__historyIndex - 1];
        this.setState({data});
      }
    }
    window.x = this;

    if (!ignoreKeyCodes[e.keyCode] && !this.state.editing && !this._isCommand(e)){
      this.setState({editing: true});
    }
  }

  _isCommand (e) {
    return (e.metaKey || e.ctrlKey) && (e.keyCode === 67 || e.keyCode === 86 || e.keyCode === 88) ||
            (e.keyCode === 8 || e.keyCode === 46);
  }

  _handleEdit () {
    this.setState({editing: true, lockKeyDown: true});
  }

  _handleDataUpdate (rowIndex, dataKey, value, jumpDown){
    let data = this.state.data;
    let rowData = data.get(rowIndex) || new Immutable.Map();
    if (value){
      data = data.set(rowIndex, rowData.set(dataKey, value));
    } else {
      data = data.set(rowIndex, rowData.delete(dataKey));
    }
    this.setState({data, editing: false, lockKeyDown: false});

    if (jumpDown){
      const sel = this.state.selection;
      this._setSelectionPoint(sel.startRow + 1, sel.startCol, sel.startRow + 1, sel.endCol);
    }
  }

  _handleCellClick (row, col) {
    this._setSelectionPoint(row, col, row, col);
    this.__dragging = true;
    if (this.state.editing && !this.state.lockKeyDown){
      this.setState({lockKeyDown: true});
    }
  }

  _handleCellMouseUp () {
    this.__dragging = false;
  }


  _handleCellDragOver (endRow, endCol) {
    const sel = this.state.selection;
    if (this.__dragging &&
      (endRow !== sel.endRow || endCol !== sel.endCol)){
      this._setSelectionPoint(sel.startRow, sel.startCol, endRow, endCol);
    }
  }

  _getColumns () {
    const columns = [];

    //  Selected
    columns.push(
      <Column
        key='__index'
        dataKey='__index'
        width={10 + 10 * (this.state.data.size + '').length}
        headerRenderer={this._headerRenderer.bind(this)}
        cellRenderer={this._indexRenderer.bind(this)}
        fixed={true} />
    );

    //  Columns
    this.props.columns.forEach((column, i) => {
      column.columnData = column;
      column.cellRenderer = this._cellRenderer.bind(this);
      column.headerRenderer = this._headerRenderer.bind(this);
      column.width = this.state.columnWidthOverrides[column.dataKey] || column.width || 150;
      column.allowCellsRecycling = false;
      column.isResizable = true;

      if (i === this.props.columns.length - 1){
        column.flexGrow = 1;
      }

      columns.push(
        <Column
          { ...column }
          cellDataGetter={this._cellDataGetter}
          key={column.dataKey} />
      );
    });

    return columns;
  }

  _rowGetter (i) {
    return this.state.data.get(i);
  }

  _cellDataGetter (cellKey, rowData) {
    return rowData.get(cellKey);
  }

  render(){
    return (
      <div style={[
          Styles.Unselectable,
          Styles.FullSize
        ]}>
        <Autosize>
          <Table
            rowsCount={this.state.data.size}
            rowGetter={this._rowGetter.bind(this)}
            onColumnResizeEndCallback={this._handleResizeColumn.bind(this)}
            isColumnResizing={false}
            rowHeight={32}
            headerHeight={36}
            width={0}
            height={0} >
            { this._getColumns() }
          </Table>
        </Autosize>
      </div>
    );
  }
}

Sheet.propTypes = {
  columns: React.PropTypes.array.isRequired,
  defaultData: React.PropTypes.array,
  rowCount: React.PropTypes.number,
  window: React.PropTypes.string
};

Sheet.defaultProps = {
  defaultData: [],
  rowCount: 0
};

export default Sheet;