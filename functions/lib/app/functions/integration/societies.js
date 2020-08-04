"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const logInfo_1 = require("../../entities/logInfo");
const firebase_1 = require("../../utils/firebase");
const utils_1 = require("../../utils/utils");
exports.getSocietiesService = (request, response) => {
    const logInfo = new logInfo_1.LogInfo('getContratoService', utils_1.getUniqueId());
    utils_1.logMessage(logInfo, '1. Init process');
    const type = request.params.type;
    return firebase_1.getSocieties().pipe(operators_1.flatMap(res => {
        if (!res) {
            return rxjs_1.throwError('societies_not_found');
        }
        return rxjs_1.of(res);
    })).toPromise().then(res => {
        return response.status(200).json(res);
    }).catch(error => {
        return utils_1.getErrorResponse('getContratoService', response, 'server.errors.ERROR_GET_CONTRATO', logInfo, error);
    });
};
//# sourceMappingURL=societies.js.map