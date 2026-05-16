export enum ErrorCode {
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    CONFLICT = 409,
    INTERNAL_SERVER_ERROR = 500,
}

export class ErrorHandler extends Error {
    statusCode: number;
    constructor(message: string, statusCode: ErrorCode) {
        super(message);
        this.statusCode = statusCode;
    }
}