var UrlRouterResult = function() {
  this.warning = null;
  this.params = null;
  this.handlerFn = null;
};

var UrlRouter = function(argo) {
  this._argo = argo;
  this._router = [];
  this._routerKeys = [];

  if(argo) {
    argo
    .use(function(handle){
      handle("request", {affinity:"hoist"}, function(env, next){
        env.router = {};
        var reqUrl = env.request.url;
        var parsedReqUrl = url.parse(reqUrl, true);
        if(parsedReqUrl.query) {
          env.router.query = parsedReqUrl.query;
        } else if(parsedReqUrl.hash) {
          env.router.hash = parsedReqUrl.hash;
        }
        next(env);
      });
    });
  }
};

UrlRouter.prototype.install = function() {
  this._argo.router = this;
};

UrlRouter.prototype.add = function(path, methods, handleFn) {
  if (!this._router[path]) {
    this._router[path] = {};
    this._routerKeys.push(path);
  }

  methods = methods || ['*'];

  var that = this;
  methods.forEach(function(method) {
    that._router[path][method.toLowerCase()] = handleFn;
  });
  //console.log(this._router);
};

UrlRouter.prototype.find = function(path, method) {

  var routerKey;
  var found = false;
  var params = {};
  method = method.toLowerCase();

  var parsedPath = url.parse(path, true);
  path = parsedPath.pathname;

  var self = this;
  this._routerKeys.forEach(function(key) {
    if (found || key === '*') {
      return;
    }

    var parsed = self.parse(key, path);
    var re = new RegExp(parsed.key);
    var testMatch = re.test(path);

    if (!routerKey && key !== '*' && testMatch) {
      found = true;
      routerKey = key;

      var result = re.exec(path);

      var names = parsed.captures;

      for (var i = 0; i < names.length; i++) {
        if (result[i+1]) {
          params[names[i]] = decodeURIComponent(result[i+1]);
        }
      }
    }
  });

  if (!routerKey && this._router['*']) {
    routerKey = '*';
  }

  if (routerKey &&
      (!this._router[routerKey][method] &&
       !this._router[routerKey]['*'])) {
    var result = new UrlRouterResult();
    result.warning = 'MethodNotSupported';
    return result;
  }

  if (routerKey &&
      (this._router[routerKey][method] ||
       this._router[routerKey]['*'])) {

    var fn = this._router[routerKey][method] ? this._router[routerKey][method] 
      : this._router[routerKey]['*'];

    var result = new UrlRouterResult();
    result.params = params;
    result.handlerFn = fn;
    return result;
  }

  var result = new UrlRouterResult();
  result.warning = 'NotFound';
  return result;
};

UrlRouter.prototype.truncate = function(path, prefix) {
  var pattern = this.parse(prefix).key;

  if (pattern !== '*') {
    if (pattern[0] !== '^') {
      pattern = '^' + pattern; // make sure it's a prefix
    }

    var re = new RegExp(pattern);

    return path.replace(re, '') || '/';
  } else {
    return path;
  }
};

UrlRouter.prototype.parse = function(route, path) {
  if (route === '/') {
    return { captures: [], key: '^/$' };
  }

  var pattern = /\{([^\}]+)\}/g;
  
  var captures = [];
  var parts = ['^'];
  var pos = 0;
  var part;

  while (part = pattern.exec(route)) {
    parts.push(route.slice(pos, part.index));

    var name = part[1];
    captures.push(name);

    parts.push('([^\/]+)');
    pos = part.index + part[0].length;
  };

  if (route.length > pos+1) {
    parts.push(route.substr(pos));
  }

  //parts.push('$');

  //console.log(captures);
  //console.log(parts.join(''));

  return { captures: captures, key: parts.join('') };
};

UrlRouter.create = UrlRouter.prototype.create = function(argo) {
  //console.log('new router');
  return new UrlRouter(argo);
};

UrlRouter.package = function(argo) {
  var router = UrlRouter.create(argo);

  return {
    name: 'UrlRouter',
    install: router.install
  };
};

module.exports = {
  package: function(argo) {
    var router = UrlRouter.create(argo);
    return {
      name: 'UrlRouter',
      install: router.install.bind(router)
    };
  }
};
