import math from 'mathjs';

/**
 * mathjs lib decorator.
 * Implements matrix like an separated entity
 * @class Matrix
 */
class Matrix {

  /**
   * Creates matrix by array.
   * @public
   * @static
   * @param {Array} input
   */
  static create (input) {
    if(input instanceof Array) {
      return new Matrix(input);
    }

    throw new Error('Argument type mismatch. "Array" expected');
  }

  static get mathMatrix () {
    return math.matrix().constructor;
  }

  
  /**
   * @constructor
   * @param {Array<Array<T>>} input
   */
  constructor (input) {
    if(input instanceof Array) {
      this._matrix = math.matrix(input);
      return;
    }
    if(input instanceof Matrix.mathMatrix) {
      this._matrix = input;
      return;
    }

    throw new Error('Argument type mismatch. "Array" expected');
  }

  /**
   * Returns array of data
   * @public 
   * @returns {Array<Array<T>>}
   */
  toArray () {
    return this._matrix._data;
  }

  /**
   * Returns matrix column by index
   * @public
   * @param {number} columnIndex
   * @returns {Array}
   */
  getColumn (columnIndex) {
    return this
      ._matrix
      ._data
      .map((line) => line[columnIndex]);
  }

  
  /**
   * Returns matrix row by index
   * @public
   * @param {number} rowIndex 
   * @returns {Array}
   */
  getRow (rowIndex) {
    return this
      ._matrix
      ._data[rowIndex];
  }

  /**
   * Returns size of matrix
   * @public 
   * @returns {number}
   */
  size () {
    return this._matrix._size;
  }

  /**
   * Returns result of matrix multiplication
   * @public 
   * @param {Matrix} matrix 
   * @returns {Matrix} result matrix
   */
  multiply (matrix) {
    const result = math.multiply(this._matrix, matrix._matrix);

    return new Matrix(result);
  }

  /**
   * Returns new inversed matrix
   * @public 
   * @returns {Matrix} inversed matrix
   */
  inverse () {
    const result = math.inv(this._matrix);

    return new Matrix(result);
  }

  /**
   * Returns new transposed matrix
   * @public
   * @returns {Matrix} transposed matrix
   */
  transpose () {
    const result = math.transpose(this._matrix);

    return new Matrix(result);
  }

  /**
   * Returns new matrix with mapped elements
   * @public 
   * @param {Function} callback
   * @returns {Matrix} mapped matrix
   */
  map (callback) {
    const result = math.map(this._matrix, callback);

    return new Matrix(result);
  }

  /**
   * Returns det of matrix
   * @public 
   * @returns {number}
   */
  det () {
    return math.det(this._matrix);
  }
}

export { Matrix }
