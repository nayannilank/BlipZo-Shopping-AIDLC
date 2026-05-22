import middy from '@middy/core';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export declare const createAddressHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent & (import("@middy/http-json-body-parser").RequestEvent & APIGatewayProxyEvent), APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
export declare const listAddressesHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
export declare const updateAddressHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent & (import("@middy/http-json-body-parser").RequestEvent & APIGatewayProxyEvent), APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
export declare const deleteAddressHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
export declare const setDefaultAddressHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
//# sourceMappingURL=handler.d.ts.map