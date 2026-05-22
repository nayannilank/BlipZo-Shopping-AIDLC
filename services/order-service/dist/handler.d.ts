import middy from '@middy/core';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export declare const checkoutHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent & (import("@middy/http-json-body-parser").RequestEvent & APIGatewayProxyEvent), APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
export declare const orderHistoryHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
export declare const orderDetailHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
export declare const cancelOrderHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
export declare const returnExchangeHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent & (import("@middy/http-json-body-parser").RequestEvent & APIGatewayProxyEvent), APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
export declare const getReturnExchangeHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
//# sourceMappingURL=handler.d.ts.map