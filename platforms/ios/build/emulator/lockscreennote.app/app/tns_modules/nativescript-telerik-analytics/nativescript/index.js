'use strict';

var application         = require('application'),
    timer               = require('timer'),
    Base                = require('../common'),
    Tools               = require('../common/tools'),
    DateTime            = require('../common/datetime'),
    InternalEvents      = require('../common/internalEvents'),
    HttpService         = require('./http'),
    StoreService        = require('./store'),
    EnvironmentService  = require('./environment'),
    platform            = require('./monitortype-native'),
    exceptions          = require('./exceptions-native');

(function(global) {
    var Analytics = { },
    tools = new Tools(),
    dateTime = new DateTime(),
    runningStart,
    suspendedStart,
    lastLifecycleEvent;

    exports = module.exports = Analytics;

    Analytics.init = function(settings) {
        if (!settings || !settings.appId) {
            throw new Error('Missing appId parameter');
        }

        var serverEndpoint = tools.getServerEndpoint(settings);

        Base.initBase({
            appId: settings.appId,
            productVersion: settings.productVersion || platform.device.productVersion,
            location: settings.location,
            clientIP: settings.clientIP,
            sessionProperties: settings.sessionProperties,
            superProperties: settings.superProperties,
            isInternalData: typeof settings.isInternalData === 'boolean' ? settings.isInternalData : false,
            sendInterval: tools.getSendInterval(settings.sendInterval),
            monitorType: platform.device.monitorType,
            monitorVersion: '1.0.6',
            logger: tools.isDefinedAndNotNull(settings.logger) && typeof settings.logger.info === 'function' && typeof settings.logger.error === 'function' ? settings.logger : null,
            http: settings.http || new HttpService(serverEndpoint),
            environment: settings.environment || new EnvironmentService(),
            store: settings.store || new StoreService({
                keysPrefix: '.ta' + settings.appId,
                queueKey: '_queue',
                deviceKey: '_device',
                cardinalKey: '_cardinal'
            }),
            setTimeout: settings.timeout || timer.setTimeout,
            internalEvents: new InternalEvents()
        });

        if (settings.autoTrackUnhandledExceptions !== false) {
            application.on(application.uncaughtErrorEvent, function (args) {
                var exception = null;
                if (args.android) {
                    exception = args.android;
                } else if (args.ios) {
                    exception = args.ios;
                }

                if (exception != null) {
                    Base.trackException(exceptions.formatNativeException(exception), 'uncaughtErrorEvent', true);
                }
            });
        }
    };

    Analytics.reset = function() {
        Base.reset();
    };

    Analytics.start = function() {
        runningStart = dateTime.getUnixTimestamp();
        lastLifecycleEvent = null;
        Base.start();
    };

    Analytics.trackEvent = function(name, properties) {
        Base.trackEvent(name, properties);
    };

    Analytics.trackValue = function(name, value, properties) {
        Base.trackValue(name, value, properties);
    };

    Analytics.trackException = function(e, context) {
        Base.trackException(exceptions.formatNativeException(e), context);
    };

    Analytics.trackTimingStart = function(name) {
        return Base.trackTimingStart(name);
    };

    Analytics.trackTimingRaw = function(name, elapsed, properties) {
        Base.trackTimingRaw(name, elapsed, properties);
    };

    Analytics.stop = function() {
        stopSession();
    };


    function stopSession(reason) {
        var elapsed = dateTime.getUnixTimestamp() - runningStart;
        if (!isNaN(elapsed) && elapsed > 0 && lastLifecycleEvent !== '$Lifecycle.Running') {
            lastLifecycleEvent = '$Lifecycle.Running';
            Base.trackTimingRaw(lastLifecycleEvent, elapsed, null, false);
        }
        Base.stop(reason);
    }

    application.on(application.suspendEvent, function (args) {
        var timestamp = dateTime.getUnixTimestamp();
        var elapsed = timestamp - runningStart;
        if (!isNaN(runningStart) && elapsed > 0 && lastLifecycleEvent !== '$Lifecycle.Running') {
            lastLifecycleEvent = '$Lifecycle.Running';
            Base.trackTimingRaw(lastLifecycleEvent, elapsed, null, false);
        }
        suspendedStart = timestamp;
    });

    application.on(application.resumeEvent, function (args) {
        var timestamp = dateTime.getUnixTimestamp();
        var elapsed = timestamp - suspendedStart;
        if (!isNaN(suspendedStart) && elapsed > 0 && lastLifecycleEvent !== '$Lifecycle.Suspended') {
            lastLifecycleEvent = '$Lifecycle.Suspended';
            Base.trackTimingRaw(lastLifecycleEvent, elapsed, null, false);
        }
        runningStart = timestamp;
    });

    application.on(application.exitEvent, function (args) {
        if (Base.isSessionRunning()) {
            stopSession('$Stop.ProcessExit');
        }
    });
}(this));