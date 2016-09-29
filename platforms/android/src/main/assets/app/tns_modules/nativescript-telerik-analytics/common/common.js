'use strict';

(function(global) {
    var _private = global._private = global._private || { };

    var Analytics = { },
        dateTime = null,
        tools = null;

    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = Analytics;
        }
        exports._ta = Analytics;
        var DateTime = require('./datetime');
        dateTime = new DateTime();
        var Tools = require('./tools');
        tools = new Tools();
    } else {
        if (global._ta) {
            Analytics = global._ta;
        }
        global._ta = Analytics;
        dateTime = new _private.DateTime();
        tools = new _private.Tools();
    }

    var protocolVersion = tools.getProtocolVersion(),
        initialized = false,
        started = false,
        requestsQueue = [],
        eventsQueue = { events: [] },
        settings = null,
        eventSequence = 0,
        payloadSequence = -1,
        sessionId = null,
        startTime = null,
        unixStartTime = null,
        timings = { },
        tracker = null,
        lastEvents = [],
        originalSendInterval,
        failedRequests = 0;

    Analytics.initBase = function(options) {
        if (options.logger) {
            tools.logger = options.logger;
        }

        if (initialized) {
            tools.logger.info('The monitor is already initialized');
            return;
        }

        settings = options;
        requestsQueue = settings.store.getRequestsQueueSync();

        initialized = true;
        tools.logger.info('Successfully initialized monitor with settings', options);

        originalSendInterval = options.sendInterval;
        ensureAsyncQ();
        process();
    };

    Analytics.reset = function() {
        if (!initialized) {
            tools.logger.info('The monitor is not initialized. Call init() first');
            return;
        }

        initialized = false;
    };

    /**
     * Returns if a session is currently running and accepting tracking events
     */
    Analytics.isSessionRunning = function() {
        return started === true;
    };

    /**
     * Starts a new Analytics session. When started the monitor will begin collecting data from the calls
     * and send them asynchronously to the Telerik Analytics servers. Prior to starting a new session, the
     * _ta.init method should be called
     */
    Analytics.start = function() {
        startSessionInternal(false);
    };

    function startSessionInternal(forceNew) {
        if (!initialized || started) {
            tools.logger.info('The monitor is not initialized or is already started');
            return;
        }

        eventSequence = 0;
        payloadSequence = -1;
        lastEvents = [];

        startTime = dateTime.getISO8601LocalDate();
        unixStartTime = dateTime.getUnixTimestamp();
        var startEvent = {
            name: '$Start',
            'is': 'event',
            at: getTimestamp()
        };

        settings.internalEvents.clear();
        sessionId = generateUUID();

        started = true;

        eventsQueue = { events: [] };
        tracker = new UniquenessTracker();
        tracker.start();

        if (typeof settings.store.loadSession === 'function' && forceNew !== true) {
            var data = settings.store.loadSession();
            if (data != null && data.isExpired === false) {
                sessionId = data.sessionId;
                eventSequence = data.eventSequence;
                payloadSequence = data.payloadSequence;
                startTime = data.startTime;
                unixStartTime = data.unixStartTime;

                tools.logger.info('Reusing existing session: ' + sessionId);
                return;
            }
        }

        lastEvents.push({
            name: startEvent.name,
            at: startEvent.at
        });

        var mask = safelyInvoke('track', function() { return tracker.track(startEvent.name); }, 0);
        if (mask != 0) {
            startEvent.umask = mask;
        }

        var sessionData = createEnvelope();
        sessionData.events = [ startEvent ];

        var device = getDevice();
        sessionData.session.common = {
            deviceId: device.deviceId,
            startnumber: device.totalSessions,
            environment: safelyInvoke('collectEnvInfo', settings.environment.collect)
        };

        if (tools.isDefinedAndNotNull(settings.sessionProperties)) {
            sessionData.session.common.properties = tools.sanitizeProperties(settings.sessionProperties);
        }

        try {
            addToRequestsQueueSync(sessionData);
        } catch (e) {
            tools.logger.error('Unable to start new session', e);
            settings.internalEvents.trackError('sessionStart', e);
        }

        tools.logger.info('Started new session with id ' + sessionId + ' and device id ' + device.deviceId);
    }
    /**
     * Registers a feature usage. It is recommended that related features are grouped by using simple dot-notation in
     * the name such as e.g. relating print to pdf and print to file by naming the features "print.pdf" and "print.file" respectively
     * @param {string} name The name of the feature. If it is null or empty the request is ignored.
     * @param {object} [properties] A set of key-value strings to associate with this particular event occurrence
     * @example
     * The following shows an example of how you can track features in your application:
     * _ta.trackEvent('Printing.PDF', {
     *     length: '15',
     *     author: 'Example Author'
     * });
     */
    Analytics.trackEvent = function(name, properties) {
        if (!initialized || !started) {
            tools.logger.info('Unable to track event because a session is not started. Call the start() method first');
            return;
        }

        checkAndRenewExistingSession();

        name = getEventName(name);
        if (!name) {
            return;
        }

        var data = {
            name: name,
            'is': 'event',
            at: getTimestamp()
        };

        var mask = safelyInvoke('track', function() { return tracker.track(name); }, 0);
        if (mask != 0) {
            data.umask = mask;
        }

        if (tools.isDefinedAndNotNull(properties)) {
            data.properties = tools.sanitizeProperties(properties);
        }

        addEvent(data, true);
    };

    /**
     * Register a value on a specific feature. While calls to trackEvent increments the use of a feature in the session a call to
     * this methods will associate a given value with a named feature. Use this method to e.g. track the distribution
     * of file sizes imported or the number of results registered. Tracking this distribution across all your application
     * usage will give insights to what scenarios your applications are handling
     * @param {string} name The name of the feature. If it is null or empty the request is ignored
     * @param {integer} value The value to track
     * @param {object} [properties] A set of key-value strings to associate with this particular event occurrence
     * @example
     * The following shows an example of how you can track feature values in your application:
     * _ta.trackValue('SomeClass.FilesProcessed', 152, {
     *     processor: 'some processor name',
     *     fileMask: 'file mask'
     * });
     */
    Analytics.trackValue = function(name, value, properties) {
        if (!initialized || !started) {
            tools.logger.info('Unable to track value because a session is not started. Call the start() method first');
            return;
        }

        checkAndRenewExistingSession();

        if (!tools.isNumber(value)) {
            tools.logger.info('Unable to track value because the provided parameter must be a valid integer');
            return;
        }

        name = getEventName(name);
        if (!name) {
            return;
        }

        var data = {
            name: name,
            'is': 'value',
            at: getTimestamp(),
            value: value
        };

        if (tools.isDefinedAndNotNull(properties)) {
            data.properties = tools.sanitizeProperties(properties);
        }

        addEvent(data, false);
    };

    /**
     * Call to track an exception that occured in the application.
     * @param {object} e The exception to be tracked. It should represent either a javascript Error instance or could be any
     * object with name, message and stack properties
     * @param {string} [context] Contextual information about the action being performed when the exception occurred
     * @example
     * An example of tracking an exception:
     * try {
     *     someOperation();
     * } catch (e) {
     *     _ta.trackException(e, 'Some additional context information');
     * }
     */
    Analytics.trackException = function(e, context, persistNow) {
        if (!initialized || !started) {
            tools.logger.info('Unable to track error because a session is not started. Call the start() method first');
            return;
        }

        checkAndRenewExistingSession();

        if (!tools.isDefinedAndNotNull(e)) {
            tools.logger.info('Unable to track error because the provided error object was undefined');
            return;
        }

        var data = {
            at: getTimestamp()
        };

        var nameAndStack = '';
        if (tools.isDefinedAndNotNull(e.name)) {
            data.type = e.name;
            nameAndStack = e.name;
        }

        if (tools.isDefinedAndNotNull(e.message)) {
            data.message = e.message;
        }

        var stack = tools.getFormattedStackTrace(e);
        if (tools.isDefinedAndNotNull(stack)) {
            data.stack = stack;
            nameAndStack += stack;
        }

        if (tools.isDefinedAndNotNull(context)) {
            data.context = context;
        }

        if (!data.type && !data.message && !data.stack && !data.context) {
            tools.logger.info('Unable to track error - the error object must have at least one of the following properties: type, message, stack, context');
            return;
        }

        if (nameAndStack !== '') {
            var hash = '$X' + getHashCode(nameAndStack);
            var mask = safelyInvoke('track', function() { return tracker.track(hash); }, 0);
            if (mask != 0) {
                data.umask = mask;
            }
        }

        eventsQueue.errors = eventsQueue.errors || [];
        eventsQueue.errors.push(data);

        if (persistNow === true) {
            try {
                var sessionData = getSessionDataFromEventsQueue();
                addToRequestsQueueSync(sessionData);
            } catch (e) {
                tools.logger.error('Unable to persist the requests queue', e);
                settings.internalEvents.trackError('trackException', e);
            }
        }
    };

    /**
     * Starts a named timer for timing some operation.
     * @param {string} name The name of the timing. If it is null or empty the request is ignored
     * @returns {TimingScope} A TimingScope instance that is used for stopping or cancelling the timing
     * @example
     * The following example illustrates how to track some timing event:
     * var timing = _ta.trackTimingStart('MyTiming');
     * setTimeout(function() {
     *     timing.stop({
     *         key1: 'value 1',
     *         key2: 'value 2'
     *     });
     * }, 200);
     */
    Analytics.trackTimingStart = function(name) {
        if (!initialized || !started) {
            tools.logger.info('Unable to start timer because a session is not started. Call the start() method first');
            return;
        }

        checkAndRenewExistingSession();

        name = getEventName(name);
        if (!name) {
            return;
        }

        eventsQueue.events.push({
            name: '$TimingStart.' + name,
            at: getTimestamp()
        });

        return new Analytics.TimingScope(name, timings); 
    };

    /**
     * Register the elapse of some operation.
     * @param {string} name The name of the timing. If it is null or empty the request is ignored
     * @param {integer} elapsed The elapsed time in milliseconds
     * @param {object} [properties] A set of key-value strings to associate with this particular event occurrence
     * @example
     * The following example illustrates how to track some timing event:
     * _ta.trackTimingRaw('MyTiming', 1426, {
     *     key1: 'value 1',
     *     key2: 'value 2'
     * });
     */
    Analytics.trackTimingRaw = function(name, elapsed, properties, shouldEscape) {
        if (!initialized || !started) {
            tools.logger.info('Unable to track timing because a session is not started. Call the start() method first');
            return;
        }

        checkAndRenewExistingSession();

        if (!tools.isNumber(elapsed)) {
            tools.logger.info('Unable to track timing because the provided elapsed time is not a valid integer');
            return;
        }

        name = getEventName(name, shouldEscape);
        if (!name) {
            return;
        }

        var data = {
            name: name,
            'is': 'timing',
            elapsed: elapsed,
            at: getTimestamp()
        };

        if (tools.isDefinedAndNotNull(properties)) {
            data.properties = tools.sanitizeProperties(properties);
        }

        addEvent(data, false);
    };

    /**
     * Call to stop the active session.
     */
    Analytics.stop = function(reason) {
        if (!initialized || !started) {
            tools.logger.info('Unable to stop a session because no session is started. Call start() first.');
            return;
        }

        started = false;

        var sessionData = getSessionDataFromEventsQueue() || createEnvelope();
        sessionData.session.stop = true;

        var stopEvent = {
            name: reason || '$Stop.Stop',
            'is': 'event',
            at: getTimestamp()
        };

        var mask = safelyInvoke('track', function() { return tracker.track(stopEvent.name); }, 0);
        if (mask != 0) {
            stopEvent.umask = mask;
        }

        sessionData.events = sessionData.events || [];
        sessionData.events.push(stopEvent);

        try {
            tracker.saveToDisk();
            addToRequestsQueueSync(sessionData);
        } catch (e) {
            tools.logger.error('Unable to stop session', e);
            settings.internalEvents.trackError('sessionStop', e);
        }

        if (typeof settings.store.removeSession === 'function') {
            settings.store.removeSession();
        }
    };

    Analytics.TimingScope = function(name, timings) {
        this.sessionId = sessionId;
        this.startTime = dateTime.getUnixTimestamp();
        this.id = generateUUID();
        this.name = name;
        this.timings = timings;
        this.timings[this.id] = this;
    };

    /**
     * Cancels a timing operation that was started by calling the trackTimingStart method.
     */
    Analytics.TimingScope.prototype.cancel = function() {
        if (typeof this.timings[this.id] === 'undefined') {
            return;
        }

        if (!initialized || !started) {
            tools.logger.info('Unable to cancel the "' + this.name + '" timing event because there\'s no running session at the moment.');
            delete this.timings[this.id];
            return;
        }

        if (this.sessionId !== sessionId) {
            tools.logger.info('Unable to cancel the "' + this.name + '" timing event because it was started in a different session.');
            delete this.timings[this.id];
            return;
        }

        eventsQueue.events.push({
            name: this.name,
            at: getTimestamp(),
            'is': '$TimingCancel.' + this.name
        });

        delete this.timings[this.id];

        return this.getElapsed();
    };

    /**
     * Register the end of timing
     * @param {object} [properties] A set of key-value strings to associate with this particular event occurrence
     * @returns The elapsed time since timer was started in milliseconds
     */
    Analytics.TimingScope.prototype.stop = function(properties) {
        if (typeof this.timings[this.id] === 'undefined') {
            return;
        }

        if (!initialized || !started) {
            tools.logger.info('Unable to stop the "' + this.name + '" timing event because there\'s no running session at the moment.');
            delete this.timings[this.id];
            return;
        }

        if (this.sessionId !== sessionId) {
            tools.logger.info('Unable to stop the "' + this.name + '" timing event because it was started in a different session.');
            delete this.timings[this.id];
            return;
        }

        var data = {
            name: this.name,
            'is': 'timing',
            at: getTimestamp(),
            elapsed: this.getElapsed()
        };

        if (tools.isDefinedAndNotNull(properties)) {
            data.properties = tools.sanitizeProperties(properties);
        }

        addEvent(data, false);
        delete this.timings[this.id];

        return data.elapsed;
    };

    /**
     * Return the time elapsed so far. May be called even after timer has been stopped or cancelled.
     */
    Analytics.TimingScope.prototype.getElapsed = function() {
        var currentTime = dateTime.getUnixTimestamp();
        return currentTime - this.startTime;
    };

    function addEvent(data, setLastEvent) {
        if (setLastEvent && lastEvents.length > 0) {
            lastEvents[lastEvents.length - 1] = data;
        }
        eventsQueue.events.push(data);
    }

    function addToRequestsQueue(request, done) {
        requestsQueue.push(request);
        settings.store.saveRequestsQueue(requestsQueue, done);
    }

    function addToRequestsQueueSync(request) {
        requestsQueue.push(request);
        settings.store.saveRequestsQueueSync(requestsQueue);
    }

    function process() {
        if (!initialized) {
            return;
        }

        if (Analytics.q && Analytics.q.length > 0) {
            var req;
            for (var i = 0; i < Analytics.q.length; i++) {
                req = Analytics.q[i];
                if (req.constructor === Array && req.length > 0) {
                    var func = Analytics[req[0]];
                    if (func) {
                        func.apply(global, req.slice(1) || []);
                    }
                }
            }
            Analytics.q = [];
        }

        var sessionData = getSessionDataFromEventsQueue();
        if (sessionData) {
            addToRequestsQueue(sessionData, send);
            return;
        }

        if (requestsQueue.length > 0) {
            send();
        } else {
            settings.setTimeout.call(global, process, settings.sendInterval);
        }
    }

    function send() {
        if (tracker != null) {
            tracker.saveToDisk(sendInternal);
        } else {
            sendInternal();
        }
    }

    function sendInternal() {
        var data = requestsQueue.shift();
        if (data) {
            tools.logger.info('Sending statistics', data);
            settings.http.send(data, function(err, data) {
                if (err) {
                    failedRequests++;
                    settings.sendInterval = (failedRequests <= 5) ? (failedRequests * 300) : 5000;
                    requestsQueue.unshift(data);
                    settings.internalEvents.trackError('httpCallback', err);
                    tools.logger.error('Failed sending statistics', err);
                } else {
                    failedRequests = 0;
                    settings.sendInterval = originalSendInterval;
                    tools.logger.info('Statistics successfully sent');
                }
                settings.store.saveRequestsQueue(requestsQueue, function(err, data) {
                    if (err) {
                        tools.logger.error('Failed to save requests queue', err);
                        settings.internalEvents.trackError('httpCallbackStore', err);
                    }
                    settings.setTimeout.call(global, process, settings.sendInterval);
                });
            });
        } else {
            settings.setTimeout.call(global, process, settings.sendInterval);
        }
    }

    function getSessionDataFromEventsQueue() {
        var sessionData = null;
        for (var prop in eventsQueue) {
            var values = eventsQueue[prop];
            if (values.length > 0) {
                sessionData = sessionData || createEnvelope();
                sessionData[prop] = values;
            }
        }

        if (sessionData) {
            for (var prop in eventsQueue) {
                if (eventsQueue[prop].length > 0) {
                    eventsQueue[prop] = [];
                }
            }
        }

        return sessionData;
    }

    function checkAndRenewExistingSession() {
        if (typeof settings.store.loadSession === 'function') {
            var data = settings.store.loadSession();
            if (data != null && data.isExpired === true) {
                tools.logger.info('The existing session has been idle for ' + settings.keepRunningSessionsMs + ' milliseconds -> starting new one');
                Analytics.stop('$Stop.Timeout');
                startSessionInternal(true);
            }
        }
    }

    function ensureAsyncQ() {
        Analytics.q = (global._ta && global._ta.q) ? global._ta.q : [];
        if (Analytics.q.constructor !== Array) {
            Analytics.q = [];
        }
    }

    function generateUUID() {
        var d = new Date().getTime();
        var uuid = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        return uuid;
    }

    function createEnvelope() {
        var data = {
            version: protocolVersion,
            monitor: {
                'type': settings.monitorType,
                version: settings.monitorVersion
            },
            product: {
                id: settings.appId
            },
            session: {
                id: sessionId,
                part: ++payloadSequence,
                started: startTime,
                elapsed: getSessionElapsedTime()
            }
        };

        if (tools.isDefinedAndNotNull(settings.productVersion)) {
            data.product.version = settings.productVersion;
        }

        if (payloadSequence > 0 && lastEvents != null && lastEvents.length > 0) {
            var lastEvent = getLastEvent();
            if (lastEvent != null) {
                data.session.lastEvent = lastEvent;
            }
        }
        lastEvents.push(null);

        if (settings.isInternalData === true) {
            data.session.internal = true;
        }

        if (tools.isDefinedAndNotNull(settings.superProperties)) {
            data.session['super'] = tools.sanitizeProperties(settings.superProperties);
        }

        var location = tools.sanitizeLocation(settings.location);
        if (location != null) {
            data.session.location = location;
        }

        if (tools.isDefinedAndNotNull(settings.clientIP)) {
            data.session.ip = settings.clientIP;
        }

        if (originalSendInterval !== tools.getDefaultSendInterval()) {
            settings.internalEvents.registerUsage('SessionSend', originalSendInterval);
        }

        var internal = settings.internalEvents.get();
        if (internal) {
            data.internal = internal;
        }

        if (typeof settings.store.saveSession === 'function') {
            settings.store.saveSession(settings.keepRunningSessionsMs, sessionId, eventSequence, payloadSequence, startTime, unixStartTime);
        }

        return data;
    }

    function getLastEvent() {
        for (var i = 0; i < lastEvents.length; i++) {
            var lastEvent = lastEvents.shift();
            if (tools.isDefinedAndNotNull(lastEvent)) {
                return {
                    name: lastEvent.name,
                    at: lastEvent.at
                };
            }
        }
        return null;
    }

    function getTimestamp() {
        var timestampDelta = getSessionElapsedTime();
        return (++eventSequence).toString() + ':' + timestampDelta.toString();
    }

    function getSessionElapsedTime() {
        return dateTime.getUnixTimestamp() - unixStartTime;
    }

    function getDevice() {
        var device = settings.store.getDeviceSync();
        if (!device) {
            var deviceId = null;
            if (typeof settings.store.generateDeviceId === 'function') {
                deviceId = settings.store.generateDeviceId();
            }

            if (deviceId == null) {
                deviceId = generateUUID();
            }

            device = {
                deviceId: deviceId,
                totalSessions: 0
            };
        }

        device.totalSessions++;
        settings.store.saveDeviceSync(device);

        return device;
    }

    function getEventName(name, shouldEscape) {
        if (!name || typeof name !== 'string' || name.length < 1) {
            tools.logger.info('The event name must be a non empty string');
            return null;
        }

        name = trim(name);
        if ((!tools.isDefinedAndNotNull(shouldEscape) || shouldEscape === true) && name[0] === '$') {
            name = '\\$' + name.slice(1);
        }

        name = tools.chopEventName(name);

        return name;
    }

    function trim(str) {
        if (str) {
            if (!String.prototype.trim) {
                return str.replace(/^\s\s*/, '').replace(/\s\s*$/, ''); //IE7 does not have trim on string object
            }
            return str.trim();
        }
        return '';
    }

    function safelyInvoke(location, fn, defaultValue) {
        try {
            return fn();
        } catch (e) {
            tools.logger.error(e.message, e);
            settings.internalEvents.trackError(location, e);
            if (tools.isDefinedAndNotNull(defaultValue)) {
                return defaultValue;
            }
        }
    }

    function getHashCode(value) {
        var hash = 0, i, chr, len;
        if (!value || value.length === 0) {
            return hash;
        }
        for (i = 0, len = value.length; i < len; i++) {
            chr = value.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0;
        }
        return hash;
    }



    var dayMilliseconds = 1000 * 60 * 60 * 24,
        Today           = 0x01,
        ThisWeek        = 0x02,
        ThisMonth       = 0x04,
        All             = 0x07;

    var TimeBreaker = function(dayNumber) {
        var date;
        if (typeof dayNumber !== 'undefined') {
            date = new Date(Date.UTC(1970, 0, 1, 0, 0, 0, 0));
            date.setDate(date.getDate() + dayNumber);
        } else {
            date = new Date();
            date.setDate(date.getDate());
        }

        date.setHours(0, 0, 0, 0);
        this.dayNumber = Math.round(date.getTime() / dayMilliseconds);
        this.weekNumber = Math.round(this.dayNumber / 7);
        this.monthNumber = (date.getFullYear() - 1970) * 12 + date.getMonth();
    };

    var UniquenessTracker = function() {
    };

    UniquenessTracker.prototype.start = function() {
        this._timenow = new TimeBreaker();
        this._masks = { };

        var data = settings.store.getCardinalSync();
        var lines = (data || '').toString().split('\r\n');

        var days = parseInt(lines[0]);
        if (isNaN(days)) {
            days = 0;
        }

        var timeonfile = new TimeBreaker(days);
        var keepmask =
            (this._timenow.dayNumber === timeonfile.dayNumber ? Today : 0) |
            (this._timenow.weekNumber === timeonfile.weekNumber ? ThisWeek : 0) |
            (this._timenow.monthNumber === timeonfile.monthNumber ? ThisMonth : 0);

        for (var i = 1; i < lines.length; i++) {
            var fields = lines[i].split(':');
            if (fields.length < 2) {
                break;
            }

            var value = parseInt(fields[0]);
            if (isNaN(value)) {
                value = 0;
            }
            var m = value & keepmask;
            if (m != 0) {
                var key = fields[1];
                this._masks[key] = m | (tools.isDefinedAndNotNull(this._masks[key]) ? this._masks[key] : 0);
            }
        }

        var diskUpdateNeeded = (keepmask != All || !tools.isEmptyObject(this._masks));
        if (diskUpdateNeeded) {
            this.saveToDisk();
        }
    };

    UniquenessTracker.prototype.track = function(key) {
        var existingMask = this._masks[key];
        var seenNow = (typeof existingMask !== 'undefined') ? (~existingMask & All) : All;
        this._masks[key] = All;
        return seenNow;
    };

    UniquenessTracker.prototype.saveToDisk = function(done) {
        var cardinal = this._timenow.dayNumber;
        var count = 0,
            max   = 100000;
        for (var prop in this._masks) {
            if (count++ == max) {
                break;
            }
            cardinal = cardinal + '\r\n' + this._masks[prop] + ':' + prop;
        }

        settings.store.saveCardinal(cardinal, done);
    };
}(this || global));