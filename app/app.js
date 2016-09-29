"use strict";
var application = require("application");

application.on(application.launchEvent, function(context) {
    var Analytics = require('nativescript-telerik-analytics');
    Analytics.init({ appId: 'x0ccycbmzhbqjqgy' });
    Analytics.start();

    var sql = require("../app/shared/utils/sql");
    sql.createTable();
});

application.start({ moduleName: "views/list/list" });
//# sourceMappingURL=app.js.map