"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin = require("firebase-admin");
const environment_1 = require("./environments/environment");
admin.initializeApp({
    credential: admin.credential.cert(environment_1.environment.serviceAccountPath),
    databaseURL: environment_1.environment.databaseURL
});
var integration_1 = require("./app/functions/integration");
exports.integration = integration_1.integration;
var password_1 = require("./app/functions/password");
exports.changePassword = password_1.changePassword;
var users_1 = require("./app/functions/users");
exports.createCustomToken = users_1.createCustomToken;
exports.createUser = users_1.createUser;
exports.deleteUser = users_1.deleteUser;
//# sourceMappingURL=index.js.map