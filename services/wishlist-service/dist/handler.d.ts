import middy from '@middy/core';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export declare const getWishlistHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
export declare const addToWishlistHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent & (import("@middy/http-json-body-parser").RequestEvent & APIGatewayProxyEvent), APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
export declare const removeFromWishlistHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
//# sourceMappingURL=handler.d.ts.map