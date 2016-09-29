var application = require('application'),
    platform    = require('platform'),
    utils       = require('utils/utils');

var device = (function () {
    function device() {
    }

    Object.defineProperty(device, 'totalMemory', {
        get: function () {
            if (!device._totalMemory) {
                device._totalMemory = executeSafely(function() {
                    var context = application.android.context;
                    var activityManager = context.getSystemService(android.content.Context.ACTIVITY_SERVICE);
                    if (!activityManager) {
                        return 0;
                    }

                    var memoryInfo = new android.app.ActivityManager.MemoryInfo();
                    activityManager.getMemoryInfo(memoryInfo);
                    return memoryInfo.totalMem;
                }, 0);
            }
            return device._totalMemory;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(device, 'model', {
        get: function () {
            return platform.device.model;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(device, 'cpus', {
        get: function () {
            if (!device._cpus) {
                device._cpus = executeSafely(function() {
                    return java.lang.Runtime.getRuntime().availableProcessors();
                }, 0);
            }
            return device._cpus;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(device, 'arch', {
        get: function () {
            if (!device._arch) {
                device._arch = getPropertySafe('os.arch', '');
            }
            return device._arch;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(device, 'dpi', {
        get: function () {
            if (!device._dpi) {
                try {
                    var metrics = utils.ad.getApplicationContext().getResources().getDisplayMetrics();
                    device._dpi = metrics.densityDpi;
                } catch (e) {
                    device._dpi = 0;
                }
            }
            return device._dpi;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(device, 'screenWidth', {
        get: function () {
            if (!device._screenWidth) {
                try {
                    var metrics = getRealMetrics();
                    device._screenWidth = metrics.widthPixels;
                } catch (e) {
                    device._screenWidth = 0;
                }
            }
            return device._screenWidth;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(device, 'screenHeight', {
        get: function () {
            if (!device._screenHeight) {
                try {
                    var metrics = getRealMetrics();
                    device._screenHeight = metrics.heightPixels;
                } catch (e) {
                    device._screenHeight = 0;
                }
            }
            return device._screenHeight;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(device, 'platformSpecific', {
        get: function () {
            if (!device._platformSpecific) {
                device._platformSpecific = executeSafely(function() {
                    var result = {
                        java: {
                            vendor: getPropertySafe('java.vendor', null),
                            vm: {
                                version: getPropertySafe('java.vm.version', null),
                                vendor: getPropertySafe('java.vm.vendor', null)
                            }
                        },
                        android: {
                            kernelVersion: getPropertySafe('os.version')
                        }
                    };

                    for (var key in result.java) {
                        if (result.java.hasOwnProperty(key) && result.java[key] == null) {
                            delete result.java[key];
                        }
                    }

                    return result;
                }, null);
            }
            return device._platformSpecific;
        },
        enumerable: true,
        configurable: true
    });

    function getAndroidKernel() {
        var kernelVersion = getPropertySafe('os.version', null);
        if (kernelVersion && kernelVersion.length > 0 && kernelVersion.indexOf('-') > 0) {
            kernelVersion = kernelVersion.substring(0, kernelVersion.indexOf('-'));
        }

        return kernelVersion;
    }

    function getPropertySafe(key, defaultValue) {
        return executeSafely(function() {
            return java.lang.System.getProperty(key);
        }, defaultValue);
    }

    function executeSafely(func, defaultValue) {
        try {
            return func() || defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }

    function getRealMetrics() {
        var metrics = new android.util.DisplayMetrics(); 
        var context = utils.ad.getApplicationContext();
        var windowManager = context.getSystemService(android.content.Context.WINDOW_SERVICE);
        windowManager.getDefaultDisplay().getRealMetrics(metrics);
        return metrics;
    }

    return device;
})();

exports.device = device;