
class Set {
  /**
   * Retuns list of subset generated by
   * original vector
   * @public 
   * @static
   * @param {Array} original list of T
   * @returns {Array} 
   */
  static generateSubsetsOf (original) {
    const booleanVector = original.map((item) => false);
    const sets = [];

    let isFinalVector = false;

    while (!isFinalVector) {
      for (let i = booleanVector.length -1; i >= 0; i--) {

        const element = booleanVector[i];
        booleanVector[i] = !element;

        if (!element) { break; }
      }

      sets.push(Set.createSetFromVector(booleanVector, original));       
      isFinalVector = Set._hasVectorAllTrueValues(booleanVector);
    }

    return sets;
  }

  /**
   * Returns all subsets with nesessary element count
   * @public 
   * @static 
   * @param {Array} original 
   * @param {number} elemCount 
   * @returns {Array} subsets
   */
  static generateSubsetsWithElementCount (original, elemCount) {
    return Set
      .generateSubsetsOf(original)
      .filter((subset) => subset.count() === elemCount);
  }

  /**
   * Returns true if vector has only 'true' values
   * @private 
   * @static 
   * @param {Array} vector 
   * @returns {boolean} 
   */
  static _hasVectorAllTrueValues (vector) {
    const trueValuesCount = 
      vector.filter((item) => item === true).length;
  
    return vector.length === trueValuesCount;
  }

  /**
   * Retruns set created from boolean vector
   * @public 
   * @static 
   * @param {Array<boolean>} vector 
   * @param {Array<T>} data 
   * @returns {Set} 
   */
  static createSetFromVector (vector, data) {
    const result = vector.reduce((array, item, index) => {
      if(item) { array.push(data[index]); }

      return array;
    }, []);

    return new Set(result);
  }

  /**
   * @constructor
   * @param {Array} original original data array
   */
  constructor (original) {
    this._original = original;
  }

  /**
   * Returns array view of set
   * @public 
   * @returns {Array}
   */
  toArray () {
    return this._original;
  }

  /**
   * Returns set element count
   * @public 
   * @returns {number} description
   */
  count () {
    return this._original.length
  }
}

export { Set }
