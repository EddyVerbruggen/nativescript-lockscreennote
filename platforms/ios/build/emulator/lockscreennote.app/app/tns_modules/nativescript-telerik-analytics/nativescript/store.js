'use strict';

var appSettings   = require('application-settings'),
    emulator      = require('./emulator-native'),
    Tools         = require('../common/tools'),
    tools         = new Tools();

(function(global) {
    var StoreService = function(settings) {
        this.keysPrefix = settings.keysPrefix;
        this.queueKey = settings.queueKey;
        this.deviceKey = settings.deviceKey;
        this.cardinalKey = settings.cardinalKey;
    };

    exports = module.exports = StoreService;

    StoreService.prototype.saveRequestsQueue = function(value, done) {
        setValue(this.keysPrefix, this.queueKey, value, done);
    };

    StoreService.prototype.saveRequestsQueueSync = function(value) {
        setValue(this.keysPrefix, this.queueKey, value, null);
    };

    StoreService.prototype.getRequestsQueueSync = function() {
        var value = getValueSync(this.keysPrefix, this.queueKey);
        if (typeof value !== 'undefined' && value != null && typeof value.push !== 'undefined') {
            return value;
        }
        return [];
    };

    StoreService.prototype.saveCardinal = function(value, done) {
        if (done) {
            setValue(this.keysPrefix, this.cardinalKey, value, done);
        } else {
            setValueSync(this.keysPrefix, this.cardinalKey, value);
        }
    };

    StoreService.prototype.getCardinalSync = function() {
        return getValueSync(this.keysPrefix, this.cardinalKey);
    };

    StoreService.prototype.saveDeviceSync = function(device) {
        try {
            var value = device.deviceId + '|' + device.totalSessions;
            setValueSync(this.keysPrefix, this.deviceKey, value);
        } catch (e) { }
    };

    StoreService.prototype.getDeviceSync = function() {
        try {
            var value = getValueSync(this.keysPrefix, this.deviceKey);
            if (typeof value === 'undefined' || value == null) {
                return null;
            }

            var parts = value.split('|');
            if (parts.length < 2) {
                return null;
            }

            var totalSessions = parseInt(parts[1]);
            if (isNaN(totalSessions)) {
                totalSessions = 0;
            }

            return {
                deviceId: parts[0],
                totalSessions: totalSessions
            };
        } catch (e) {
            tools.logger.error(e.message, e);
            return null;
        }
    };

    StoreService.prototype.generateDeviceId = function() {
        if (emulator.tools.isEmulator) {
            return emulator.tools.emulatorType;
        }
        return null;
    };

    function setValue(keysPrefix, key, value, done) {
        done = done || function(err, data) { };

        key = keysPrefix + key;

        if (typeof value === 'object') {
            value = JSON.stringify(value);
        }

        if (typeof value !== 'undefined' && value !== null) {
            appSettings.setString(key, value.toString());
        } else if (value === null) {
            appSettings.remove(key);
        }

        done(null, null);
    }

    function setValueSync(keysPrefix, key, value, storageOnly) {
        setValue(keysPrefix, key, value, null);
    }

    function getValue(keysPrefix, key, done) {
        key = keysPrefix + key;

        var data = appSettings.getString(key);
        var result = null;
        try {
            result = JSON.parse(data);
        }
        catch(e) {
            result = data;
        }

        done(null, result);
    }

    function getValueSync(keysPrefix, key) {
        var result = null;
        getValue(keysPrefix, key, function(err, data) {
            result = data;
        });
        return result;
    }
}(this || global));