export default function (rowData, data, required, options, custom){
  const errors = [];

  //  No row
  if (!rowData || rowData.size === 0){
    return errors;
  }

  //  Custom
  if (custom){
    if (!custom(data)){
      errors.push({type: 'Custom'});
    }
  }

  //  Built in
  else {

    //  Options
    if (data && options && options.length){
      if (options.indexOf(data) === -1){
        errors.push({
          type: 'Invalid option'
        });
      }
    }

    //  Required
    if ((data === null || data === undefined || data === '') && required){
      errors.push({
        type: 'Required'
      });
    }
  }

  return errors;
}
