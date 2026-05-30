import type {
  OpenAPIHono,
  RouteConfig,
  RouteHandler,
  z as Z,
} from "@hono/zod-openapi";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import type { Context } from "hono";
import type { PinoLogger } from "hono-pino";

import type * as models from "@/db/models";

import type { User } from "@/modules/users/users.schema";
import { z } from "zod";

export type Override<
  Type,
  NewType extends { [key in keyof Type]?: NewType[key] },
> = Omit<Type, keyof NewType> & NewType;

export interface AppBindings {
  Variables: {
    logger: PinoLogger;
    accessTokenPayload: JWTAccessTokenPayload;
    user: User;
    refreshTokenPayload: JWTRefreshTokenPayload;
    ipAddress: string;
    userAgent: string;
    permissions: string[];
    csrfToken: string;
  };
}

export type AppOpenAPI = OpenAPIHono<AppBindings>;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<
  R,
  AppBindings
>;

export type AppContext = Context<AppBindings>;

// JWT Types for enhanced type safety
export interface JWTAccessTokenPayload {
  userId: number;
  username: string;
  iat: number;
  exp: number;
}

export const JWTAccessTokenPayloadSchema = z.object({
  userId: z.number(),
  username: z.string(),
  iat: z.number(),
  exp: z.number(),
});

export interface JWTRefreshTokenPayload {
  userId: number;
  username: string;
  tokenVersion: number;
  iat: number;
  exp: number;
}

export const JWTRefreshTokenPayloadSchema = z.object({
  userId: z.number(),
  username: z.string(),
  tokenVersion: z.number(),
  iat: z.number(),
  exp: z.number(),
});

export interface PasswordResetTokenPayload {
  userId: number;
  username: string;
  tokenId: number;
  iat: number;
  exp: number;
}

export const PasswordResetTokenPayloadSchema = z.object({
  userId: z.number(),
  username: z.string(),
  tokenId: z.number(),
});

// Zod v4: simplify to top-level types used across the app to avoid internal generics like ZodEffects
export type ZodSchema = Z.ZodTypeAny;

export type TX = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof models,
  ExtractTablesWithRelations<typeof models>
>;
