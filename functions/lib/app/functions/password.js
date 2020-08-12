"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const entities_1 = require("../entities");
// CORS Express middleware to enable CORS Requests.
const cors = require('cors')({ origin: true });
const express = require('express');
const app = express();
const unirest = require('unirest');
const changePasswordService = (request, response, next) => {
    console.log('init changePasswordService');
    // console.log(JSON.stringify({ body: request.body }));
    const functionResponse = new entities_1.FunctionResponse();
    const uid = request.body.uid;
    if (!uid) {
        const error = 'uid_not_found';
        console.log(JSON.stringify({ error: error }));
        throw JSON.stringify(error);
    }
    const password = request.body.password;
    if (!password) {
        const error = 'password_not_found';
        console.log(JSON.stringify({ error: error }));
        throw JSON.stringify(error);
    }
    const token = request.body.token;
    if (!token) {
        const error = 'token_not_found';
        console.log(JSON.stringify({ error: error }));
        throw JSON.stringify(error);
    }
    return admin.auth().verifyIdToken(token).then(userRecord => {
        console.log("Successfully fetched user token:");
        return admin.auth().getUser(uid).then(userRecord => {
            console.log("Successfully fetched user data:");
            admin.auth().updateUser(uid, {
                password: password
            }).then(userRecord => {
                // See the UserRecord reference doc for the contents of userRecord.
                console.log("Successfully updated user");
                response.status(200).send(functionResponse);
                return;
            }).catch(error => {
                console.log(JSON.stringify({ message: "Error updating user:", error: error }));
                throw JSON.stringify(error);
            });
        }).catch(error => {
            console.log(JSON.stringify({ message: "Error fetching user data:", error: error }));
            throw JSON.stringify(error);
        });
    }).catch(error => {
        console.log(JSON.stringify({ message: "Error fetching user token:", error: error }));
        throw JSON.stringify(error);
    });
};
app.use(cors);
app.use(changePasswordService);
exports.changePassword = functions.https.onRequest(app);
//# sourceMappingURL=password.js.map