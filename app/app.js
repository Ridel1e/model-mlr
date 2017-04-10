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
      const modelHandler = (model) => {
        model.calculateCoefficients();
        model.calculateRSquare();
        model.calculateAutoCorrelation();
        model.calculateHomoscedasticity(2);
      };
      
      const firstModelFamily = createFirstModelFamily(trainingArgs, trainingResults);
      const secondModelFamily = createSecondModelFamily(trainingArgs, trainingResults);
      const thirdModelFamily = createThirdModelFamily(trainingArgs, trainingResults);
      const fourthModelFamily = createFourthModelFamily(trainingArgs, trainingResults);  

      firstModelFamily.forEach(modelHandler);
      secondModelFamily.forEach(modelHandler);
      thirdModelFamily.forEach(modelHandler);
      fourthModelFamily.forEach(modelHandler);

      return {
        firstModelFamily,
        secondModelFamily,
        thirdModelFamily,
        fourthModelFamily
      }
    })
    .then((modelsFamilies) => {
      /* concat all models */
      const allModels = [].concat(
        modelsFamilies.firstModelFamily,
        modelsFamilies.secondModelFamily,
        modelsFamilies.thirdModelFamily,
        modelsFamilies.fourthModelFamily
      );

      const bestModels = allModels
        .slice()
        .sort(Model.getComparator())
        .slice(0, 10);

      bestModels.forEach(printModel);
    });
}

/**
 * Prints model to console
 * @private 
 * @param {Model} model 
 */
function printModel (model, index) {
  const coefficientsString = model
    .calculateCoefficients()
    .reduce((acc, coef) => { 
      return acc += `, ${coef}` 
    }, '');

  console.log(`Model ${index}\n`);
  console.log('Коэффициенты', coefficientsString)
  console.log('R^2: ', model.calculateRSquare());
  console.log('Коэффициент Дарбина Уотсона: ', model.calculateAutoCorrelation());
  console.log('Наличие автокорреляции:', model.hasAutoCorrelation());
  console.log('Коэффициент Голфильда-Квандта:', model.calculateHomoscedasticity());
  console.log('Наличие гетероскедастичности:', model.hasHomoscedasticity());
  console.log('Наличие мультиколлинеарности:', model.hasMultiCollinearity());
  console.log('\n')

  
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
