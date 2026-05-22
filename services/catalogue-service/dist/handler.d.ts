import middy from '@middy/core';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export declare const listCategoriesHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
export declare const listProductsByCategoryHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
export declare const getProductDetailHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
export declare const searchProductsHandler: middy.MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult, Error, import("aws-lambda").Context, {}>;
//# sourceMappingURL=handler.d.ts.map