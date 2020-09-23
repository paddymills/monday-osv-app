
function getKey(obj) {
  // for items stored as key: true|false
  // i.e. vendor1Column: { vendor1ColumnName: true }

  return Object.keys(obj)[0];
}

function columnValuesToObj(columnValues) {
  let obj = {};

  columnValues.forEach(col => {
    obj[col.id] = col;
  });

  return obj;
}

export {
  columnValuesToObj,
  getKey,
};