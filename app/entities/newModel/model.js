import { Set } from '../set';
import { Matrix } from '../matrix';
import math from 'mathjs';
import hash from 'object-hash';

class Model {
  /* static */

  /**
   * Returns list of models
   * @public 
   * @static 
   * @param {Array<Array<T>>} inputs 
   * @param {Array<T>} output 
   * @param {Function} elementHandler 
   * @returns {Array<Model>}
   */
  static produceModelsFamily (rawInputs, output, elementHandler) {
    const allSubsets = Model._generateAllSubsets(rawInputs);
    const inputs = Model._createInputsFromSets(allSubsets);
    const completedInputs = Model._addFirstArgument(inputs);

    return completedInputs
			.map((input) => 
				new Model(input, output, elementHandler));
  }

  /**
   * Returns model compare functions. 
   * Best models will be in top of array
   * @public 
   * @static 
   * @returns {Function}
   */
  static getComparator () {
    return (modelA, modelB) => {
      /* R^2 comparision */
      const distanceA = 1 - modelA.calculateRSquare();
      const distanceB = 1 - modelB.calculateRSquare();

      const delta = Math.abs(distanceA - distanceB);
      
      if(delta > 0.1) { return distanceA - distanceB; }

      /* autocorrelation comparision */
      const autoCorrComparision = 
        booleanToNumber(modelA.hasAutoCorrelation(), modelB.hasAutoCorrelation());

      if(autoCorrComparision !== 0) { return autoCorrComparision; }

      /* homoscedasticity comparision */
      const homoscedasticity =
        booleanToNumber(modelA.hasHomoscedasticity(), modelB.hasHomoscedasticity());

      if(homoscedasticity !== 0) { return homoscedasticity; }

      /* homoscedasticity comparision */
      const multiCollinearity =
        booleanToNumber(modelA.hasMultiCollinearity(), modelB.hasMultiCollinearity());

      if(multiCollinearity !== 0) { return multiCollinearity; }
    }

    function booleanToNumber (a , b) {
      return a === b ? 0 : a ? 1 : -1;
    }
  }

  /**
   * Returns list with all possible subsets
   * @private 
   * @static 
   * @param {Array} inputs
   * @returns {Array<Array<Set>>}
   */
  static _generateAllSubsets (inputs) {
    const allSubsets = [];
    const length = inputs[0].length;

    for(let i = 0; i < length; i++) {
      const inputRow = 
        inputs.map((input) => input[i]);
      const subsets = Set.generateSubsetsOf(inputRow);

      allSubsets.push(subsets);
    }

    return allSubsets;
  }
  
  /**
   * Returns list of input from sets
   * @private 
   * @static 
   * @param {Array<Array<Set>>} sets 
   * @returns {Array<Array<T>>}
   */
  static _createInputsFromSets (allSets) {
    const inputs = [];
    const length = allSets[0].length;

    for(let i = 0; i < length; i++) {
      const input = allSets
        .map((sets) => sets[i].toArray());

      inputs.push(input);
    }

    return inputs;
  }

  /**
   * Adds 1 digit before each input
   * @private 
   * @static 
   * @param {Array<Array<T>} inputs 
   * @returns {Array<Array<T>}
   */
  static _addFirstArgument (inputs) {
    return inputs
      .map((input) => input.map((row) => [1].concat(row)));
  }

  /**
   * Returns Dl value from table
   * @static 
   * @returns {number}
   */
  static get _DL () { return 1.53; }

  /**
   * Returns Du value from table
   * @static 
   * @returns {number}
   */
  static get _DU () { return 1.74; }

  /**
   * Returns Fisher value from table
   * @static 
   * @returns {number}
   */
  static get _FISHER_VALUE () { return 2.98; }

  /**
   * Rerutns Hi Square
   * @static 
   * @returns {number}
   */
  static get _X_SQUARE () { return 16.8; }

  /* PROTOTYPE */

  /**
   * @constructor
   * @param {Array<Array<T>>} input 
   * @param {Array<T>} output 
   * @param {Function} elementHandler 
   */
  constructor (input, output, elementHandler) {
    const modifiedOutput = output.map((item) => [item]);

    this._input = new Matrix(input);
    this._output = new Matrix(modifiedOutput);
    this._elementHandler = elementHandler;
    this.hash = hash(this);
  }

  /**
   * Calculate and returns model coefficients
   * @public 
   * @returns {Array<T>} coefficients
   */
  calculateCoefficients () {
    if (this._coefficients) { 
      return this._coefficients; 
    }

    const modifiedInputs = this._applyElementsHandler();
    const transposedInputs = modifiedInputs.transpose();

    const result = transposedInputs
      .multiply(modifiedInputs)
      .inverse()
      .multiply(transposedInputs)
      .multiply(this._output);
    

    this._coefficients = result.getColumn(0);

    return this._coefficients;
  }

  /**
   * Returns R^2 coefficient (determination coefficient)
   * @public
   * @returns {number} R^2 coefficient
   */
  calculateRSquare () {
    if(this._rSquare) { return this._rSquare; }

    const lines = this._getLines();
    const column = this._output.getColumn(0);

    const rss = this._getSumE(lines);
    const dispersion = this._getDispersion(column);

    this._rSquare = 1 - rss / dispersion;

    return this._rSquare;
  }

  /**
   * Calculates auto correlation by Darbin Watson test
   * @public 
   * @returns {number}
   */
  calculateAutoCorrelation () {
    if(this._DW) { return this._DW; }

    const lines = this._getLines();
    let sequenceSum = 0;

    for(let i = 1; i < lines.length; i++) {
      const eDifference = 
        this._getE(lines[i]) - 
        this._getE(lines[i - 1]);

      sequenceSum += math.square(eDifference);
    }

    const sumE = this._getSumE(lines);

    this._DW = sequenceSum / sumE;

    return this._DW;
  }

  /**
   * Returns true if model has auto correlation
   * @public 
   * @returns {boolean}
   */
  hasAutoCorrelation () {
    const normalValue = this._DW > Model._DL &&
                        this._DW > Model._DU &&
                        this._DW < 4 - Model._DU;
                        
    return !normalValue;
  }

  /**
   * Returns result of Goldfeld–Quandt test
   * @public 
   * @returns {number}
   */
  calculateHomoscedasticity (argIndex) {
    if (this._homoscedasticity) {
      return this._homoscedasticity;
    }

    const lines = this._getLines();
    const sortedLines = lines
      .slice()
      .sort((lineA, lineB) => lineA[argIndex] - lineB[argIndex]);

    const sublistSize = Math.round(sortedLines.length / 3);

    const beginList = sortedLines.slice(0, sublistSize);
    const endList = sortedLines.slice(sortedLines.length - sublistSize);

    const beginListResult = this._getSumE(beginList);
    const endListResult = this._getSumE(endList);

    this._homoscedasticity = beginListResult / endListResult;

    return this._homoscedasticity;
  }

  /**
   * Returns true if model has homoscedasticity
   * @public 
   * @returns {boolean}
   */
  hasHomoscedasticity (argIndex) {
    const homoscedasticity = this.calculateHomoscedasticity(argIndex);

    return homoscedasticity > Model._FISHER_VALUE;
  }

  /**
   * Returns true if model has multy collinearity
   * @public 
   * @returns {boolean}
   */
  hasMultiCollinearity () {
    if (this._hiCalc) { 
      return this._hiCalc > Model._X_SQUARE; 
    }

    const columns = this._input.transpose().toArray();
    
    let normalizedColumns = columns
      .map((column) => this._normalize(column))
      .slice(1);

    const newMatrix = new Matrix(normalizedColumns).transpose();

    const resultMatrix = newMatrix
      .transpose()
      .multiply(newMatrix);

    const freedomDegree = this._countFreedomDegree();
    const multiplier = math.log(Math.E, resultMatrix.det());
    
    const result =  - freedomDegree * multiplier;  
    
    this._hiCalc = result;
    
    return this._hiCalc > Model._X_SQUARE;   
  }

  /**
   * Returns estimated y by inputs
   * @public 
   * @param {Array} input 
   * @returns {number}
   */
  predictY (input) {
    // return input.reduce((acc, x, index) => {
    //   return acc + this._coefficients[index] * this._elementHandler(x);
    // }, 0);
    return this._coefficients.reduce((acc, coef, index) => {
      return acc + coef * this._elementHandler(input[index]);
    }, 0);
  }

  /**
   * Returns all predicted y
   * @public 
   * @returns {Array}
   */
  getAllPredictions () {
    const inputsArray = this._input.toArray();

    return inputsArray.map((input) => this.predictY(input));
  }

  /* PRIVATE */

  /**
   * Returns e = y - y(x)
   * @private 
   * @param {Array} line 
   * @returns {number} e
   */
  _getE (line) {
    const realY = line[line.length - 1];
    const xArray = line.slice(0, line.length - 1);

    const predictedY = this.predictY(xArray);

    return realY - predictedY;
  }

  /**
   * Returns freedom degree of model
   * @private 
   * @returns {number}
   */
  _countFreedomDegree () {
    const size = this._input.size();
    const n = size[0];
    const m = size[1] - 1;

    return n - 1 - 1/6 * (2 * m + 5);
  }

  /**
   * Returns normalized array (value - average / sqrt of  n * dispersion)
   * @private 
   * @param {Array<T>} column 
   * @returns {Array<T>}
   */
  _normalize (column) {
    const average = this._getAverage(column);
    const dispersion = this._getDispersion(column);

    return column.map((item) => {
      return (item - average) / Math.sqrt(column.length * dispersion);
    });
  }

  /**
   * Returns sum of (y - y(x))^2 
   * @private 
   * @param {Array} lines 
   * @returns {number} sum of e
   */
  _getSumE (lines) {
    return lines.reduce((acc, line) => { 
      return acc + math.square(this._getE(line)) 
    }, 0);
  }

  /**
   * Returns common dispersion
   * @private 
   * @param {Array} column 
   * @returns {number}
   */
  _getDispersion (column) {
    const average = this._getAverage(column);

    return column
      .reduce((acc, x) => { 
        return acc + math.square(x - average); 
      }, 0);
  }

  /**
   * Returns average of data
   * @private 
   * @param {Array} column 
   * @returns {number}
   */
  _getAverage (list) {
    const listSum = 
      list.reduce((acc, x) => { 
        return acc + x 
      }, 0);

    return listSum / list.length;
  }

  /**
   * Returns arguments row with y as last element
   * @private 
   * @returns {Array<Array<T>>} description
   */
  _getLines () {
    const inputsArray = this._input.toArray();
    const outputArray = this._output.getColumn(0); 

    return inputsArray
      .map((input, index) => input.concat(outputArray[index]));
  }

  /**
   * Returns new matrix with modified elements
   * @private 
   * @returns {Matrix}
   */
  _applyElementsHandler () {
    return this
      ._input
      .map((item, cell) => {
        const col = cell[1];

        if(col === 0) { return item; }
        return this._elementHandler(item);
      })
  }
}

export { Model }
