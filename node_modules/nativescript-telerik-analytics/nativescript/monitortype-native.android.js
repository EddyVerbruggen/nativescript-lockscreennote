var application = require('application');

var device = (function () {
    function device() {
    }

    Object.defineProperty(device, 'monitorType', {
        get: function () {
            return 'android';
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(device, 'productVersion', {
        get: function () {
            if (!device._productVersion) {
                try {
                    var context = application.android.context;
                    var packageManager = context.getPackageManager();
                    var packageName = context.getPackageName();
                    device._productVersion = packageManager.getPackageInfo(packageName, 0).versionName;
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