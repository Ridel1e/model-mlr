import {XlsReader} from '../xls-reader';

/* XLS file constants */
const FIRST_ROW = 8;
const LAST_ROW = 18;
const FIRST_COLUMN = 'A';

const DataProvider = {
  getArgsAsync,
  getResultsAsync
};

export { DataProvider }

/**
 * Returns normalized data list
 * @public 
 * @param {string} filePath path to file
 * @returns {Promise} 
 */
function getArgsAsync (directoryPath) {
  return XlsReader
    .readAllFrom(directoryPath)
    .then((files) => {
      return files.map((file) => {
        const SHEET_LIST_NAME = file.SheetNames[0];
        let cells = file.Sheets[SHEET_LIST_NAME];

        cells = _hashToArray(cells, 'name', 'data');
        cells = _filterCellsByRowNumbers(cells, FIRST_ROW, LAST_ROW);
        cells = _groupCellsByYear(cells, FIRST_COLUMN);
        cells = _normalizeData(cells);
        
        return _concatAll(cells);
      });
    });
}

/**
 * Returns results data
 * @public 
 * @param {string} directoryPath path to directory
 * @returns {Promise}
 */
function getResultsAsync (directoryPath) {
  return XlsReader
    .readAllFrom(directoryPath)
    .then((files) => files[0])
    .then((file) => {
      const SHEET_LIST_NAME = file.SheetNames[0];

      return file.Sheets[SHEET_LIST_NAME];
    })
    .then((cells) => _hashToArray(cells, 'name', 'data'))
    .then((cells) => _filterCellsByRowNumbers(cells, FIRST_ROW, LAST_ROW))
    /* concat all results without years. Need to extract */
    .then((cells) => {
      const results = [];
      const cellsLength = cells.length;

      for (let i = 0; i < cellsLength; i++) {
        const cell = cells[i];
        const column  = _getColumn(cell.name);

        if(column !== FIRST_COLUMN) { 
          results.push(cell.data.v);
        }
      }

      return results;
    });
}

/**
 * Returns filtered cells collection by first and last row
 * @private
 * @param {Array} cells description
 * @returns {Array} cells collection
 */
function _filterCellsByRowNumbers (cells, firstRow, lastRow) {
  return cells
    .filter((cell) => {
      const row = _getRow(cell.name);

      return firstRow <= row && row <= lastRow;
    });
}

/**
 * Returns merged array
 * @private 
 * @param {Array} cells
 * @returns {Array} merged array
 */
function _concatAll (cells) {
  return Array.prototype.concat.apply([], cells);
}

/**
 * Converts hash to array.
 * @private 
 * @param {Object} hash 
 * @param {string} keyProperty 
 * @param {string} dataProperty
 * @returns {Array} return array
 */
function _hashToArray (hash, keyProperty, dataProperty) {

  if(typeof keyProperty !== 'string') {
    throw new Error('"keyProperty" argument type mismatch. String expected')
  }

  if(typeof dataProperty !== 'string') {
    throw new Error('"dataProperty" argument type mismatch. String expected')
  }

  return Object
    .keys(hash)
    .map((key) => {
      return { [keyProperty]: key, [dataProperty]: hash[key] }
    })
}

/**
 * Groups data by years
 * @private
 * @param {Array} cells 
 * @param {string} yearColumn 
 * @returns {Object}
 */
function _groupCellsByYear (cells, yearColumn) {
  let currentYear = 0;

  return cells.reduce((hash, cell) => {
    const column = _getColumn(cell.name);

    if(column === yearColumn) { 
      currentYear = cell.data.v;
      hash[currentYear] = [];
      return hash;
    }

    hash[currentYear].push(cell.data.v); 
    return hash;
  }, {})
}

/**
 * Retunrs cell row number
 * @private 
 * @param {string} cell
 * @returns {string} row number 
 */
function _getRow (cell) {
  return cell.substring(1);
}

/**
 * Returns cell column name
 * @private 
 * @param {string} cell 
 * @returns {string} column name
 */
function _getColumn (cell) {
  return cell.substring(0, 1);
}

/**
 * Returns normalized data
 * @private 
 * @param {Object} data
 * @returns {Object} normalized data
 */
function _normalizeData (data) {
  return Object
    .keys(data)
    .map((year) => {
      const normalizedData = [];
      const yearData = data[year];

      for (let i = yearData.length - 1; i > 0; i--) {
        const item = yearData[i];
        const nextItem = yearData[i - 1];
        const normalizedItem = 
          Number((item - nextItem).toFixed(1));

        yearData[i] = normalizedItem;
      }
      
      return yearData;
    })
}
