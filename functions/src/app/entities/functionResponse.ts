export class FunctionResponse {
    result: boolean;
    body?: any;
    message?: string;
    stackTrace?: any;
    toString() {
        return `FunctionResponse : [result: ${this.result}, body: ${this.body}, message: ${this.message}, stackTrace: ${this.stackTrace} ]`;
    }
}
