"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogInfo = void 0;
class LogInfo {
    constructor(process, reqId) {
        this.process = '';
        this.reqId = '';
        this.initDate = new Date();
        this.process = process;
        this.reqId = reqId;
        this.initDate = new Date();
    }
}
exports.LogInfo = LogInfo;
//# sourceMappingURL=logInfo.js.map