import { DataProvider } from './services/data-provider';
import { Model } from './entities/newModel';
import { Set } from './entities/set';
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

      firstModelFamily.forEach(_handleModel);
      secondModelFamily.forEach(_handleModel);
      thirdModelFamily.forEach(_handleModel);
      fourthModelFamily.forEach(_handleModel);

      /* need refactor input */
      return {
        models: {
          firstModelFamily,
          secondModelFamily,
          thirdModelFamily,
          fourthModelFamily
        },
        data: {
          training: { args: trainingArgs, results: trainingResults },
          test: { args: testArgs, results: testResults }
        }
      }

    })
    .then((res) => {
      /* concat all models */
      const allModels = [].concat(
        res.models.firstModelFamily,
        res.models.secondModelFamily,
        res.models.thirdModelFamily,
        res.models.fourthModelFamily
      );

      const bestModels = allModels
        .slice()
        .sort(Model.getComparator())
        .slice(0, 10);

      const possibleModelsPairs = Set
        .generateSubsetsWithElementCount(bestModels, 2);
      const output = res.data.training.results;
      const modelsMap = [];

      const newModels =  possibleModelsPairs
        .map((modelsPair) => {
          const input = _createInputByModelSet(modelsPair);

          const newModel = new Model(input, output, (x) => x);

          /* saving */
          modelsMap.push({
            modelsPair,
            model: newModel
          });

          return newModel;
        });

      newModels.forEach(_handleModel);

      /* choose best model */
      const bestNewModel = newModels
        .slice()
        .sort(Model.getComparator())[0];

      const bestModelsPair = modelsMap
        .filter((object) => object.model === bestNewModel)[0]
        .modelsPair;

      /* step 6 */
      const testArgs = res.data.test.args;
      const testResults = res.data.test.results;
      
      const newTestArgs = [];

      for (let i = 0; i < testResults.length; i++) {
        const xArray = testArgs
          .map((arg) => arg[i]);
        
        const completedXArray = [1].concat(xArray);
        const models = bestModelsPair.toArray();
        
        const newArgRow = models
          .map((model) => model.predictY(completedXArray));

        const completedArgRow = [1].concat(newArgRow);

        newTestArgs.push(completedArgRow); 
      }

      for (let i = 0; i < newTestArgs.length; i++) {
        const xArray = newTestArgs[i];

        const predictedY = bestNewModel.predictY(xArray);
        const realY = testResults[i];

        console.log('******');
        console.log(`Предсказанное: ${predictedY}`);
        console.log(`Реальное: ${realY}`);
      }
    
    });
}

/**
 * Returns input data by model set
 * @private 
 * @param {Set<Model>} modelSet 
 * @returns {Array<Array<T>>} description
 */
function _createInputByModelSet (modelSet) {
  const args = modelSet
    .toArray()
    .map((model) => model.getAllPredictions());

  const input = [];
  const length = args[0].length;

  for(let i = 0; i < length; i++) {
    const inputRow = args.map((column) => column[i]);
    input.push(inputRow);
  }

  const completedInput = input
    .map((input) => [1].concat(input));

  return completedInput;
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
