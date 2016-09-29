'use strict';

(function(global) {
    var _private = global._private = global._private || { };

    _private.DateTime = function() {
    };

    _private.DateTime.prototype.getISO8601LocalDate = function() {
        var now = new Date(),
            tzo = -now.getTimezoneOffset(),
            sign = tzo >= 0 ? '+' : '-',
            pad = function(num, width) {
                var zero = '0';
                var norm = Math.abs(Math.floor(num)).toString();
                return norm.length >= width ? norm : new Array(width - norm.length + 1).join(zero) + norm;
            };
        return now.getFullYear() 
            + '-' + pad(now.getMonth() + 1, 2)
            + '-' + pad(now.getDate(), 2)
            + 'T' + pad(now.getHours(), 2)
            + ':' + pad(now.getMinutes(), 2)
            + ':' + pad(now.getSeconds(), 2)
            + '.' + pad(now.getMilliseconds(), 3)
            + sign + pad(tzo / 60, 2) 
            + ':' + pad(tzo % 60, 2);
    };

    _private.DateTime.prototype.getUnixTimestamp = function() {
        return new Date().getTime();
    };


    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = _private.DateTime;
        }
        exports._ta = _private.DateTime;
    }
}(this || global));