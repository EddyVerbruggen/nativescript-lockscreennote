# Telerik Analytics Plugin for NativeScript

- [Getting started](#getting-started)
- [API Reference](#api)
- [Troubleshooting](#troubleshooting)

## Getting started

1. Obtain an AppId

    [Create a new application](http://docs.telerik.com/platform/help/workspaces/workspace-management/create-workspace) in Telerik Platform by choosing the *Native* application type.

2. Enable Analytics

    Select Analytics from the left navigation menu and click *Enable Analytics*.

3. Create a new NativeScript application

        tns create MyApp

    or use an existing one.

4. Add the Analytics plugin (from npm). This will install the nativescript-telerik-analytics plugin in node_modules in the root of the project. When adding a new platform (or using an existing one) the plugin will be added there as well. Go to the application folder and add the Analytics plugin:

        tns plugin add nativescript-telerik-analytics

5. Go to the application folder and add the Android (or iOS) platform to the application:

        tns platform add android

6. Initialize the plugin and start a new session in the `onLaunch` event (app.js):

    ```javascript
    var application = require('application');
    application.mainModule = 'main-page';
    application.cssFile = './app.css';

    application.on(application.launchEvent, function(context) {
        var Analytics = require('nativescript-telerik-analytics');
        Analytics.init({ appId: 'oamq6lixk0rak4dl' });
        Analytics.start();
    });

    application.start();
    ```

7. Track some events in your application:

    ```javascript
    var Analytics = require('nativescript-telerik-analytics'),
        timer = require('timer');

    Analytics.trackEvent('MyCategory.MyEvent');

    Analytics.trackValue('myvalue', 245);

    var timingScope = Analytics.trackTimingStart('mytiming');
    timer.setTimeout(function() {
        timingScope.stop(); // or timingScope.cancel(); if you want to ignore the timing
    }, 3500);

    Analytics.trackTimingRaw('myrawtiming', 1300); // track timing of 1300 ms

    try {
        throw new Error('error message');
    } catch (e) {
        Analytics.trackException(e, 'some error context');
    }
    ```

8. Attach your phone to the PC, ensure `adb devices` command lists it and run the app on the phone:

        tns run android

## API

To use the Analytics plugin you need to require the `nativescript-telerik-analytics` module:

```javascript
var Analytics = require('nativescript-telerik-analytics');
```

And then call any of the available methods on it:

- ***init(settings)*** - used to initialize the plugin with different configuration options. This method must be called before starting a new session or tracking events. It is the first method that needs to be called.

    ```javascript
    var settings = {
        appId: 'oamq6lixk0rak4dl', // Required identifier of the application obtained in Telerik Platform
        productVersion: '1.2.3.4', // Optional - the version of the monitored application
        location: { // optionally associate some geo location coordinates with the user 
            latitude: 40.719618,
            longitude: -74.010282
        },
        clientIP: '193.42.34.123', // optionally override the IP of the user
        isInternalData: false, // Optional flag allowing to enable test mode for this session. This will mark all events tracked in this particular session as "Internal"
        autoTrackUnhandledExceptions: false, // Optionally turn off automatic exception handling. The default value is true. The plugin subscribes to the "application.uncaughtErrorEvent" and automatically tracks the exception
        logger: new MyLogger() // Optionally specify a custom logger. This should be an instance of a class with info(message, obj) and error(message, obj) functions.
    };
    Analytics.init(settings);
    ```

- ***start()*** - starts a new Analytics session. The SDK needs to be initialized with the init method prior to calling this method.  

    ```javascript
    Analytics.start();
    ```

- ***trackEvent(name)*** - registers a feature usage. It is recommended that related features are grouped by using simple dot-notation in the name such as e.g. relating print to pdf and print to file by naming the features "print.pdf" and "print.file" respectively 

    ```javascript
    Analytics.trackEvent('Printing.PDF');
    ```

- ***trackValue(name, value)*** - register a value on a specific feature. While calls to `trackEvent` increments the use of a feature in the session a call to this methods will associate a given value with a named feature. Use this method to e.g. track the distribution of file sizes imported or the number of results registered. Tracking this distribution across all your application usage will give insights to what scenarios your applications are handling. The value parameter must be a valid integer. 

    ```javascript
    Analytics.trackValue('FilesProcessed', 152);
    ```

- ***trackException(e, context)*** - Call to track an exception that occurred in the application. An optional context string can be associated with the exception. 

    ```javascript
    try {
        throw new Error('error message');
    } catch (e) {
        Analytics.trackException(e, 'some optional context');
    }
    ```

- ***trackTimingStart(name)*** - Starts a named timer for measuring elapsed time on operation and returns a scope that can be used to stop or cancel the timing operation.  

    ```javascript
    var timer = require('timer'),
        timingScope = Analytics.trackTimingStart('MyTiming');
    timer.setTimeout(function() {
        timingScope.stop(); // at this stage the timer will be stopped and the elapsed time submitted to Analytics in milliseconds. You can abort the timing operation by calling timingScope.cancel();  
    }, 1450);
    ```

- ***trackTimingRaw(name, durationInMilliseconds)*** - Registers elapsed time measured by some other means.  

    ```javascript
    Analytics.trackTimingRaw('MyTiming', 563);
    ```


## Troubleshooting

In case the application doesn't work as expected, here are some things you can verify:

- For Android ensure that the AndroindManifest.xml located at `platforms\android` contains the following permission:

    ```xml
    <uses-permission android:name="android.permission.INTERNET"/>
    ```

- Enable logging to see if there are some information or error messages logged. You could enable logging by writing the following module (`mylogger.js`):

    ```javascript
    (function(global) {
        var MyLogger = function() {
        };

        exports = module.exports = MyLogger;

        MyLogger.prototype.info = function(message, obj) {
            console.log('INFO: ' + message + (obj ? ' : ' + JSON.stringify(obj) : ''));
        };

        MyLogger.prototype.error = function(message, obj) {
            if (obj instanceof Error) {
                console.log('ERROR: ' + message + (obj ? ' : ' + obj.message : ''));
            } else {
                console.log('ERROR: ' + message + (obj ? ' : ' + JSON.stringify(obj) : ''));
            }
        };
    }(this || global));
    ```

    and then set this logger when initializing the plugin:

    ```javascript
    var Analytics = require('nativescript-telerik-analytics'),
        MyLogger  = require('./mylogger');

    Analytics.init({
        appId : 'oamq6lixk0rak4dl',
        logger: new MyLogger()
    });
    ```