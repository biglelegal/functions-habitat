"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const environment_1 = require("../../environments/environment");
exports.corsOptions = {
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'X-Access-Token'],
    credentials: true,
    methods: 'POST',
    preflightContinue: false,
    origin: environment_1.environment.apiUrl
};
//# sourceMappingURL=corsOptions.js.map