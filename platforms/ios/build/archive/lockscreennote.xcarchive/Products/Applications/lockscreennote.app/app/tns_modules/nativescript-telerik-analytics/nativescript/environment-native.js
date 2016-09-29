var platform = require('platform');

var device = (function () {
    function device() {
    }

    Object.defineProperty(device, 'totalMemory', {
        get: function () {
            if (typeof device._totalMemory === 'undefined') {
                try {
                    device._totalMemory = NSProcessInfo.processInfo().physicalMemory;
                } catch (e) {
                    device._totalMemory = 0;
                }
            }
            return device._totalMemory;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(device, 'model', {
        get: function () {
            if (typeof device._model === 'undefined') {
                try {
                    device._model = getSysctlString('hw.machine');
                } catch (e) {
                    device._model = null;
                }
            }

            return device._model;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(device, 'cpus', {
        get: function () {
            if (typeof device._cpus === 'undefined') {
                try {
                    device._cpus = getSysctlWithType('hw.ncpu', interop.types.int32);
                } catch (e) {
                    device._cpus = null;
                }
            }

            return device._cpus;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(device, 'arch', {
        get: function () {
            if (typeof device._arch === 'undefined') {
                try {
                    var cpuType = getSysctlWithType('hw.cputype', interop.types.int32);
                    var cpuSubtype = getSysctlWithType('hw.cpusubtype', interop.types.int32);
                    device._arch = cpuType + '|' + cpuSubtype;
                } catch (e) {
                }
            }

            if (typeof device._arch === 'undefined') {
                device._arch = null;
            }

            return device._arch;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(device, 'dpi', {
        get: function () {
            return null;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(device, 'screenWidth', {
        get: function () {
            if (!device._screenWidth) {
                try {
                    device._screenWidth = platform.screen.mainScreen.widthPixels;
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
                    device._screenHeight = platform.screen.mainScreen.heightPixels;
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
            return null;
        },
        enumerable: true,
        configurable: true
    });

    function getSysctlString(specifier) {
        var sizeRef = new interop.Reference();
        sysctlbyname(specifier, null, sizeRef, null, 0);
        var value = interop.alloc(sizeRef.value);
        sysctlbyname(specifier, value, sizeRef, null, 0)
        return NSString.stringWithUTF8String(value).toString();
    }

    function getSysctlWithType(specifier, type) {
        var size = interop.sizeof(type);
        var sizeRef = new interop.Reference(size);
        var value = interop.alloc(size);
        sysctlbyname(specifier, value, sizeRef, null, 0);
        return type(value);
    }

    return device;
})();

exports.device = device;