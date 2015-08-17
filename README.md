# React Sheet
A library for a simple spreadsheet in React.


## Usage
```js
function init () {
  var element = React.createElement(window.ReactSheet, {
    defaultData: [{name: 'John', jobTitle: 'Boss'}],
    maxRows: 2000,
    columns: [
      { label: 'Employee Name', dataKey: 'name', required: true, fixed: true, width: 150 },
      { label: 'Job Title', dataKey: 'jobTitle', options: ['Boss', 'Minion'] },
      { label: 'Email Address', dataKey: 'email', validator: function(value){...} },
      { label: 'Salary', dataKey: 'salary', formatter: function(value){ return '$' + value; }}
    ]
  });
  React.render(element, document.getElementById('app'));
}

function submit () {
  try {
    var data = element.getValidatedData(); // data: [{name: '...', jobTitle: '...', email: 'john@gmail.com', salary: '100'}];
    $.post('/import', {data: data})....
  } catch(err){
    // err: [{row, dataKey, type}]
    window.alert(....)
  }
}
```

## Props
- `defaultData`: Array of objects
- `rowCount`: Number of rows to display (Can be more than data's length)
- `columns`: [{required, label, dataKey, validator, fixed, options, width, formatter]]
  - required: If true, validation will fail if cell is empty
  - label: Column header title
  - key: data's dataKey
  - validator: Custom validation. This will override `required` and `options` validation
  - fixed: Fixed pane at column
  - options: If set, user will be given a dropdown to select from. Default validator will also ensure value is in options
  - Width: Width of column in pixels. Default 150.
  - Formatter: Inputs a string and outputs a formatted string. 

## Methods
- `getValidatedData()`: Returns array of object, or throws exception if validation fails

## Behaviour
- Multiple cell selection
  - by drag, row, column
  - delete
  - copy
  - paste
  - cut
  - undo
  - redo
  - Up/down/left/right
- Resize columns
- Show invalid cells

## TODO
- Right click menu (copy, paste, cut)
- Cut to perserve data before paste
- Fix safari drag causing i-beam cursor


## Dev Instructions
==============================
- Init: `npm install`
- Develop: `npm run dev`
- Compile: `npm run compile`
