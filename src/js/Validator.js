export default function (rowData, data, required, options, custom){

  //  No row
  if (!rowData || rowData.size === 0){
    return null;
  }


  //  Custom
  if (custom){
    return custom(data);
  }

  //  Built in
  else {

    //  Options
    if (data && options && options.length){
      if (options.indexOf(data) === -1){
        return 'Invalid option';
      }
    }

    //  Required
    if ((data === null || data === undefined || data === '') && required){
      return 'Required';
    }
  }

}
