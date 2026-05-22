import middy from '@middy/core';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export declare const createProductHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent & (import("@middy/http-json-body-parser").RequestEvent & APIGatewayProxyEvent), APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
export declare const updateProductHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent & (import("@middy/http-json-body-parser").RequestEvent & APIGatewayProxyEvent), APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
export declare const deleteProductHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent & (import("@middy/http-json-body-parser").RequestEvent & APIGatewayProxyEvent), APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
export declare const listSellerProductsHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
export declare const setSellerPolicyHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent & (import("@middy/http-json-body-parser").RequestEvent & APIGatewayProxyEvent), APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
//# sourceMappingURL=handler.d.ts.map