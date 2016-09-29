var tools = (function () {
    function tools() {
    }

    Object.defineProperty(tools, 'isEmulator', {
        get: function () {
            if (typeof tools._isEmulator === 'undefined') {
                tools._isEmulator = false;
                try {
                    var fingerprint = android.os.Build.FINGERPRINT;
                    if (fingerprint != null && (fingerprint.indexOf('vbox') > -1 || fingerprint.indexOf('generic') > -1)) {
                        tools._isEmulator = true;
                    }
                } catch (e) {
                }
            }
            return tools._isEmulator;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(tools, 'emulatorType', {
        get: function () {
            return 'android-emulator';
        },
        enumerable: true,
        configurable: true
    });

    return tools;
})();

exports.tools = tools;