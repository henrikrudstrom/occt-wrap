const extend = require('extend');
const features = require('../features');


function typemap(native, wrapped, renderer, options) {
  if (!this.typemaps)
    this.typemaps = [];

  var map = { native, wrapped, renderer };
  extend(map, options);
  this.typemaps.push(map);
  features.registerTypemap(map);
}

features.registerConfig(typemap);


// ----------------------------------------------------------------------------
// Swig rendering
// ----------------------------------------------------------------------------

function withAccessor(input, output, native, wrapped, getter) {
  var message = `in method '" "$symname" "', argument " "$argnum"" of type '" "${wrapped}""'`;
  return `void *argp ;
  int res = SWIG_ConvertPtr(${input}, &argp, SWIGTYPE_p_${wrapped},  0 );
  if (!SWIG_IsOK(res)) {
    SWIG_exception_fail(SWIG_ArgError(res), "${message}");
  }
  ${output} = (${native} *)&((const ${wrapped} *)(argp))->${getter};`;
}

function withConstructor(input, output, native, wrapped) {
  var arg = `(new ${wrapped}((const ${native} &) ${input}))`;
  var obj = `SWIG_NewPointerObj(${arg}, SWIGTYPE_p_${wrapped}, SWIG_POINTER_OWN |  0);`;
  return `${output} = ${obj}`;
}

features.registerTypemapRenderer('member-object', function convertTypeRenderer(tm) {
  return {
    toNative(input, output) {
      return withAccessor(input, output, tm.native, tm.wrapped, 'XYZ()');
    },
    toWrapped(input, output) {
      return withConstructor(input, output, tm.native, tm.wrapped);
    }
  };
});

function renderTypemap(tm) {
  var native = tm.native;
  var render = features.getTypemapRenderer(tm);

  if (!render) return '';

  return `
#include <${native}.hxx>
%typemap(in) const ${native} &{
  // typemap inmap
  ${render.toNative('$input', '$1')}
}
%typemap(out) ${native} {
  //typemap outmap
  ${render.toWrapped('$1', '$result')}
}
`;
}


function renderTypemaps(decl) {
  if (!decl.typemaps) return false;

  var src = decl.typemaps
    .map(tm => renderTypemap(tm)).join('\n');

  return { name: 'typemaps.i', src };
}

features.registerRenderer('swig', 0, renderTypemaps);
