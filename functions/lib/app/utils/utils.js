"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handelAxiosError = exports.getUniqueId = exports.logMessage = exports.getErrorResponse = exports.errorResponse = void 0;
const entities_1 = require("../entities");
function errorResponse(message, error) {
    const functionResponse = new entities_1.FunctionResponse();
    functionResponse.result = false;
    functionResponse.message = message;
    functionResponse.stackTrace = error;
    return functionResponse;
}
exports.errorResponse = errorResponse;
function getErrorResponse(location, response, errorMessage, logInfo, error) {
    const functionResponse = new entities_1.FunctionResponse();
    functionResponse.result = false;
    functionResponse.message = errorMessage;
    if (error) {
        functionResponse.stackTrace = error;
    }
    logMessage(logInfo, `${location}: ${errorMessage}`, error);
    return response.status(500).send(functionResponse);
}
exports.getErrorResponse = getErrorResponse;
function logMessage(logInfo, message, error) {
    const eTime = (new Date().getTime() - logInfo.initDate.getTime()) / 1000;
    if (error) {
        console.error(`**${logInfo.process} ${logInfo.reqId}**`, message, eTime + 'ms', error);
    }
    else {
        console.log(`**${logInfo.process} ${logInfo.reqId}**`, message, eTime + 'ms');
    }
}
exports.logMessage = logMessage;
function getUniqueId() {
    return ((1 + Math.random()) * 0x10000).toString(16).replace('.', '');
}
exports.getUniqueId = getUniqueId;
function handelAxiosError(error) {
    if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        // console.log(error.response.data);
        // console.log('Axios status', error.response.status);
        // console.log('Axios headers', error.response.headers);
        // console.log('Axios response', util.inspect(error.response));
    }
    console.log('Axios Error', error.message);
}
exports.handelAxiosError = handelAxiosError;
//# sourceMappingURL=utils.js.map