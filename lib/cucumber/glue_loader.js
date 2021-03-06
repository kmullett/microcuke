var path = require('path');
var glob = require('glob').sync;
var StepDefinition = require('./step_definition');
var Hook = require('./hook');

module.exports = function GlueLoader() {
  /**
   * Loads a Glue object from the gluePath.
   * The glueFactory is used to construct the Glue
   * object.
   *
   * How this is done is very different from language to language.
   *
   * Languages with closure/lambda/block/anonymous functions can define a DSL
   * similar to Microcuke - calling a global function passing in
   * a regexp and a block of code.
   *
   * Other languages will typically have to use regular fuctions, and annotate them.
   *
   * Loading the step definitions will require reflection or simply loading and executing
   * files in a particular path.
   */
  this.loadGlue = function (gluePath, glueFactory) {
    var stepDefinitions = [];
    var hooks = [];

    var originalGlobals = {};

    function registerGlobals(keywords, value) {
      keywords.forEach(function (keyword) {
        originalGlobals[keyword] = global[keyword];
        global[keyword] = value;
      });
    }

    function registerStepdef(regexp, bodyFn) {
      stepDefinitions.push(new StepDefinition(regexp, bodyFn, getLocationOfCaller()));
    }

    function registerBeforeHook(bodyFn) {
      hooks.push(new Hook(bodyFn, getLocationOfCaller(), "before"));
    }

    function registerAfterHook(bodyFn) {
      hooks.push(new Hook(bodyFn, getLocationOfCaller(), "after"));
    }

    registerGlobals(['Given', 'When', 'Then', 'And', 'But'], registerStepdef);
    registerGlobals(['Before'], registerBeforeHook);
    registerGlobals(['After'], registerAfterHook);

    glob(gluePath + "/**/*.js").forEach(function (glueFilePath) {
      var resolvedGlueFilePath = path.resolve(glueFilePath);
      require(path.resolve(resolvedGlueFilePath));
    });

    for (var keyword in originalGlobals) {
      global[keyword] = originalGlobals[keyword];
    }

    return glueFactory(stepDefinitions, hooks);
  };
};

function getLocationOfCaller() {
  // Grab the 4th line of the stack trace, then grab the part between parentheses,
  // which is of the pattern path:line:column. Split that into 3 tokens.
  var pathLineColumn = new Error().stack.split('\n')[3].match(/\((.*)\)/)[1].split(':');
  return {
    path: path.relative(process.cwd(), pathLineColumn[0]),
    line: parseInt(pathLineColumn[1]),
    column: parseInt(pathLineColumn[2])
  };
}

