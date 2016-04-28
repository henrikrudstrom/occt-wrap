module.exports = function(gulp) {
  const fs = require('fs');
  const run = require('gulp-run');
  const path = require('path');
  const mkdirp = require('mkdirp');
  const yargs = require('yargs');
  const exec = require('child_process').exec;
  const execSync = require('child_process').execSync;
  const hashFiles = require('hash-files');
  
  const gutil = require('gulp-util');
  const rename = require('gulp-rename');

  
  const settings = require('../src/settings.js');
  const modules = require('../src/modules.js')();
  const depend = require('../src/dependencies.js');
  const conf = require('../src/conf.js');

  const paths = settings.paths;
  var reader = depend();
  const hashPath = path.join(settings.paths.build, 'build', 'hash');

  function moduleSources(mod) {
    var sources = [];
    if (mod.extraSources)
      sources = sources.concat(mod.extraSources.map(file => `src/${file}`));
    if (!mod.noSwig)
      sources.push(`src/${mod.name}_wrap.cxx`);
    return sources;
  }

  function sourcesChanged(mod) {
    const file = path.join(hashPath, mod.name + '.hash');
    const inProgressfile = path.join(hashPath, 'tmp', mod.name + '.hash');

    var sources = moduleSources(mod).map(src => path.join(paths.build, src));

    const currentHash = hashFiles.sync({ files: sources });

    if (!fs.existsSync(file)) {
      mkdirp.sync(path.join(hashPath, 'tmp'));
      fs.writeFileSync(inProgressfile, currentHash);
      return true;
    }

    const previousHash = String(fs.readFileSync(file));

    if (yargs.argv.force || currentHash !== previousHash) {
      mkdirp.sync(path.join(hashPath, 'tmp'));
      fs.writeFileSync(inProgressfile, currentHash);
      return true;
    }

    gutil.log('Binaries for `' + mod.name + '` are up to date');
    return false;
  }

  function gypConfig(mod) {
    var sources = moduleSources(mod);
    var include = [
      settings.oce.include,
      path.join(process.cwd(), settings.paths.inc),
      settings.paths.inc
    ].concat(mod.extraIncludes || []);

    var shadow = mod.shadowed ? '_' : '';

    return {
      target_name: shadow + mod.name,
      sources,
      include_dirs: include,
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

  gulp.task('gyp-configure', function(done) {
    var config = {
      targets: settings.build.modules
        .map(modName => modules.getModule(modName) || new conf.Conf())
        .filter(sourcesChanged)
        .map(gypConfig)
    };
    if (config.targets.length === 0) {
      gutil.log('all binaries up to date, use `gulp build --force` to force rebuild');
      var cmd = `rm -f ${settings.paths.build}/binding.gyp`
      return run(cmd).exec(done);
    }

    fs.writeFileSync(`${settings.paths.build}/binding.gyp`, JSON.stringify(config, null, 2));

    run('node-gyp configure', {
      cwd: settings.paths.build,
      verbosity: 0
    }).exec(done);
  });


  gulp.task('gyp-build', function(done) {
    if (!fs.existsSync(`${settings.paths.build}/binding.gyp`))
      return done();
    const options = { cwd: paths.build, maxBuffer: 500 * 1024 };
    exec('node-gyp build --jobs 4', options, (error, stdout, stderr) => {
      process.stdout.write(stdout);
      if (error) {
        process.stdout.write(stderr);
        return done(error);
      }
      execSync(`mv ${path.join(hashPath, 'tmp')}/*.hash ${hashPath}`);
      return done();
    });
  });
  
  gulp.task('copy-gyp', function(done) {
    return gulp.src(`${settings.paths.build}/build/Release/*.node`)
      .pipe(rename({ dirname: '' }))
      .pipe(gulp.dest(`${settings.paths.build}/lib/`));
  });
}
