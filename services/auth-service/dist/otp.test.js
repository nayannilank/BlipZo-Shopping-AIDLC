import { describe, it, expect } from 'vitest';
import { createOtpExpiredError, createOtpInvalidError, createOtpMaxAttemptsError, createPhoneNotFoundError, createOtpDeliveryFailedError, AUTH_ERROR_CODES, } from './errors.js';
import { validateOtpRequestInput, validateOtpVerifyInput, validateTokenRefreshInput, } from './validators.js';
function createEvent(body) {
    return {
        body: body,
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/auth/otp/request',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {},
        resource: '',
    };
}
describe('validateOtpRequestInput', () => {
    it('should return valid OtpRequestPayload for valid E.164 phone', () => {
        const event = createEvent({ phone: '+919876543210' });
        const result = validateOtpRequestInput(event);
        expect(result).toEqual({ phone: '+919876543210' });
    });
    it('should accept phone with minimum digits (7 after +)', () => {
        const event = createEvent({ phone: '+1234567' });
        const result = validateOtpRequestInput(event);
        expect(result).toEqual({ phone: '+1234567' });
    });
    it('should accept phone with maximum digits (15 after +)', () => {
        const event = createEvent({ phone: '+123456789012345' });
        const result = validateOtpRequestInput(event);
        expect(result).toEqual({ phone: '+123456789012345' });
    });
    it('should throw 400 when body is null', () => {
        const event = createEvent(null);
        expect(() => validateOtpRequestInput(event)).toThrow();
    });
    it('should throw 400 for phone without + prefix', () => {
        const event = createEvent({ phone: '919876543210' });
        expect(() => validateOtpRequestInput(event)).toThrow();
    });
    it('should throw 400 for phone with too few digits', () => {
        const event = createEvent({ phone: '+12345' });
        expect(() => validateOtpRequestInput(event)).toThrow();
    });
    it('should throw 400 for phone with too many digits', () => {
        const event = createEvent({ phone: '+1234567890123456' });
        expect(() => validateOtpRequestInput(event)).toThrow();
    });
    it('should throw 400 for phone with non-numeric characters', () => {
        const event = createEvent({ phone: '+91abc543210' });
        expect(() => validateOtpRequestInput(event)).toThrow();
    });
    it('should throw 400 when phone is missing', () => {
        const event = createEvent({});
        expect(() => validateOtpRequestInput(event)).toThrow();
    });
});
describe('validateOtpVerifyInput', () => {
    it('should return valid OtpVerifyPayload for valid input', () => {
        const event = createEvent({ phone: '+919876543210', otp: '123456' });
        const result = validateOtpVerifyInput(event);
        expect(result).toEqual({ phone: '+919876543210', otp: '123456' });
    });
    it('should throw 400 when body is null', () => {
        const event = createEvent(null);
        expect(() => validateOtpVerifyInput(event)).toThrow();
    });
    it('should throw 400 for OTP with less than 6 digits', () => {
        const event = createEvent({ phone: '+919876543210', otp: '12345' });
        expect(() => validateOtpVerifyInput(event)).toThrow();
    });
    it('should throw 400 for OTP with more than 6 digits', () => {
        const event = createEvent({ phone: '+919876543210', otp: '1234567' });
        expect(() => validateOtpVerifyInput(event)).toThrow();
    });
    it('should throw 400 for OTP with non-numeric characters', () => {
        const event = createEvent({ phone: '+919876543210', otp: '12345a' });
        expect(() => validateOtpVerifyInput(event)).toThrow();
    });
    it('should throw 400 for invalid phone in OTP verify', () => {
        const event = createEvent({ phone: 'invalid', otp: '123456' });
        expect(() => validateOtpVerifyInput(event)).toThrow();
    });
    it('should throw 400 when OTP is missing', () => {
        const event = createEvent({ phone: '+919876543210' });
        expect(() => validateOtpVerifyInput(event)).toThrow();
    });
    it('should throw 400 when phone is missing', () => {
        const event = createEvent({ otp: '123456' });
        expect(() => validateOtpVerifyInput(event)).toThrow();
    });
});
describe('validateTokenRefreshInput', () => {
    it('should return valid TokenRefreshInput for valid refresh token', () => {
        const event = createEvent({ refreshToken: 'some-valid-refresh-token' });
        const result = validateTokenRefreshInput(event);
        expect(result).toEqual({ refreshToken: 'some-valid-refresh-token' });
    });
    it('should throw 400 when body is null', () => {
        const event = createEvent(null);
        expect(() => validateTokenRefreshInput(event)).toThrow();
    });
    it('should throw 400 when refreshToken is empty', () => {
        const event = createEvent({ refreshToken: '' });
        expect(() => validateTokenRefreshInput(event)).toThrow();
    });
    it('should throw 400 when refreshToken is missing', () => {
        const event = createEvent({});
        expect(() => validateTokenRefreshInput(event)).toThrow();
    });
});
describe('OTP error helpers', () => {
    it('createOtpExpiredError should throw 400 with OTP_EXPIRED code', () => {
        try {
            createOtpExpiredError();
        }
        catch (e) {
            const httpError = e;
            expect(httpError.statusCode).toBe(400);
            expect(httpError.code).toBe(AUTH_ERROR_CODES.OTP_EXPIRED);
            expect(httpError.message).toContain('expired');
        }
    });
    it('createOtpInvalidError should throw 400 with OTP_INVALID code', () => {
        try {
            createOtpInvalidError();
        }
        catch (e) {
            const httpError = e;
            expect(httpError.statusCode).toBe(400);
            expect(httpError.code).toBe(AUTH_ERROR_CODES.OTP_INVALID);
            expect(httpError.message).toContain('Invalid OTP');
        }
    });
    it('createOtpMaxAttemptsError should throw 400 with OTP_MAX_ATTEMPTS code', () => {
        try {
            createOtpMaxAttemptsError();
        }
        catch (e) {
            const httpError = e;
            expect(httpError.statusCode).toBe(400);
            expect(httpError.code).toBe(AUTH_ERROR_CODES.OTP_MAX_ATTEMPTS);
            expect(httpError.message).toContain('Maximum OTP attempts');
        }
    });
    it('createPhoneNotFoundError should throw 404 with PHONE_NOT_FOUND code', () => {
        try {
            createPhoneNotFoundError();
        }
        catch (e) {
            const httpError = e;
            expect(httpError.statusCode).toBe(404);
            expect(httpError.code).toBe(AUTH_ERROR_CODES.PHONE_NOT_FOUND);
            expect(httpError.message).toContain('not registered');
        }
    });
    it('createOtpDeliveryFailedError should throw 500 with OTP_DELIVERY_FAILED code', () => {
        try {
            createOtpDeliveryFailedError();
        }
        catch (e) {
            const httpError = e;
            expect(httpError.statusCode).toBe(500);
            expect(httpError.code).toBe(AUTH_ERROR_CODES.OTP_DELIVERY_FAILED);
            expect(httpError.message).not.toContain('DynamoDB');
            expect(httpError.message).not.toContain('internal');
        }
    });
});
//# sourceMappingURL=otp.test.js.map