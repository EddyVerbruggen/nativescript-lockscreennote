"use strict";
var frameModule = require("ui/frame");
var dialogsModule = require("ui/dialogs");
var sqlite = require("nativescript-sqlite");
var sql = require("../../shared/utils/sql");
var localnotifications = require("nativescript-local-notifications");
var gestures = require("ui/gestures");

var page;
var delayArray = [];

exports.page_navigatedto = function(args) {
    page = args.object;
    var note = page.getViewById("note");
    var visible = page.getViewById("visible");
    var delayLabel = page.getViewById("delayLabel");
    var delay = page.getViewById("delay");

    // set up the keyboard hide event
    var observer = page.observe(gestures.GestureTypes.tap, function (args) {
        note.dismissSoftInput();
    });

    // set up the delay items
    if (delayArray.length == 0) {
        var text1 = "10 Seconds";
        delayArray.push({ value: 10, text: "10 Seconds", toString: () => { return text1; } });
        var text2 = "30 Seconds";
        delayArray.push({ value: 30, text: "30 Seconds", toString: () => { return text2; } });
        var text3 = "1 Minute";
        delayArray.push({ value: 60, text: "1 Minute", toString: () => { return text3; } });
        var text4 = "5 Minutes";
        delayArray.push({ value: 300, text: "5 Minutes", toString: () => { return text4; } });
        var text5 = "15 Minutes";
        delayArray.push({ value: 900, text: "15 Minutes", toString: () => { return text5; } });
        var text6 = "30 Minutes";
        delayArray.push({ value: 1800, text: "30 Minutes", toString: () => { return text6; } });
    }

    delay.items = delayArray;
    delay.selectedIndex = 2;

    if (page.navigationContext) {
        
        // editing an existing item
        var id = page.navigationContext.id;

        new sqlite("LockScreenNote.db", function(err, db) {
            db.get("SELECT * FROM Note WHERE id = ?", [id], function(err, row) {
                //console.log("Row of data was: ", row);  // Prints [["Field1", "Field2",...]]

                note.text = row[2];
                visible.checked = row[3] == "Y" ? true : false;

                switch (row[4]) {
                    case 10:
                        delay.selectedIndex = 0;
                        break;
                    case 30:
                        delay.selectedIndex = 1;
                        break;
                    case 60:
                        delay.selectedIndex = 2;
                        break;
                    case 300:
                        delay.selectedIndex = 3;
                        break;
                    case 900:
                        delay.selectedIndex = 4;
                        break;
                    case 1800:
                        delay.selectedIndex = 5;
                }
                
                visible_change();
            });
        });
    }
}

exports.save = function() {

    var note = page.getViewById("note");
    var visible = page.getViewById("visible");
    var active = visible.checked ? "Y" : "N";
    var delay = page.getViewById("delay");
    var item = delayArray[delay.selectedIndex];

    if (note.text.length == 0) return;

    if (page.navigationContext) {
        
        // editing an existing item
        var id = page.navigationContext.id;
        sql.updateNote(id, "", note.text, active, item.value);

    } else {

        // adding a new item
        sql.insertNote("", note.text, active, item.value);
    }

    // add the notification
    if (active == "Y") {
        localnotifications.schedule([{
            //id: 1,
            //title: 'The title',
            body: note.text,
            //badge: 1,
            //interval: 'minute',
            sound: null, // suppress the default sound
            at: new Date(new Date().getTime() + (item.value * 1000)) // 10 seconds from now
        }]).then(
            function() {
                console.log("Notification scheduled");
            },
            function(error) {
                console.log("scheduling error: " + error);
            }
        )
    }

    frameModule.topmost().navigate("views/list/list");
}

exports.cancel = function() {
    frameModule.topmost().navigate("views/list/list");
}

exports.visible_change = function(args) {
    if (page) {
        var visible = page.getViewById("visible");
        var delayLabel = page.getViewById("delayLabel");
        var delay = page.getViewById("delay");
        var warning = page.getViewById("warning");

        if (visible.checked) {
            delayLabel.visibility = "visible";
            delay.visibility = "visible";
            warning.visibility = "visible";
        } else {
            delayLabel.visibility = "collapse";
            delay.visibility = "collapse";
            warning.visibility = "collapse";
        }
    }
}