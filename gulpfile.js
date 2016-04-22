const settings = require('./src/settings.js');
settings.initialize({
  paths: {
    build: 'spec/test-proj/build',
    dist: 'spec/test-proj/dist',
    definition: 'spec/test-proj/def'
  }
});
const gulp = require('gulp');
const jasmine = require('gulp-jasmine');

const gutil = require('gulp-util');
const yargs = require('yargs');
const istanbul = require('gulp-istanbul');
require('./tasks/parse.js')(gulp);

// show line number of spec that failed
var Reporter = require('jasmine-terminal-reporter');
var reporter = new Reporter({ isVerbose: true });
var oldSpecDone = reporter.specDone;
reporter.specDone = function(result) {
  oldSpecDone(result);
  for (var i = 0; i < result.failedExpectations.length; i++) {
    gutil.log('\n' + result.failedExpectations[i].stack
      .split('\n')
      .filter((l) => !l.includes('node_modules'))
      .join('\n')
    );
  }
};
module.exports.reporter = reporter;
gulp.task('pre-test', function () {
  return gulp.src(['src/**/*.js'])
    // Covering files
    .pipe(istanbul())
    // Force `require` to return covered files
    .pipe(istanbul.hookRequire());
});
gulp.task('test', ['pre-test'], function() {
  console.log("MYTEST")
  var specSources = ['spec/*Spec.js'];
  var arg = yargs.argv.spec;
  if (arg)
    specSources = `spec/${arg}Spec.js`;
  gulp.src(specSources)
    .pipe(jasmine({
      verbose: true,
      includeStackTrace: yargs.argv.verbose,
      reporter
    }))
    .pipe(istanbul.writeReports())
    // Enforce a coverage of at least 90%
    .pipe(istanbul.enforceThresholds({ thresholds: { global: 90 } }));
});

gulp.task('test-conf', function() {
  gulp.src(['spec/confSpec.js', 'spec/dependSpec.js'])
    .pipe(jasmine({
      verbose: true,
      includeStackTrace: yargs.argv.verbose,
      reporter
    }));
});

gulp.task('test-render', function() {
  gulp.src(['spec/renderSpec.js'])
    .pipe(jasmine({
      verbose: true,
      includeStackTrace: yargs.argv.verbose,
      reporter
    }));
});
