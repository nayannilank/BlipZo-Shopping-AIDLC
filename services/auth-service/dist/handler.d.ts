import middy from '@middy/core';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export declare const registerHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent & (import("@middy/http-json-body-parser").RequestEvent & APIGatewayProxyEvent), APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
export declare const loginHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent & (import("@middy/http-json-body-parser").RequestEvent & APIGatewayProxyEvent), APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
export declare const otpRequestHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent & (import("@middy/http-json-body-parser").RequestEvent & APIGatewayProxyEvent), APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
export declare const otpVerifyHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent & (import("@middy/http-json-body-parser").RequestEvent & APIGatewayProxyEvent), APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
export declare const tokenRefreshHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent & (import("@middy/http-json-body-parser").RequestEvent & APIGatewayProxyEvent), APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
//# sourceMappingURL=handler.d.ts.map