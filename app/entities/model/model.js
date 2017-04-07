import { Set } from '../set';
import math from 'mathjs';

class Model {
  /**
   * Returns list of models by 
   * args, results and model process callback
   * @public
   * @static
   * @param {Array} args list of arguments
   * @param {Array} results list of results
   * @param {Function} callback model process callback
   * @returns {Array} list of models
   */
  static produceModelsFamily (args, results, callback) {
    const allSubSets = Model._generateAllSubsets(args);
    const inputs = Model._createInputs(allSubSets);
    const normalizedInputs = Model._normalizeInputs(inputs);

    return normalizedInputs
      .map((input) => new Model(input, results, callback));
  }

  /**
   * Returns list of all possible subsets
   * @private 
   * @static 
   * @param {Array} args
   * @returns {Array} list of all possible subsets
   */
  static _generateAllSubsets (args) {
    const allSubSets = [];
    const allSubSetsLength = args[0].length;
    
    for(let i = 0; i < allSubSetsLength; i++) {
      const argsRow = args.map((arg) => arg[i]);
      allSubSets.push(Set.generateSubsetsOf(argsRow));
    }

    return allSubSets;
  }

  /**
   * Create all inputs data from subsets 
   * @private 
   * @static 
   * @param {Array} allSubSets 
   * @returns {Array}
   */
  static _createInputs (allSubSets) {
    const inputs = [];
    const inputsLength = allSubSets[0].length;

    for(let i = 0; i < inputsLength; i++) {
      const input = allSubSets.map((subsets) => subsets[i].toArray());
      inputs.push(input);
    }

    return inputs;
  }

  static _normalizeInputs (inputs) {
    return inputs.map((input) => input.map((row) => [1].concat(row)))
  }

  /**
   * @constructs
   * @param {Array} args list of arguments
   * @param {Array} results list of results
   * @param {Function} callback model process callback
   */
  constructor (args, results, callback) {
    this._inputs = math.matrix(args);
    this._outputs = 
      math.matrix(results.map(result => [result]));
    this._callback = callback;
  }

  /**
   * Calculates model coefficients
   * By least square method
   * @public
   */
  calculateCoefficients () {

    const modifiedInputs = this._applyCallbackToInputs();
    const transposedInputs = math.transpose(modifiedInputs);
    
    let result = math.multiply(transposedInputs, modifiedInputs);
    result = math.inv(result);
    result = math.multiply(result, transposedInputs);
    result = math.multiply(result, this._outputs);

    this._coefficients = 
      this._getCoefficientsArrayByMatrix(result);

    return this._coefficients;
  }


  /**
   * Returns estimated y by inputs
   * @public
   * @param {Array} args
   * @returns {number}
   */
  predictY (args) {
    const predictedY = 
      args.reduce((acc, arg, index) => {
        const tmp = this._callback(arg) * this._coefficients[index];
        return acc += tmp;
      }, 0);

    return predictedY;
  }

  /**
   * Calculates determitation coeffitient
   * @public
   * @returns {number} R square
   */
  calculateRSqr () {

    const rss = this._calculateRss();
    const tss = this._calculateTss();

    this._rSqr = 1 - rss / tss;

    return this._rSqr;
  }

  /**
   * Calculates auto correlation by Darbin Watson test
   * @public 
   * @returns {number}
   */
  calculateAutoCorrelation () {
      const inputsArray = this._inputs._data;

      let seqSum = 0;

      for (let i = 1; i < inputsArray.length; i++) {
        const eDifference = this._getE(i) - this._getE(i - 1);

        seqSum += math.square(eDifference);
      }

      const sumE = this._getSumE();

      this._DW = seqSum / sumE

      return this._DW;
  }

  /**
   * Returns true if model has auto correlation
   * @public 
   * @returns {boolean}
   */
  hasAutoCorrelation () {
    const isNormalValue = this._DW > Model.DL &&
                          this._DW > Model.DU &&
                          this._DW < 4 - Model.DU; 

    return !isNormalValue;
  }

  /**
   * Returns true if model has multy collinearity
   * @public 
   * @returns {boolean}
   */
  hasMultiCollinearity () {

  }

  /**
   * Returns calculated coefficients.
   * @public
   * @returns {Array} coefficients
   */
  get coefficients () {
    return this._coefficients;
  }

  /**
   * Returns determination coefficient
   * @public 
   * @returns {number}
   */
  get rSqr () {
    return this._rSqr;
  }

  /**
   * Returns Dl value from table
   * @static 
   * @returns {number}
   */
  static get DL () {
    return 1.53;
  }

  /**
   * Returns Du value from table
   * @static 
   * @returns {number}
   */
  static get DU () {
    return 1.74;
  }

  /**
   * Returns residual sum of squares
   * @private 
   * @returns {number} rss
   */
  _calculateRss () {
    const inputsArray = this._inputs._data;
    const outputsArray = this._outputs._data;
    
    const rss = inputsArray
      .reduce((acc, input, index) => {
        const predictedY = this.predictY(input);
        const realY = outputsArray[index][0];

        return acc += math.square(realY - predictedY);
      }, 0);
    
    return rss;
  }

  /**
   * Returns common dispersion
   * @private 
   * @returns {number} tss
   */
  _calculateTss () {
    const inputsArray = this._inputs._data;
    const outputsArray = this._outputs._data;

    const realYSum = outputsArray
      .reduce((acc, output) => {
        const realY = output[0];

        return acc += realY;
      }, 0);
    const averageY = realYSum / outputsArray.length;  
    
    const tss = outputsArray
      .reduce((acc, output) => {
        const realY = output[0];

        return acc + math.square(realY - averageY); 
      }, 0);

    return tss;
  }

  /**
   * Returns e by index.
   * e = y - y(x)
   * @private
   * @param {number} i index
   * @returns {number}
   */
  _getE (i) {
    const inputsArray = this._inputs._data;
    const outputsArray = this._outputs._data;

    const realY = outputsArray[i][0];
    const predictedY = this.predictY(inputsArray[i]);

    return realY - predictedY;
  }

  _getSumE () {
    const inputsArray = this._inputs._data;
    const outputsArray = this._outputs._data;

    const sumE = inputsArray
      .reduce((acc, input, index) => {
        const e = this._getE(index);
        return acc += math.square(e);
      }, 0);

    return sumE;  
  }

  /**
   * Returns modified inputs data by callback
   * @private
   */
  _applyCallbackToInputs () {
    return math
      .map(this._inputs, (item, cell) => {
        const col = cell[1];

        if(col === 0) { return item; }
        return this._callback(item);
      })
  }
  
  /**
   * Retuns coefficients array by matrix
   * @private 
   * @param {Matrix} matrix
   * @returns {Array}
   */
  _getCoefficientsArrayByMatrix (matrix) {
    const coefficients = [];
    math
      .forEach(matrix, (item) => coefficients.push(item));

    return coefficients;
  }
}

export { Model }
