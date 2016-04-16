const fs = require('fs');
const run = require('gulp-run');
const path = require('path');

module.exports = function(gulp) {
  const settings = require('../settings.js');
  const loadModules = require('../modules.js');
  const depend = require('../dependencies.js');
  const conf = require('../conf.js');

  const paths = settings.paths;
  var reader = depend();

  function gypConfig(modName) {
    var mod = loadModules().getModule(modName) || new conf.Conf();
    var extra = [];
    if (mod.extraSources)
      extra = mod.extraSources.map(file => `, "../../cxx/${file}"`);
    var extraInc = path.join(process.cwd(), settings.paths.inc);
    var shadow = mod.shadowed ? '_' : '';
    return {
      target_name: shadow + mod.name,
      sources: [`src/${mod.name}_wrap.cxx`].concat(extra),
      include_dirs: [settings.oce.include, extraInc, settings.paths.inc],
      libraries: ['-L' + settings.oce.lib].concat(
        (mod.libraries || reader.toolkitDepends(mod)).map(lib => '-l' + lib)),
      cflags: [
        '-DCSFDB', '-DHAVE_CONFIG_H', '-DOCC_CONVERT_SIGNALS',
        '-D_OCC64', '-Dgp_EXPORTS', '-Os', '-DNDEBUG', '-fPIC',
        '-fpermissive',
        '-DSWIG_TYPE_TABLE=occ.js'
      ],
      'cflags!': ['-fno-exceptions'],
      'cflags_cc!': ['-fno-exceptions']
    };
  }

  gulp.task('gyp-clean', function(done) {
    if (!fs.existsSync(paths.gyp)) return done();
    return run(`rm -rf ${paths.gyp}`).exec(done);
  });

  gulp.task('write-config', function(done) {
    var config = {
      targets: settings.build.modules.map(gypConfig)
    };
    fs.writeFileSync(`${settings.paths.dist}/binding.gyp`, JSON.stringify(config, null, 2));
    done();
  });

  gulp.task('gyp-configure', function(done) {
    run('node-gyp configure', {
      cwd: settings.paths.dist,
      verbosity: 0
    }).exec(done);
  });

  var exec = require('child_process').exec;
  gulp.task('gyp-build', function(done) {
    exec('node-gyp build', { cwd: paths.dist, maxBuffer: 500 * 1024 }, done);
  });
}
