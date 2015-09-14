#Spec v1.0

##Props
- `defaultData`: Array of objects
- `rowCount`: Number of rows to display (Maximum rows)
- `columns`
  - key: data's dataKey
  - label: Column header title
  - required: If true, validation will fail if cell is empty
  - options[string]: If set, user will be given a dropdown to select from. Default validator will also ensure value is in options
  - validator(data, rowData): Custom validation. This will override `required` and `options` validation
    - Throw new error with msg if cell is invalid
  - fixed: Fixed pane at column
  - width: Width of column in pixels. Default 150.
  - formatter(data, rowData): Inputs a string and outputs a formatted string.
- `rowValidator`: (rowData) Validates an entire row
  - Throw new error with msg if row is invalid
- `rowHeight`: Height in pixels of rows
- `getCellStyle`: (data, rowData, column, meta, defaultStyle)
  - meta is a dict containing:
    - selection: {startRow, endRow, startCol, endCol}
    - selected: Whether cell is in selection
    - focused: Whether cell is first in selection
    - editing: Whether cell is in editing mode
    - error: If cell has error in validation
- `getRowHeaderStyle`: (meta, defaultStyle)
  - meta is a dict containing:
    - selected: Whether entire row is selected
    - errors: Row validation + cell validations
- `getColumnHeaderStyle`: (column, meta, defaultStyle)
  - meta is a dict containing:
    - selected: Whether entire column is selected
- `getCellErrorStyle`: (error, defaultStyle)


##Methods
- `getValidatedData()`: Returns array of object, or throws exception if validation fails


##Behaviour
- `Sheet`
  - Up, Down, Left, Right: Set selection to a single cell to the direction.
  - Ctrl + Up, Down, Left, Right: Teleport to start/end of column/row
  - Shift + Up, Down, Left, Right: Expand selection area
  - Ctrl + Shift + Up, Down, Left, Right: Expand selection area to start/end of column/row
  - Ctrl + c: Copy
  - Ctrl + x: Cut, set cut area.
  - Ctrl + v: Paste, clear cut area if any.
  - Ctrl + z: Undo, and jump to first cell affected by undo
  - Ctrl + Shift + z: Redo, and jump to first cell affected by redo
  - Keydown: If cell not in editing mode, set cell to editing
    - If Esc, clear cut area.
    - If Delete/backspace, clear data in selection
  - Double Click: Sets cell to editing mode, set selection to cell
- `Header`
  - MouseDown: Set selection to row/column
  - ContextMenu: Shows menu
    - Column Menu
      - Sort
      - Clear, Copy, Cut, Paste
    - Row Menu
      - Delete Row(s)
      - Insert 1 above/below
      - Clear, Copy, Cut, Paste
- `Cell`
  - Mousedown: Set selection to cell, set selecting true
  - Mouseover: Expand selection if selecting
  - Mouseup: Set selecting to false
  - Tab: Set selection to first cell on right, from the top
  - Enter: Set selection to first cell below, to the left
  - Esc: Set editing to false
- `Selection`
  - ContextMenu
    - Clear, Copy, Cut, Paste

## Style
- All style prop
- By Cell
- By Row
- By Sheet
- By ColumnHeader
- By RowHeader