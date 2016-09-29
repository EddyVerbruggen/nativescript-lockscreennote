'use strict';

(function() {
    exports.formatNativeException = function(error) {
        try {
            var nativeException = error.nativeException;
            if (nativeException instanceof java.lang.Throwable) {
                var inner = getInnerMostException(nativeException);
                var e = {
                    name: inner.getClass().getName(),
                    message: inner.getMessage(),
                    stack: error.stackTrace || error.stack
                };
                return e;
            }
        } catch (e) {
        }

        return error;
    };

    function getInnerMostException(error) {
        var inner = error;
        while (inner.getCause() != null) {
            inner = inner.getCause();
        }

        return inner;
    }
}());