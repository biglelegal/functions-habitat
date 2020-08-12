"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin = require("firebase-admin");
const environment_1 = require("./environments/environment");
admin.initializeApp({
    credential: admin.credential.cert(environment_1.environment.serviceAccountPath),
    databaseURL: environment_1.environment.databaseURL
});
var integration_1 = require("./app/functions/integration");
Object.defineProperty(exports, "integration", { enumerable: true, get: function () { return integration_1.integration; } });
var password_1 = require("./app/functions/password");
Object.defineProperty(exports, "changePassword", { enumerable: true, get: function () { return password_1.changePassword; } });
var users_1 = require("./app/functions/users");
Object.defineProperty(exports, "createCustomToken", { enumerable: true, get: function () { return users_1.createCustomToken; } });
Object.defineProperty(exports, "createUser", { enumerable: true, get: function () { return users_1.createUser; } });
Object.defineProperty(exports, "deleteUser", { enumerable: true, get: function () { return users_1.deleteUser; } });
//# sourceMappingURL=index.js.map