var replaceAll = function(target, search, replacement) {
  return target.split(search).join(replacement);
};

function match(exp, name) {
  exp = exp.replace('(', '\\(');
  exp = exp.replace(')', '\\)');
  exp = replaceAll(exp, '*', '.*');
  //exp = replaceAll(exp, '+', '.+');
  exp = new RegExp('^' + exp + '$');

  return exp.test(name);
}

function keyMatcher(exp, matchValue, wrapped) {
  if (typeof wrapped !== 'boolean' && typeof wrapped !== 'undefined')
    throw new Error();

  if (matchValue === undefined)
    matchValue = true;

  return function(obj) {
    // HACK: obj should be undefined here
    if(obj === undefined) return false;

    var key = obj.key;
    if (wrapped !== undefined) {
      key = obj.name;
    }

    if (exp.indexOf('(') === -1 && key.indexOf('(') !== -1)
      key = key.split('(')[0];

    return match(exp, key) ? matchValue : !matchValue;
  };
}

function find(data, expr, wrapped) {
  var member = undefined;

  if (expr !== 'function') {
    if (expr.indexOf('|') !== -1)
      return expr.split('|')
        .map(e => find(data, e, wrapped))
        .concat((a, b) => a.concat(b));

    var type = expr;
    var splitter = '::';
    if (wrapped)
      splitter = '.';

    if (expr.indexOf(splitter)) {
      type = expr.split(splitter)[0];
      member = expr.split(splitter)[1];
    }

    expr = keyMatcher(type, true, wrapped);
  }

  var types = data.declarations.filter(expr);
  if (member === undefined) return types;

  return types.map((t) => t.declarations)
    .reduce((a, b) => a.concat(b), [])
    .filter(keyMatcher(member, true, wrapped));
}

function getDecl(data, name, matcher) {
  var res = find(data, name, matcher);
  if (res.length === 0) return null;
  if (res.length === 1) return res[0];

  throw new Error('headers.get expected one result, got multiple');
}

function removePrefix(name) {
  var m = name.match(/^((?:Handle_)*)([a-z|A-Z|0-9]+_?)(\w*)$/);
  if (!m[3]) return name;
  return m[1] + m[3];
}

function signature(member, full) {
  var sig = `${member.name}`;
  if (member.arguments)
    sig += `(${member.arguments.map(arg => (full ? arg.decl : arg.type)).join(', ')})`;
  return sig;
}

function stripTypeQualifiers(typeDecl) {
  typeDecl = replaceAll(typeDecl, '&', '');
  typeDecl = replaceAll(typeDecl, '*', '');
  typeDecl = replaceAll(typeDecl, 'const', '');
  return replaceAll(typeDecl, ' ', '');
}


module.exports = {
  match,
  find,
  get: getDecl,
  matcher: keyMatcher,
  removePrefix,
  signature,
  stripTypeQualifiers
};
