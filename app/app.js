import { DataProvider } from './services/data-provider';
import { Model } from './entities/newModel';
import Path from 'path';
import Parallel from 'paralleljs';

/* Data paths */
const ARGS_FOLDER_PATH = _resolvePath('./data/args');
const RESULTS_FOLDER_PATH = _resolvePath('./data/results');
const TRAINING_DATA_PERSENT = 0.6; 

index();

/**
 * 
 */
function index () {
  /* fetch nesessary  */
  const argsPromise =
    DataProvider.getArgsAsync(ARGS_FOLDER_PATH);
  const resultsPromise = 
    DataProvider.getResultsAsync(RESULTS_FOLDER_PATH); 

  /* waiting promise completion */
  Promise
    .all([ argsPromise, resultsPromise ])
    .then(function (data) {
      const allArgs = data[0];
      const results = data[1];
      
      const trainingDataLength = 
        getTrainingDataLength(results.length);
      
      /* spliting arrays */
      const trainingArgs = 
        allArgs.map((args) => args.slice(0, trainingDataLength));
      const trainingResults = results.slice(0, trainingDataLength);

      const testArgs = 
        allArgs.map((args) => args.slice(trainingDataLength));
      const testResults = results.slice(trainingDataLength);

      /* produce models */
      const firstModelFamily = createFirstModelFamily(trainingArgs, trainingResults);
      const secondModelFamily = createSecondModelFamily(trainingArgs, trainingResults);
      const thirdModelFamily = createThirdModelFamily(trainingArgs, trainingResults);
      const fourthModelFamily = createFourthModelFamily(trainingArgs, trainingResults);  

      const callback = (model) => {
        console.log(model.calculateCoefficients());
        console.log('R^2:', model.calculateRSquare());
        console.log('DW:', model.calculateAutoCorrelation());
        console.log('Has auto correlation:', model.hasAutoCorrelation());
        console.log('getero:', model.calculateHomoscedasticity(2));
        console.log('Has multi colleniarity:', model.hasMultiCollinearity());
      };

      const beginTime = Date.now();

      firstModelFamily.forEach(callback)
      // secondModelFamily.forEach(callback)
      // thirdModelFamily.forEach(callback)
      // fourthModelFamily.forEach(callback)
      
      const endTime = Date.now();
      console.log(endTime - beginTime, 'ms');
      /* concat all models */
      // const models = [].concat(
      //   firstModelFamily,
      //   secondModelFamily,
      //   thirdModelFamily,
      //   fourthModelFamily
      // );
    });
}

/**
 * Prints model to console
 * @private 
 * @param {Model} model 
 */
function printModel (model) {
  // let xCount

  model.coefficients.forEach()
}

/**
 * Returns first model family
 * @private
 * @param {Array} args arguments collection
 * @param {Array} results results collection
 * @returns {Array<Model>} model collectiion
 */
function createFirstModelFamily (args, results) {
  const firstModelFamilyFunc = (x) => x;
  const firstModelFamily = 
    Model.produceModelsFamily(args, results, firstModelFamilyFunc);

  return firstModelFamily;
}

/**
 * Returns second model family
 * @private
 * @param {Array} args arguments collection
 * @param {Array} results results collection
 * @returns {Array<Model>} model collectiion
 */
function createSecondModelFamily (args, results) {
  const secondModelFamilyFunc = (x) => x * x;
  const secondModelFamily =
    Model.produceModelsFamily(args, results, secondModelFamilyFunc);

  return secondModelFamily;
}

/**
 * Returns third model family
 * @private
 * @param {Array} args arguments collection
 * @param {Array} results results collection
 * @returns {Array<Model>} model collectiion
 */
function createThirdModelFamily (args, results) {
  const thirdModelFamilyFunc = (x) => x * x * x;
  const thirdModelFamily =
    Model.produceModelsFamily(args, results, thirdModelFamilyFunc);

  return thirdModelFamily;
}

/**
 * Returns fourth model family
 * @private
 * @param {Array} args arguments collection
 * @param {Array} results results collection
 * @returns {Array<Model>} model collectiion
 */
function createFourthModelFamily (args, results) {
  const fourthModelFamilyFunc = (x) => Math.log(x);
  const fourthModelFamily =
    Model.produceModelsFamily(args, results, fourthModelFamilyFunc);

  return fourthModelFamily;
}

/**
 * Returns data length for model generation
 * @private
 * @param {number} dataLength
 * @returns {number} training data length
 */
function getTrainingDataLength (dataLength) {
  return Math.round(dataLength * TRAINING_DATA_PERSENT);
} 

/* HELPER FUNCS */

/**
 * Resolves path to directory
 * @private
 * @param {string} relatedPath related path
 * @returns {string} absolute path
 */
function _resolvePath (relatedPath) {
  return Path.resolve(process.cwd(), relatedPath);
}

/**
 * Calculates average function call time
 * @private 
 * @param {Function} callback analyzed function
 * @param {number} iterationCount count of function calls
 * @param {boolean} async flag that means function returns a promise
 */
function _calculateAverageFunctionCallTime (callback, 
                                            iterationCount, 
                                            async = false) {

    const summaryTime = 0;

    for(let i = 0; i < iterationCount; i++) {
      const beginTime = Date.now();

      // if()
      const endTime = Date.now();
    }
}
