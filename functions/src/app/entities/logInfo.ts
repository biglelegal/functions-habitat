export class LogInfo {
    process: string = '';
    reqId: string = '';
    initDate: Date = new Date();
    constructor(process: string, reqId: string) {
        this.process = process;
        this.reqId = reqId;
        this.initDate = new Date();
    }
}