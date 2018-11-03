interface HTTPError {
    code: number
}

export class BadRequestError extends Error implements HTTPError {
    get code() {
        return 400;
    }
}

export class InternalServerError extends Error implements HTTPError {
    get code() {
        return 500;
    }
}

export class RaceConditionError extends Error implements HTTPError {
    get code() {
        return 500;
    }
}

export class NotFoundError extends Error implements HTTPError {
    get code() {
        return 404;
    }
}

export class TooManyRequestsError extends Error implements HTTPError {
    private _retryAfter;

    get code() {
        return 429;
    }

    get retryAfter() {
        return this._retryAfter
    }

    constructor(retryAfter: number) {
        super('Too many requests');
        this._retryAfter = retryAfter;
    }
}