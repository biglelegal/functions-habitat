"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCustomToken = exports.createUser = exports.deleteUser = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const entities_1 = require("../entities");
// CORS Express middleware to enable CORS Requests.
const cors = require('cors')({ origin: true });
const express = require('express');
const app = express();
const unirest = require('unirest');
exports.deleteUser = functions.firestore.document('users/{userID}').onDelete((snap, context) => {
    console.log('init deleteUser');
    const response = new entities_1.FunctionResponse();
    const userUid = snap.id;
    return admin.auth().deleteUser(userUid).then(res => {
        response.result = true;
        console.log('response : ' + response);
    }).catch(error => {
        response.result = false;
        response.message = 'Error delete user';
        response.stackTrace = error;
        console.log('response : ' + response);
    });
});
exports.createUser = functions.firestore.document('users/{userID}').onCreate((snap, context) => {
    console.log('init createUser');
    const response = new entities_1.FunctionResponse();
    const user = snap.data(); // data that was created
    const userAuth = {
        displayName: user.name,
        email: user.email,
        disabled: false,
        uid: snap.id
    };
    return admin.auth().createUser(userAuth).then(res => {
        response.result = true;
        console.log('response : ' + response);
        snap.ref.set({
            uid: snap.id,
            creationTime: new Date().getTime()
        }, { merge: true });
    }).catch(error => {
        response.result = false;
        response.message = 'Error create user';
        response.stackTrace = error;
        console.log('response : ' + response);
    });
});
const singleSignOn = (request, response, next) => {
    console.log('init singleSignOn');
    const functionResponse = new entities_1.FunctionResponse();
    functionResponse.result = false;
    functionResponse.message = 'server.errors.SINGLE_SIGN_ON_DISABLED';
    response.status(500).send(functionResponse);
    console.log('Single sign on disabled');
    return response;
};
app.use(cors);
app.use(singleSignOn);
exports.createCustomToken = functions.https.onRequest(app);
function getCutomToken(userUid, functionResponse, response) {
    admin.auth().createCustomToken(userUid).then((customToken) => {
        // console.log("customToken:", customToken);
        functionResponse.result = true;
        functionResponse.message = customToken;
        response.status(200).send(functionResponse);
    }).catch((error) => {
        functionResponse.result = false;
        functionResponse.message = 'server.errors.ERROR_GET_CUSTOM_TOKEN';
        functionResponse.stackTrace = error;
        response.status(500).send(functionResponse);
        console.log("Error creating custom token:", error);
    });
}
//# sourceMappingURL=users.js.map