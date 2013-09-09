var argo = require('argo');
var router = require('../router');

argo()
  .use(router)
  .map('/hello', function(server) {
    server
      .get('/{name}/from/{location}', function(handle) {
        handle('request', function(env, next) {
          var params = env.request.params;
          var name = params.name;
          var location = params.location;
          env.response.body = 'Hello, ' + name + ' from ' + location;
          next(env);
        });
      });
  })
  .listen(process.env.PORT || 3000);
