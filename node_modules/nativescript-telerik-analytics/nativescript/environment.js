'use strict';

var Tools    = require('../common/tools'),
    tools    = new Tools(),
    platform = require('platform'),
    env      = require('./environment-native'),
    emulator = require('./emulator-native');

(function(global) {
    var EnvironmentService = function() {
    };

    EnvironmentService.prototype.collect = function() {
        var environment = {
            hw: {
                manufacturer: platform.device.manufacturer,
                model: env.device.model,
                memory: env.device.totalMemory,
                cpus: env.device.cpus,
                arch: env.device.arch,
                screen: {
                    width: env.device.screenWidth,
                    height: env.device.screenHeight,
                    dpi: env.device.dpi
                }
            },
            os: {
                platform: platform.device.os,
                version: platform.device.osVersion
            },
            sw: {
                culture: getCulture()
            }
        };

        if (emulator.tools.isEmulator) {
            environment.hw.virtual = true;
        }

        if (env.device.platformSpecific) {
            for (var key in env.device.platformSpecific) {
                if (env.device.platformSpecific.hasOwnProperty(key)) {
                    environment.sw[key] = env.device.platformSpecific[key];
                }
            }
        }

        tools.logger.info('Environment info collected', environment);

        return environment;
    };

    function getCulture() {
        var result = platform.device.language;
        if (!tools.isDefinedAndNotNull(platform.device.region)) {
            return result;
        }

        if (tools.isDefinedAndNotNull(result)) {
            result += '-';
        }

        result += platform.device.region;
        return result;
    }

    exports = module.exports = EnvironmentService;
}(this || global));