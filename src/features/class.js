const features = require('../features.js');

function renderArg(arg) {
  var res = arg.decl + ' ' + arg.name;
  // TODO: pythonocc removes byrefs on gp module...
  // res = res.replace('&', '')
  if (arg.default) {
    res += '=' + arg.default;
  }
  return res;
}


function renderFunction(func) {
  var source = func.source();
  var args = source.arguments.map(renderArg).join(', ');
  var stat = func.static ? 'static ' : '';
  var cons = func.const ? 'const ' : '';
  return `
    %feature("compactdefaultargs") ${source.name};
    ${stat}${cons}${source.returnType + ' '}${source.name}(${args});`;
}

function renderClass(cls, parts) {
  if (cls.cls !== 'class') return false;
  var srcCls = cls.source();
  var base = '';
  if (srcCls.bases.length > 0) {
    base = ' : ' + srcCls.bases[0].access + ' ' + srcCls.bases[0].name;
  }
  const constructors = cls.declarations
    .filter((mem) => mem.cls === 'constructor')
    .map(renderFunction).join('\n');

  const functions = cls.declarations
    .filter((mem) => mem.cls !== 'constructor')
    .map(renderFunction).join('\n');

  const src = `\
%nodefaultctor ${srcCls.name};
class ${srcCls.name}${base} {
	public:
    /* Constructors */
    ${constructors}
    /* Member functions */
    ${parts.get(cls.name + 'Properties')}
    ${functions}
};`;
  return [{
    name: 'classIncludes',
    src: `%include classes/${srcCls.name}.i`
  }, {
    name: `classes/${srcCls.name}.i`,
    src
  }];
}

features.registerRenderer('swig', 50, renderClass);
