import { Response } from 'express';
import { FunctionResponse } from '../entities';
import { LogInfo } from '../entities/logInfo';

export function errorResponse(logInfo: LogInfo, message: string, error?: any): FunctionResponse {
    const functionResponse: FunctionResponse = new FunctionResponse();
    functionResponse.result = false;
    functionResponse.message = message;
    functionResponse.stackTrace = error;
    logMessage(logInfo, 'Error', functionResponse.toString());
    return functionResponse;
}

export function getErrorResponse(location: string, response: Response, errorMessage: string, logInfo: LogInfo, error?: any) {
    const functionResponse: FunctionResponse = new FunctionResponse();
    functionResponse.result = false;
    functionResponse.message = errorMessage;
    if (error) {
        functionResponse.stackTrace = error;
    }
    logMessage(logInfo, `${location}: ${errorMessage}`, error);
    return response.status(500).send(functionResponse);
}

export function logMessage(logInfo: LogInfo, message: string, error?: any): void {
    const eTime = (new Date().getTime() - logInfo.initDate.getTime()) / 1000;
    if (error) {
        console.error(`**${logInfo.process} ${logInfo.reqId}**`, message, eTime + 'ms', error);
    } else {
        console.log(`**${logInfo.process} ${logInfo.reqId}**`, message, eTime + 'ms');
    }
}

export function getUniqueId(): string {
    return ((1 + Math.random()) * 0x10000).toString(16).replace('.', '');
}

export function handelAxiosError(error: any) {
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

export function isEmpty(obj: any): boolean {
    if (!obj) {
        return true;
    }
    for (const prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            return false;
        }
    }
    return JSON.stringify(obj) === JSON.stringify({});
}
