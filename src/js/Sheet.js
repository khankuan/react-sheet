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

import { inBetween, inBetweenArea } from './helper';

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
      selection: {}
    };

    this.__dragging = {};
  }

  _getInitialData = (props) => {
    const maxRows = Math.max(props.defaultData.length, props.rowCount);
    let data = _.clone(props.defaultData);
    data[maxRows - 1] = data[maxRows - 1];
    data = data.fill({}, props.defaultData.length, maxRows)
                .map(d => { return { data: d }; });
    return fromJS(data);
  }

  _getInitialColumns = (props) => {
    return props.columns.map((column, i) => {
      const newColumn = {column, __index: i};
      return new Immutable.Map(newColumn);
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

  _setSelectionPoint = (startRow, startCol, endRow, endCol) => {
    const prevSelection = this.state.selection;
    const selection = {
      startRow: Math.max(Math.min(startRow, this.props.rowCount - 1), 0),
      endRow: Math.max(Math.min(endRow, this.props.rowCount - 1), 0),
      startCol: Math.max(Math.min(startCol, this.state.columns.length - 1), 0),
      endCol: Math.max(Math.min(endCol, this.state.columns.length - 1), 0)
    };

    if (_.isEqual(selection, this.state.selection)){
      return;
    }
    this.__selection = selection;
    const data = this._getDataWithSelection(prevSelection, selection);
    const columns = this._getColumnsWithSelection(prevSelection, selection);
    const rowIndexData = this._getRowIndexDataWithSelection(selection);

    this.setState({ selection, columns, rowIndexData, data });
  }

  _setSelectionObject (obj) {
    const sel = {};
    _.assign(sel, this.state.selection, obj);
    this._setSelectionPoint(sel.startRow, sel.startCol, sel.endRow, sel.endCol);
  }

  _rowGetter = (i) => {
    return this.state.data.get(i);
  }

  _cellDataGetter = (cellKey, row) => {
    return row.get('data').get(cellKey);
  }


  /**
   * Handlers
   */
  _handleResizeColumn = (newColumnWidth, key) => {
    const columnWidthOverrides = {...this.state.columnWidthOverrides};
    columnWidthOverrides[key] = newColumnWidth;
    this.setState({ columnWidthOverrides });
  }

  _handleGlobalMouseDown = (type, selection, e) => {
    e.preventDefault();
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
    let row = data.get(rowIndex);

    let rowData = row.get('data');
    if (value){
      row = row.set('data', rowData.set(dataKey, value));
    } else {
      row = row.set('data', rowData.delete(dataKey));
    }

    data = data.set(rowIndex, row);
    this.setState({data, editing: false});
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
        onMouseEnter={ this._handleGlobalMouseOver.bind(this, 'row', {
          endRow: rowIndex
        }) } />
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
        }) } />
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

    const error = validator(row.get('data'), cellData, columnData.required, columnData.options, columnData.validator);

    return (
      <Cell
        data={ (!this.state.editing && columnData.formatter) ? columnData.formatter(cellData) : cellData }
        rowData={ row.get('data') }
        editing={ focused && this.state.editing }
        focused={ focused }
        selected={ selected }
        hasPrevRow={ hasPrevRow }
        hasPrevColumn={ hasPrevColumn }
        isLeft={ isLeft }
        isRight={ isRight }
        isTop={ isTop }
        isBottom={ isBottom }
        error={ error }

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
        }) } />
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