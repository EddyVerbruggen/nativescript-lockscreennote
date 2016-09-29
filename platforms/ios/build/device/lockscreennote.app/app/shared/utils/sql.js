// module.exports = {
//     enable: function(listView, deleteCallback) {
//         callback = deleteCallback;
//         var myDataSource = EditableDataSource.initWithOwnerBaseDataSource(this, listView.ios.dataSource);
//         listView.ios.dataSource = myDataSource;
//         listView.__keepDataSourceReference = myDataSource;
//     }
// };

var sqlite = require("nativescript-sqlite");

module.exports.createTable = function() {
    new sqlite("LockScreenNote.db", function(err, db) {
        // note_title is legacy and not used in the app
        db.execSQL("CREATE TABLE IF NOT EXISTS Note (id INTEGER PRIMARY KEY ASC, note_title TEXT, note_text TEXT, active_yn TEXT, active_seconds INTEGER)", [], function(err) {
            //console.log("***TABLE CREATED***");
        });
    });
}

module.exports.deleteTable = function() {
    new sqlite("LockScreenNote.db", function(err, db) {
        db.execSQL("DROP TABLE IF EXISTS Note", [], function(err) {
            //console.log("***TABLE DROPPED***");
        });
    });
}

module.exports.insertNote = function(title, text, active, seconds) {
    new sqlite("LockScreenNote.db", function(err, db) {
        db.execSQL("INSERT INTO Note (note_title, note_text, active_yn, active_seconds) VALUES (?,?,?,?)", [title, text, active, seconds], function(err, id) {
            //console.log("The new record id is:", id);
        });
    });
}

module.exports.updateNote = function(id, title, text, active, seconds) {
    new sqlite("LockScreenNote.db", function(err, db) {
        db.execSQL("UPDATE Note SET note_title = ?, note_text = ?, active_yn = ?, active_seconds = ? WHERE id = ?", [title, text, active, seconds, id], function(err, id) {
            //console.log("The new record id is:", id);
        });
    });
}

module.exports.deleteNote = function(id) {
    new sqlite("LockScreenNote.db", function(err, db) {
        db.execSQL("DELETE FROM Note WHERE id = ?", [id], function(err, id) {
            //console.log("The new record id is:", id);
        });
    });
}

// module.exports.selectNote = function(id) {
//     new sqlite("LockScreenNote.db", function(err, db) {
//         db.get("SELECT * FROM Note WHERE id = ?", [id], function(err, row) {
//             console.log("Row of data was: ", row);  // Prints [["Field1", "Field2",...]] 
//         });
//     });
// }

// module.exports.loadAllNotes = function() {
//     new sqlite("LockScreenNote.db", function(err, db) {
//         db.all("SELECT * FROM Note ORDER BY id", [], function(err, rs) {
//             //console.log("***Result set is:", rs); // Prints [["Row_1 Field_1" "Row_1 Field_2",...], ["Row 2"...], ...]
//         });
//     });
// }