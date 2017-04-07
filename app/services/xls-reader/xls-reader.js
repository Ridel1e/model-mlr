import fs from 'fs';
import XLSX from 'xlsx';

/**
 * Reads xls file from nesessary folder
 * @public 
 * @param {string} path path to file
 * @returns {Promise} 
 */
const readFrom = (path) => {
  return new Promise((resolve, reject) => {
    const buffer = fs.readFileSync(path);
    
    resolve(XLSX.read(buffer));
  })
}; 

/**
 * Reads all xls files from nesessary folder
 * @public 
 * @param {string} path path to file
 * @param {string} encode encode name
 * @returns {Promise}
 */
const readAllFrom = (path) => {
  return new Promise((resolve, reject) => {
    fs.readdir(path, (err, files) => {
      if(err) { reject(err); }
      resolve(files)
    })
  })
  .then((files) => {
    const filePromises = 
      files.map((file) => readFrom(`${path}/${file}`));
    
    return Promise.all(filePromises);
  });
};

const XlsReader = {
  readFrom,
  readAllFrom
}

export { XlsReader }
