import { Request, Response } from 'express';
import { LogInfo } from '../../entities/logInfo';
import { getUniqueId, logMessage } from '../../utils/utils';

export const getCompraventaService = (request: Request, response: Response): Promise<Response> | Response => {
    const logInfo: LogInfo = new LogInfo('getCompraventaService', getUniqueId());
    logMessage(logInfo, '1. Init process');
    return response.status(200).json({
        "codigoReserva": request.params.id
    })
};
