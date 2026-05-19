import { describe, it, expect } from 'vitest';
import { validateRegisterInput } from './validators.js';
function createEvent(body) {
    return {
        body: body,
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/auth/register',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {},
        resource: '',
    };
}
describe('validateRegisterInput', () => {
    it('should return valid RegisterRequest for valid email registration', () => {
        const event = createEvent({
            email: 'user@example.com',
            password: 'SecurePass1',
            role: 'Buyer',
        });
        const result = validateRegisterInput(event);
        expect(result).toEqual({
            email: 'user@example.com',
            password: 'SecurePass1',
            role: 'Buyer',
        });
    });
    it('should return valid RegisterRequest for valid phone registration', () => {
        const event = createEvent({
            phone: '+919876543210',
            password: 'SecurePass1',
            role: 'Seller',
        });
        const result = validateRegisterInput(event);
        expect(result).toEqual({
            phone: '+919876543210',
            password: 'SecurePass1',
            role: 'Seller',
        });
    });
    it('should throw 400 when body is null', () => {
        const event = createEvent(null);
        expect(() => validateRegisterInput(event)).toThrow();
    });
    it('should throw 400 when neither email nor phone is provided', () => {
        const event = createEvent({
            password: 'SecurePass1',
            role: 'Buyer',
        });
        expect(() => validateRegisterInput(event)).toThrow('Either email or phone is required');
    });
    it('should throw 400 for invalid password (too short)', () => {
        const event = createEvent({
            email: 'user@example.com',
            password: 'Short1',
            role: 'Buyer',
        });
        expect(() => validateRegisterInput(event)).toThrow();
    });
    it('should throw 400 for invalid role', () => {
        const event = createEvent({
            email: 'user@example.com',
            password: 'SecurePass1',
            role: 'Admin',
        });
        expect(() => validateRegisterInput(event)).toThrow();
    });
    it('should throw 400 for invalid email format', () => {
        const event = createEvent({
            email: 'invalid-email',
            password: 'SecurePass1',
            role: 'Buyer',
        });
        expect(() => validateRegisterInput(event)).toThrow();
    });
    it('should throw 400 for invalid phone format', () => {
        const event = createEvent({
            phone: '12345',
            password: 'SecurePass1',
            role: 'Buyer',
        });
        expect(() => validateRegisterInput(event)).toThrow();
    });
});
//# sourceMappingURL=validators.test.js.map