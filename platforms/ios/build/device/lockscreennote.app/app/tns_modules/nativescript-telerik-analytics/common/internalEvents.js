'use strict';

(function(global) {
    var _private = global._private = global._private || { };

    _private.Events = function() {
        this.dateTime = new _private.DateTime();
        this.events = { events: [], errors: [] };
    };

    _private.Events.prototype.clear = function() {
        this.events = { events: [], errors: [] };
    };

    _private.Events.prototype.trackError = function(location, error) {
        if (typeof error === 'string') {
            error = new Error(error);
        } else if (typeof error === 'undefined' || error == null || (!error.hasOwnProperty('message') && error.message == null)) {
            error = new Error('');
        }

        var element = null;
        for (var i = 0; i < this.events.errors.length; i++) {
            if (this.events.errors[i].location === location) {
                element = this.events.errors[i];
                break;
            }
        }

        if (element == null) {
            element = {
                at: this.dateTime.getISO8601LocalDate(),
                location: location,
                message: error.message,
                count: 0
            };
            this.events.errors.push(element);
        }

        element.count++;
    };

    _private.Events.prototype.registerUsage = function(key, value) {
        if (key && value) {
            for (var i = 0; i < this.events.events.length; i++) {
                var usage = this.events.events[i];
                if (usage.hasOwnProperty(key)) {
                    usage[key] = value + '';
                    return;
                }
            }

            var result = { };
            result[key] = value;
            this.events.events.push(result);
        }
    };

    _private.Events.prototype.get = function() {
        var result = null;
        if (this.events.errors.length > 0) {
            result = {
                errors: this.events.errors
            };
        }

        if (this.events.events.length > 0) {
            result = result || { };
            result.events = this.events.events;
        }

        return result;
    };

    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = _private.Events;
        }
        exports._ta = _private.Events;
        _private.DateTime = require('./datetime');
    }
}(this || global));