import { DataProvider } from './services/data-provider';
import { Model } from './entities/newModel';
import { Set } from './entities/set';
import Path from 'path';
import Parallel from 'paralleljs';

/* Data paths */
const ARGS_FOLDER_PATH = _resolvePath('./data/args');
const RESULTS_FOLDER_PATH = _resolvePath('./data/results');
const TRAINING_DATA_PERSENT = 0.6; 
const NECESSARY_MODEL_COUNT = 10;

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

      firstModelFamily.forEach(_handleModel);
      secondModelFamily.forEach(_handleModel);
      thirdModelFamily.forEach(_handleModel);
      fourthModelFamily.forEach(_handleModel);

      /* concat all models */
      const allModels = [].concat(
        firstModelFamily,
        secondModelFamily,
        thirdModelFamily,
        fourthModelFamily
      );  
      
      /* get 10 best models */
      const bestModels = allModels
        .slice()
        .sort(Model.getComparator())
        .slice(0, NECESSARY_MODEL_COUNT);

      /* generate all possible model pairs */  
      const possibleModelsPairs = Set
        .generateSubsetsWithElementCount(bestModels, 2);

      /* creating new models by models pair */  
      const mapModelToPair = {};  
      const newModels = possibleModelsPairs.map((pair) => {
        const elementHandler = (x) => x;
        const input = _createInputByModelSet(pair);
        const newModel = new Model(input, trainingResults, elementHandler);
        /* saving to map */
        mapModelToPair[newModel.hash] = pair;

        return newModel;
      });
      newModels.forEach(_handleModel);

      /* choose best model */
      const bestModel = newModels
        .slice()
        .sort(Model.getComparator())[0];
      const bestPair = mapModelToPair[bestModel.hash];  
      
      /* test best model with tests arguments */
      const newInput = _createInputByModelSet(bestPair, testArgs);
     
      const predictions = 
        _testModel(bestModel, newInput, testResults);
      
      _printPredictions(predictions);
    })
}

/**
 * Returns input data by model set
 * @private 
 * @param {Set<Model>} modelSet 
 * @returns {Array<Array<T>>} description
 */
function _createInputByModelSet (modelSet, args) {
  const models = modelSet.toArray();

  if(args) {
    return _createInputByModelsAndArgs(models, args);
  }

  return _createInputByInnerModelsResults(models);
}

/**
 * Returns input data by inner models y
 * @private 
 * @param {Array<Models>} models
 * @returns {Array<Array<T>>}
 */
function _createInputByInnerModelsResults (models) {
  const allArgs = models.map((model) => model.getAllPredictions());

  const input = [];
  const inputLength = allArgs[0].length;

  for(let i = 0; i < inputLength; i++) {
    const inputRow = allArgs.map((args) => args[i]);
    input.push(inputRow);
  }

  const completedInput = _addOneInBegin(input);

  return completedInput;
}

/**
 * Returns input data created by models and args
 * @private 
 * @param {Array<Models>} models 
 * @param {Array<Array<T>>} args 
 * @returns {Array<Array<T>>} description
 */
function _createInputByModelsAndArgs (models, allArgs) {
  const input = [];
  const inputLength = allArgs[0].length;

  for(let i = 0; i < inputLength; i++) {
    const argsRow = allArgs.map((args) => args[i]);
    const completedArgsRow = [1].concat(argsRow);
    
    const newArgsRow = models
      .map((model) => model.predictY(completedArgsRow));
    const completedNewArgsRow = [1].concat(newArgsRow);

    input.push(completedNewArgsRow);
  }

  return input;
}

/**
 * Returns new array with 1 number at begin of all rows
 * @private
 * @param {Array<Array<T>>} arrays
 * @returns {Array<Array<T>>}
 */
function _addOneInBegin (arrays) {
  return arrays.map((array) => [1].concat(array));
}

/**
 * Returns yReal - yPredicted paris
 * @private 
 * @param {Model} model
 * @param {Array<Array<T>>} input
 * @param {Array<T>} output
 * @returns {Array<Object>} paris
 */
function _testModel (model, input, output) {
  return input.map((row, index) => {
    const predictedY = model.predictY(row);
    const realY = output[index];

    return { predictedY, realY };
  });
}

/**
 * Start model calculation
 * @private
 * @param {Model} model handled model
 */
function _handleModel (model) {
  model.calculateCoefficients();
  model.calculateRSquare();
  model.calculateAutoCorrelation();
  model.calculateHomoscedasticity(2);
}

/**
 * Prints model to console
 * @private 
 * @param {Model} model 
 */
function _printModel (model, index) {
  const coefficients = model
    .calculateCoefficients()
    .reduce((acc, coef) => { return acc += `${coef}, ` }, '');

  console.log(`Model ${index}\n`);
  console.log('Коэффициенты', coefficients)
  console.log('R^2: ', model.calculateRSquare());
  console.log('Коэффициент Дарбина Уотсона: ', model.calculateAutoCorrelation());
  console.log('Наличие автокорреляции:', model.hasAutoCorrelation());
  console.log('Коэффициент Голфильда-Квандта:', model.calculateHomoscedasticity(2));
  console.log('Наличие гетероскедастичности:', model.hasHomoscedasticity(2));
  console.log('Наличие мультиколлинеарности:', model.hasMultiCollinearity());
  console.log('\n');

}

/**
 * Prints predictions to console
 * @private 
 * @param {Array<Object>} predictions
 */
function _printPredictions (predictions) {
  predictions.forEach((prediction) => {
    console.log('******')
    console.log('Предсказанное значение: ', prediction.predictedY);
    console.log('Реальное значение: ', prediction.realY);
    console.log('\n');
  })
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
