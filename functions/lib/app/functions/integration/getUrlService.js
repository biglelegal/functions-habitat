"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUrl = void 0;
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const environment_1 = require("../../../environments/environment");
const getUrlResponse_1 = require("../../entities/getUrlResponse");
const logInfo_1 = require("../../entities/logInfo");
const utils_1 = require("../../utils/utils");
function getUrl(request, response) {
    const logInfo = new logInfo_1.LogInfo('getUrl', utils_1.getUniqueId());
    const axiosRequest = request.body;
    validateRequest(axiosRequest)
        .pipe(operators_1.flatMap(res => getUrlRersponse(axiosRequest))).toPromise()
        .then((getUrlResponse) => {
        utils_1.logMessage(logInfo, JSON.stringify(getUrlResponse));
        return response.status(200).send(getUrlResponse);
    })
        .catch((error) => response.status(500).json({ error: error }));
}
exports.getUrl = getUrl;
function validateRequest(axiosRequest) {
    if (!axiosRequest.type) {
        return rxjs_1.throwError('type_not_found');
    }
    if (axiosRequest.type !== 'Legal') {
        return rxjs_1.throwError('wrong_type');
    }
    if (['societies'].indexOf(axiosRequest.crmId) === -1) {
        return rxjs_1.throwError('wrong_crmid');
    }
    return rxjs_1.of(null);
}
function getUrlRersponse(axiosRequest) {
    const axiosResponse = new getUrlResponse_1.GetUrlResponse();
    axiosResponse.url = `${environment_1.environment.integration.url}/${environment_1.environment.integration.societies}`;
    axiosResponse.method = 'get';
    return rxjs_1.of(axiosResponse);
}
//# sourceMappingURL=getUrlService.js.map