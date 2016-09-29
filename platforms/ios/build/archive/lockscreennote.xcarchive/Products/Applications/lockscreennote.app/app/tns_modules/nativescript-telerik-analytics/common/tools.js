'use strict';

(function(global) {
    var _private = global._private = global._private || { };
    var logger = new NullLogger();

    var propertyValueMaxLength = 1000,
        eventNameMaxLength = 200;

    _private.Tools = function() {
        this.logger = logger;
    };

    _private.Tools.prototype.isNumber = function(value) {
        return !isNaN(parseInt(value)) && isFinite(value);
    };

    _private.Tools.prototype.isEmptyObject = function(obj) {
        for(var prop in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                return false;
            }
        }
        return true;
    };

    _private.Tools.prototype.isDefinedAndNotNull = function(value) {
        return typeof value !== 'undefined' && value !== null;
    };

    _private.Tools.prototype.sanitizeProperties = function(properties) {
        var sanitizedProperties = null;

        if (!this.isDefinedAndNotNull(properties)) {
            return sanitizedProperties;
        }

        for (var key in properties) {
            if (properties.hasOwnProperty(key)) {
                sanitizedProperties = sanitizedProperties || { };
                var value = properties[key];
                if (typeof value === 'string' && value != null) {
                    var sanitizedKey = this.chop(key, eventNameMaxLength);
                    var sanitizedValue = this.chop(value, propertyValueMaxLength);
                    if (sanitizedKey != null && sanitizedValue != null) {
                        sanitizedProperties[sanitizedKey] = sanitizedValue;
                    }
                }
            }
        }

        return sanitizedProperties;
    };

    _private.Tools.prototype.sanitizeLocation = function(location) {
        if (!this.isDefinedAndNotNull(location) || typeof location.latitude === 'undefined' || typeof location.longitude === 'undefined') {
            return null;
        }

        var latitude = parseFloat(location.latitude);
        var longitude = parseFloat(location.longitude);
        if (isNaN(latitude) || isNaN(longitude)) {
            return null;
        }

        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            return null;
        }

        return {
            latitude: latitude,
            longitude: longitude
        };
    };

    _private.Tools.prototype.chop = function(input, length) {
        if (typeof input !== 'string' || input == null || length < 0) {
            return null;
        }

        return input.length <= length ? input : input.substring(0, length);
    };

    _private.Tools.prototype.chopEventName = function(input) {
        return this.chop(input, eventNameMaxLength);
    };

    _private.Tools.prototype.getServerEndpoint = function(settings) {
        if (this.isDefinedAndNotNull(settings.serverEndpoint) && settings.serverEndpoint !== '') {
            return settings.serverEndpoint + '/api/v' + this.getProtocolVersion() + '/monitordata/' + settings.appId;
        }

        var targetProtocol;
        if (settings.useHttps === true) {
            targetProtocol = 'https';
        } else if (settings.useHttps === false) {
            targetProtocol = 'http';
        } else {
            targetProtocol = 'https';
            if (global && global.location && global.location.protocol !== 'https:') {
                targetProtocol = 'http';
            }
        }

        return targetProtocol + '://' + settings.appId + '.monitor-telerik.com/api/v' + this.getProtocolVersion() + '/monitordata/' + settings.appId;
    };

    _private.Tools.prototype.getProtocolVersion = function() {
        return 1;
    };

    _private.Tools.prototype.getDefaultSendInterval = function() {
        return 200;
    };

    _private.Tools.prototype.getSendInterval = function(settingsSendInterval) {
        var interval = this.getDefaultSendInterval();
        if (this.isNumber(settingsSendInterval) && settingsSendInterval >= interval) {
            interval = settingsSendInterval;
        }
        return interval;
    };

    function NullLogger() {
    }

    NullLogger.prototype.info = function(message, obj) {
    };

    NullLogger.prototype.error = function(message, obj) {
    };


    //stacktrace formatting from stacktrace.js
    // Note possible improvements using: http://blogs.msdn.com/b/ie/archive/2012/05/10/diagnosing-javascript-errors-faster-with-error-stack.aspx
    // and info from: http://wiki.ecmascript.org/doku.php?id=strawman:error_stack
    // (IE10+ only and different formats for each browser)
    function a(b) {
        b = b && b.e ? b.e : null;
        return (new a.implementation).run(b);
    }
    a.implementation = function () {
    };
    a.implementation.prototype = {
        run: function (b) {
            if (!b)
                return "";
            var a;
            if (!(a = b))
                a = void 0;
            b = a;
            a = this._mode || this.mode(b);

            if ("other" === a) {
                // there is issues with strict mode (in non-IE browsers) 
                // since some of the functions up the stacktrace cannot access the
                // 'arguments', 'caller' and 'callee' methods.
                return this.other(arguments.callee);
            }
            else
                return this[a](b);
        },
        mode: function (b) {
            return b.arguments ? this._mode = "chrome" : global.opera && b.stacktrace ? this._mode = "opera10" : b.stack ? this._mode = "firefox" : global.opera && !("stacktrace" in b) ? this._mode = "opera" : this._mode = "other";
        },
        chrome: function (b) {
            return b.stack.replace(/^[^\(]+?[\n$]/gm, "").replace(/^\s+at\s+/gm, "").replace(/^Object.<anonymous>\s*\(/gm, "{anonymous}()@").split("\n");
        },
        firefox: function (b) {
            return b.stack.replace(/(?:\n@:0)?\s+$/m, "").replace(/^\(/gm, "{anonymous}(").split("\n");
        },
        opera10: function (b) {
            var b = b.stacktrace.split("\n"), a = /.*line (\d+), column (\d+) in ((<anonymous function\:?\s*(\S+))|([^\(]+)\([^\)]*\))(?: in )?(.*)\s*$/i, c, d, j;
            for (c = 2, d = 0, j = b.length; c < j - 2; c++)
                if (a.test(b[c])) {
                    var f = RegExp.$6 + ":" + RegExp.$1 + ":" + RegExp.$2, i = RegExp.$3, i = i.replace(/<anonymous function\:?\s?(\S+)?>/g, "{anonymous}");
                    b[d++] = i + "@" + f;
                }
            b.splice(d, b.length - d);
            return b;
        },
        opera: function (b) {
            var b = b.message.split("\n"), a = /Line\s+(\d+).*script\s+(http\S+)(?:.*in\s+function\s+(\S+))?/i, c, d, f;
            for (c = 4, d = 0, f = b.length; c < f; c +=
                        2)
                a.test(b[c]) && (b[d++] = (RegExp.$3 ? RegExp.$3 + "()@" + RegExp.$2 + RegExp.$1 : "{anonymous}()@" + RegExp.$2 + ":" + RegExp.$1) + " -- " + b[c + 1].replace(/^\s+/, ""));
            b.splice(d, b.length - d);
            return b;
        },
        other: function (b) {
            for (var a = /function\s*([\w\-$]+)?\s*\(/i, c = [], d = 0, f, k; b && 10 > c.length;) {
                var r1 = a.test(b.toString());
                var args = [];
                try {
                    args = Array.prototype.slice.call(b.arguments);
                    b = b.caller;
                }
                catch (ex) {
                    b = null;
                }
                f = r1 ? RegExp.$1 || "{anonymous}" : "{anonymous}",
                              k = args,
                              c[d++] = f + "(" + this.stringifyArguments(k) + ")";

                if (!b)
                    break;
            }
            return c;
        },
        stringifyArguments: function (b) {
            for (var a = 0; a < b.length; ++a) {
                var c =
                              b[a];
                void 0 === c ? b[a] = "undefined" : null === c ? b[a] = "null" : c.constructor && (c.constructor === Array ? b[a] = 3 > c.length ? "[" + this.stringifyArguments(c) + "]" : "[" + this.stringifyArguments(Array.prototype.slice.call(c, 0, 1)) + "..." + this.stringifyArguments(Array.prototype.slice.call(c, -1)) + "]" : c.constructor === Object ? b[a] = "#object" : c.constructor === Function ? b[a] = "#function" : c.constructor === String && (b[a] = '"' + c + '"'));
            }
            return b.join(",");
        }
    };

    _private.Tools.prototype.getFormattedStackTrace = function(exc) {
        try {
            var formattedStackTrace = a({ e: exc });
            return formattedStackTrace.join('\n');
        }
        catch (e) {
            return '';
        }
    };

    var _keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

    _private.Tools.prototype.base64Encode = function (input) {
        var output = '';
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;

        input = utf8Encode(input);

        while (i < input.length) {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);

            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;

            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }

            output = output +
                _keyStr.charAt(enc1) + _keyStr.charAt(enc2) +
                _keyStr.charAt(enc3) + _keyStr.charAt(enc4);
        }
        return output;
    };

    _private.Tools.prototype.base64Decode = function (input) {
        var output = '';
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;

        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');

        while (i < input.length) {
            enc1 = _keyStr.indexOf(input.charAt(i++));
            enc2 = _keyStr.indexOf(input.charAt(i++));
            enc3 = _keyStr.indexOf(input.charAt(i++));
            enc4 = _keyStr.indexOf(input.charAt(i++));

            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;

            output = output + String.fromCharCode(chr1);

            if (enc3 != 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 != 64) {
                output = output + String.fromCharCode(chr3);
            }
        }
        output = utf8Decode(output);
        return output;
    };

    function utf8Encode(str) {
        str = str.replace(/\r\n/g, '\n');
        var utftext = '';

        for (var n = 0; n < str.length; n++) {
            var c = str.charCodeAt(n);
            if (c < 128) {
                utftext += String.fromCharCode(c);
            } else if((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            } else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
        }
        return utftext;
    }

    function utf8Decode(utftext) {
        var str = '';
        var i = 0;
        var c, c1, c2;
        c = c1 = c2 = 0;

        while ( i < utftext.length ) {
            c = utftext.charCodeAt(i);
            if (c < 128) {
                str += String.fromCharCode(c);
                i++;
            } else if((c > 191) && (c < 224)) {
                c2 = utftext.charCodeAt(i + 1);
                str += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            } else {
                c2 = utftext.charCodeAt(i + 1);
                var c3 = utftext.charCodeAt(i + 2);
                str += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }
        }
        return str;
    }

    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = _private.Tools;
        }
        exports._ta = _private.Tools;
    }
}(this || global));