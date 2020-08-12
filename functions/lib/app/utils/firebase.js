"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSocieties = void 0;
const admin = require("firebase-admin");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
function getSocieties() {
    return rxjs_1.from(admin.firestore().collection(`societies`).get())
        .pipe(operators_1.map(societiesDB => {
        if (!societiesDB) {
            return null;
        }
        const societiesList = new Array();
        societiesDB.forEach(inmuebleDB => {
            societiesList.push(inmuebleDB.data());
        });
        return societiesList;
    }), operators_1.catchError(error => {
        return rxjs_1.of(null);
    }));
}
exports.getSocieties = getSocieties;
//# sourceMappingURL=firebase.js.map