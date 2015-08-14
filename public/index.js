var columns = [
  { label: 'Employee Name', dataKey: 'name', required: true, fixed: true, width: 150 },
  { label: 'Job Title', dataKey: 'jobTitle', options: ['Boss', 'Minion'] },
  { label: 'Email Address',
    dataKey: 'email',
    validator: function(value){
      var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
      return re.test(value);
    } 
  },
  { label: 'Salary', dataKey: 'salary', formatter: function(value){ return value ? '$' + value : value; }}
];


function init () {
  var element = ReactSheetFactory({
    defaultData: [{name: 'John', jobTitle: 'bos'}, {email: 'sam', salary: 500}],
    rowCount: 20,
    columns: columns,
    window: 'myTable'
  });
  React.render(element, document.getElementById('app'));
}


function submit () {
  window.myTable.getValidatedData(function(errors, data){
    if (errors){
      var errorString = [];
      for (var row in errors){
        var rowErrors = errors[row];
        rowErrors.forEach(function(error){
          errorString.push('Row ' + (parseInt(row) + 1) + ' ' + JSON.stringify(error));
        });
      }
      window.alert('ERROR!\n' + errorString.join('\n'));
    } else {
      var dataString = data.map(function(row){
        return JSON.stringify(row);
      });
      window.alert('SUCCESS!\n' + dataString.join('\n'));
    }
  });
}


document.addEventListener("DOMContentLoaded", function(event) {
  init();
});