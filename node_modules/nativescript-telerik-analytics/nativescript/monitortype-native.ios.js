var device = (function () {
    function device() {
    }

    Object.defineProperty(device, 'monitorType', {
        get: function () {
            return 'ios';
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(device, 'productVersion', {
        get: function () {
            if (!device._productVersion) {
                try {
                    device._productVersion = NSBundle.mainBundle().infoDictionary.objectForKey('CFBundleVersion');
                } catch (e) {
                    device._productVersion = '0.0.0';
                }
            }
            return device._productVersion;
        },
        enumerable: true,
        configurable: true
    });

    return device;
})();

exports.device = device;