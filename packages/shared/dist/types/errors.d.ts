export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        fields?: Record<string, string>;
        correlationId: string;
    };
}
//# sourceMappingURL=errors.d.ts.map