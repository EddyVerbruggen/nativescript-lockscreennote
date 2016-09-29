"use strict";
var frameModule = require("ui/frame");
var dialogsModule = require("ui/dialogs");
var swipeDelete = require("../../shared/utils/ios-swipe-delete");
var sqlite = require("nativescript-sqlite");
var sql = require("../../shared/utils/sql");

var page;
var pageData = [];
var allItems = [];

exports.page_loaded = function(args) {
    page = args.object;

    // enable swipe to delete for ios
    if (page.ios) {
        var listView = page.getViewById("itemList");
        swipeDelete.enable(listView, function(index) {
            var item = allItems[index];
            sql.deleteNote(item.id);
            allItems.splice(index, 1);
            listView.refresh();
        });
    }

    // load the test data
    // var newItem1 = { note: "poop", id: 1 };
    // var newItem2 = { note: "pee", id: 2 };
    // allItems.push(newItem1);
    // allItems.push(newItem2);

    // pageData.allItems = allItems;

    // bind the data to the listView
    //page.bindingContext = pageData;

    allItems = [];

    new sqlite("LockScreenNote.db", function(err, db) {
        db.all("SELECT * FROM Note ORDER BY id", [], function(err, rs) {
            for (var i=0; i < rs.length; i++) {
                var item = { note: rs[i][2], id: rs[i][0]};
                allItems.push(item);
            }
            //console.log("***Result set is:", rs); // Prints [["Row_1 Field_1" "Row_1 Field_2",...], ["Row 2"...], ...]
            pageData.allItems = allItems;

            //bind the data to the listView
            page.bindingContext = pageData;
        });
    });
}

// separate item deletion for android (ios taken care of via swipe action above)
exports.item_delete = function(args) {
    var listView = page.getViewById("itemList");
    var item = args.view.bindingContext;
    sql.deleteNote(item.id);

    var index = allItems.indexOf(item);
    allItems.splice(index, 1);
    listView.refresh();
}

exports.note_tap = function(args) {
    var item = args.view.bindingContext;
    var nav = { moduleName: "views/detail/item-detail", context: { id: item.id } };
    frameModule.topmost().navigate(nav);
}

exports.add_tap = function() {
    frameModule.topmost().navigate("views/detail/item-detail");
}