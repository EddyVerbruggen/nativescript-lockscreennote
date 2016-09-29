'use strict';

(function() {
    exports.formatNativeException = function(error) {
        try {
            var ex = (typeof error.nativeException !== 'undefined') ? error.nativeException : error;
            if (ex instanceof NSError) {
                return handleNSError(ex);
            } else if (ex instanceof NSException) {
                return handleNSException(ex);
            }
        } catch (e) {
        }

        return error;
    };

    function handleNSError(error) {
        var e = {
            name: error.domain,
            message: error.localizedDescription || error.localizedFailureReason,
            stack: error.stack,
        };
        return e;
    }

    function handleNSException(error) {
        var e = {
            name: error.name,
            message: error.reason,
            stack: getExceptionStacktrace(error)
        };
        return e;
    }

    function getExceptionStacktrace(exception) {
        try {
            var newLine = '\r\n';
            var stack = '';
            for (var i = 0; i < exception.callStackSymbols.length; i++) {
                if (i > 0) {
                    stack += newLine;
                }

                var line = exception.callStackSymbols[i];
                var frame = line.replace(/0x[0-9a-z]+/gi, '');
                stack += frame;
            }

            return stack;
        } catch (e) {
            return null;
        }
    }
}());