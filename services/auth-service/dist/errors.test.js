import { describe, it, expect } from 'vitest';
import { mapCognitoError } from './errors.js';
describe('mapCognitoError', () => {
    it('should map UsernameExistsException to 409', () => {
        const error = new Error('User already exists');
        error.name = 'UsernameExistsException';
        try {
            mapCognitoError(error);
        }
        catch (e) {
            const httpError = e;
            expect(httpError.statusCode).toBe(409);
            expect(httpError.message).toBe('An account with this email or phone is already registered');
        }
    });
    it('should map ServiceUnavailableException to 503', () => {
        const error = new Error('Service unavailable');
        error.name = 'ServiceUnavailableException';
        try {
            mapCognitoError(error);
        }
        catch (e) {
            const httpError = e;
            expect(httpError.statusCode).toBe(503);
            expect(httpError.message).toBe('Service temporarily unavailable. Please try again later.');
        }
    });
    it('should map InternalErrorException to 503', () => {
        const error = new Error('Internal error');
        error.name = 'InternalErrorException';
        try {
            mapCognitoError(error);
        }
        catch (e) {
            const httpError = e;
            expect(httpError.statusCode).toBe(503);
        }
    });
    it('should map TooManyRequestsException to 503', () => {
        const error = new Error('Too many requests');
        error.name = 'TooManyRequestsException';
        try {
            mapCognitoError(error);
        }
        catch (e) {
            const httpError = e;
            expect(httpError.statusCode).toBe(503);
        }
    });
    it('should map InvalidParameterException to 400', () => {
        const error = new Error('Invalid parameter');
        error.name = 'InvalidParameterException';
        try {
            mapCognitoError(error);
        }
        catch (e) {
            const httpError = e;
            expect(httpError.statusCode).toBe(400);
        }
    });
    it('should map unknown errors to 500 without exposing details', () => {
        const error = new Error('Some internal AWS error with sensitive info');
        error.name = 'SomeUnknownException';
        try {
            mapCognitoError(error);
        }
        catch (e) {
            const httpError = e;
            expect(httpError.statusCode).toBe(500);
            expect(httpError.message).toBe('An unexpected error occurred. Please try again later.');
            expect(httpError.message).not.toContain('AWS');
            expect(httpError.message).not.toContain('sensitive');
        }
    });
    it('should handle non-Error objects gracefully', () => {
        try {
            mapCognitoError('string error');
        }
        catch (e) {
            const httpError = e;
            expect(httpError.statusCode).toBe(500);
            expect(httpError.message).toBe('An unexpected error occurred. Please try again later.');
        }
    });
});
//# sourceMappingURL=errors.test.js.map