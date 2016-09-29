'use strict';

var http  = require('http'),
    Tools = require('../common/tools'),
    tools = new Tools();

(function(global) {
    var HttpService = function(serverUrl) {
        this.serverUrl = serverUrl;
    };

    HttpService.prototype.send = function(data, done) {
        var options = {
            url: this.serverUrl,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            content: JSON.stringify(data)
        };

        http.request(options).then(function(response) {
            if (response.statusCode >= 200 && response.statusCode < 300) {
                tools.logger.info('Successfully sent analytics data', data);
                done(null, data);
            } else {
                var err = new Error('An error occurred while sending analytics data. StatusCode: ' + response.statusCode);
                tools.logger.error(err.message, err);
                done(err, data);
            }
        }, function(e) {
            tools.logger.error('An error occurred while sending analytics data', e);
            done(e, data);
        });
    };

    exports = module.exports = HttpService;
}(this || global));