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

import { inBetween } from './helper';

@Radium
class Sheet extends React.Component {

  /**
   * Lifecycle
   */
  constructor (props) {
    super(props);

    this.state = {
      columnWidthOverrides: {},
      columns: this._getInitialColumns(props),
      data: this._getInitialData(props),
      selection: {},
      valueErrors: [],
      rowErrors: []
    };

    this.__dragging = {};
  }

  _getInitialData = (props) => {
    const maxRows = Math.max(props.defaultData.length, props.rowCount);
    let data = _.clone(props.defaultData);
    data[maxRows - 1] = data[maxRows - 1];
    data = data.fill({}, props.defaultData.length, maxRows);
    return fromJS(data);
  }

  _getInitialColumns = (props) => {
    return props.columns.map((column, i) => {
      const newColumn = {...column};
      newColumn._index = i;
      return newColumn;
    });
  }

  componentWillMount () {
    window.addEventListener('mouseup', this._handleGlobalMouseUp);
  }

  componentWillUnmount () {
    window.removeEventListener('mouseup', this._handleGlobalMouseUp);
  }

  /**
   * Internal Methods
   */
  _setSelectionPoint = (startRow, startCol, endRow, endCol) => {
    const selection = {
      startRow: Math.max(Math.min(startRow, this.props.rowCount - 1), 0),
      endRow: Math.max(Math.min(endRow, this.props.rowCount - 1), 0),
      startCol: Math.max(Math.min(startCol, this.state.columns.length - 1), 0),
      endCol: Math.max(Math.min(endCol, this.state.columns.length - 1), 0)
    };

    this.setState({ selection });
  }

  _setSelectionObject (obj) {
    const sel = this.state.selection;
    _.assign(sel, obj);
    this._setSelectionPoint(sel.startRow, sel.startCol, sel.endRow, sel.endCol);
  }

  _rowGetter = (i) => {
    return this.state.data.get(i);
  }

  _cellDataGetter = (cellKey, rowData) => {
    return rowData.get(cellKey);
  }


  /**
   * Handlers
   */
  _handleResizeColumn = (newColumnWidth, key) => {
    const columnWidthOverrides = {...this.state.columnWidthOverrides};
    columnWidthOverrides[key] = newColumnWidth;
    this.setState({ columnWidthOverrides });
  }

  _handleGlobalMouseDown = (type, selection) => {
    this.__dragging[type] = true;
    this._setSelectionObject(selection);
  }

  _handleGlobalMouseOver = (type, selection) => {
    if (this.__dragging[type]) {
      this._setSelectionObject(selection);
    }
  }

  _handleGlobalMouseUp = () => {
    this.__dragging = {};
  }

  _handleSelectAll = () => {
    this._setSelectionPoint(0, 0, Math.max(this.state.data.size, this.props.rowCount), this.state.columns.length);
  }

  _handleDataUpdate (rowIndex, dataKey, value){
    let data = this.state.data;
    let rowData = data.get(rowIndex);
    if (value){
      data = data.set(rowIndex, rowData.set(dataKey, value));
    } else {
      data = data.set(rowIndex, rowData.delete(dataKey));
    }
    this.setState({data, editing: false});
  }


  /**
   * Rendering
   */
  _indexHeaderRenderer = (label, cellKey, columnData, rowData, width) => {
    const sel = this.state.selection;
    const allSelected = sel.startRow === 0 && sel.endRow === this.state.data.size - 1 &&
                          sel.startCol === 0 && sel.endCol === this.state.columns.length - 1;

    return (
      <RowIndex
        selected={ allSelected }
        getStyle={ this.props.getRowHeaderStyle }
        onMouseDown={ this._handleSelectAll } />
    );
  }

  _indexRenderer = (cellData, cellKey, rowData, rowIndex, columnData, width) => {
    const selected = inBetween(rowIndex,
                        this.state.selection.startRow,
                        this.state.selection.endRow);

     return (
      <RowIndex
        index={ rowIndex }
        selected={ selected }
        errors={ _.union(this.state.rowErrors[rowIndex], this.state.valueErrors[rowIndex]) }
        getStyle={ this.props.getRowHeaderStyle }
        onMouseDown={ this._handleGlobalMouseDown.bind(this, 'row', {
          startRow: rowIndex,
          endRow: rowIndex,
          startCol: 0,
          endCol: this.state.columns.length
        }) }
        onMouseEnter={ this._handleGlobalMouseOver.bind(this, 'row', {
          endRow: rowIndex
        }) } />
    );
  }

  _headerRenderer = (label, cellKey, columnData, rowData, width) => {
    const sel = this.state.selection;
    const selected = inBetween(columnData._index, sel.startCol, sel.endCol);

    return (
      <ColumnHeader
        column={ columnData }
        selected={ selected }
        getStyle={ this.props.getColumnHeaderStyle }
        onMouseDown={this._handleGlobalMouseDown.bind(this, 'column', {
          startRow: 0,
          endRow: this.state.data.size,
          startCol: columnData._index,
          endCol: columnData._index
        }) }
        onMouseEnter={ this._handleGlobalMouseOver.bind(this, 'column', {
          endCol: columnData._index
        }) } />
    );
  }

  _cellRenderer = (cellData, cellKey, rowData, rowIndex, columnData, width) => {
    const sel = this.state.selection;
    const focused = sel.startRow === rowIndex && sel.startCol === columnData._index;
    const selected = inBetween(rowIndex, sel.startRow, sel.endRow) &&
                      inBetween(columnData._index, sel.startCol, sel.endCol);

    const error = validator(rowData, cellData, columnData.required, columnData.options, columnData.validator);

    return (
      <Cell
        data={ (!this.state.editing && columnData.formatter) ? columnData.formatter(cellData) : cellData }
        rowData={ rowData }
        editing={ focused && this.state.editing }
        focused={ focused }
        selected={ selected }
        error={ error }

        column={ columnData }
        selection={ sel }
        rowIndex={ rowIndex }
        columnIndex={ columnData._index }

        getStyle={ this.props.getCellStyle }
        onUpdate={ this._handleDataUpdate.bind(this, rowIndex, cellKey) }

        onMouseDown={this._handleGlobalMouseDown.bind(this, 'cell', {
          startRow: rowIndex,
          endRow: rowIndex,
          startCol: columnData._index,
          endCol: columnData._index
        }) }
        onMouseOver={this._handleGlobalMouseOver.bind(this, 'cell', {
          endRow: rowIndex,
          endCol: columnData._index
        }) } />
    );
  }

  _getColumns () {
    const columns = [];

    //  Index
    columns.push(
      <Column
        key='__index'
        dataKey='__index'
        width={10 + 14 * ( this.state.data.size + '').length }
        headerRenderer={ this._indexHeaderRenderer.bind(this) }
        cellRenderer={ this._indexRenderer.bind(this) }
        fixed={true} />
    );

    //  Columns
    this.state.columns.forEach((column, i) => {
      column.columnData = column;
      column.cellRenderer = this._cellRenderer.bind(this);
      column.headerRenderer = this._headerRenderer.bind(this);  //  TODO???
      column.width = this.state.columnWidthOverrides[column.dataKey] || column.width || 150;
      column.allowCellsRecycling = false;
      column.isResizable = true;

      //  Last column fills up all the remaining width
      if (i === this.state.columns.length - 1){
        column.flexGrow = 1;
      }

      columns.push(
        <Column
          { ...column }
          cellDataGetter={ this._cellDataGetter }
          key={ column.dataKey } />
      );
    });

    return columns;
  }

  render () {
    return (
      <div style={ [
          Styles.Unselectable,
          Styles.FullSize,
          Styles.Sheet.base
        ] }>
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
  rowHeight: React.PropTypes.number
};

Sheet.defaultProps = {
  defaultData: [],
  rowCount: 10,
  rowHeight: 32
};

export default Sheet;