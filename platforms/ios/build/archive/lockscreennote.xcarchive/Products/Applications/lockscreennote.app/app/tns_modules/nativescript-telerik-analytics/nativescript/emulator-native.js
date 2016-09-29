var tools = (function () {
    function tools() {
    }

    Object.defineProperty(tools, 'isEmulator', {
        get: function () {
            if (typeof tools._isEmulator === 'undefined') {
                tools._isEmulator = false;
                try {
                    var sourceType = UIImagePickerControllerSourceType.UIImagePickerControllerSourceTypeCamera;
                    var mediaTypes = UIImagePickerController.availableMediaTypesForSourceType(sourceType);
                    if (!mediaTypes) {
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
            return 'ios-simulator';
        },
        enumerable: true,
        configurable: true
    });

    return tools;
})();

exports.tools = tools;