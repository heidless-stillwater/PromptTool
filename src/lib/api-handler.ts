import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuth } from '@/lib/firebase-admin';

import { checkResourceQuota, ResourceCheckResult } from './resource-guard';
import { ResourceQuotas } from './types';

// Re-export common types
export type ApiResponse<T = any> = {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    resourceStatus?: ResourceCheckResult;
};

type ApiHandlerConfig<TBody = any, TQuery = any> = {
    schema?: z.ZodSchema<TBody>;
    querySchema?: z.ZodSchema<TQuery>;
    requireAuth?: boolean;
    requireAdmin?: boolean;
    resourceCheck?: {
        resource: keyof Omit<ResourceQuotas, 'burstAllowanceBytes'>;
        amount?: number;
    };
    handler: (req: NextRequest, context: { body: TBody; query: TQuery; userId?: string }) => Promise<NextResponse>;
};

/**
 * Standalone Auth Helper for API Routes
 */
export async function getAuthContext(req: Request) {
    const authHeader = req.headers.get('Authorization');
    let decodedToken;

    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (e) {
            console.error('[API Auth] Token verification failed:', e);
        }
    } else {
        // Fallback to session cookie (for browser calls)
        const cookieHeader = req.headers.get('cookie') || '';
        const sessionCookie = cookieHeader.split('; ').find(row => row.startsWith('session='))?.split('=')[1];
        if (sessionCookie) {
            try {
                decodedToken = await adminAuth.verifySessionCookie(sessionCookie);
            } catch (e) {
                console.error('[API Auth] Session verification failed:', e);
            }
        }
    }

    if (!decodedToken) return { user: null, profile: null };

    return {
        user: { uid: decodedToken.uid },
        profile: decodedToken as any // Contains role, email, etc.
    };
}

/**
 * Standardized API Handler Wrapper
 * - Enforces Zod validation for body and query
 * - Handles authentication and admin checks
 * - Centralized error reporting (can be wired to Sentry)
 */
export function withApiHandler<TBody = any, TQuery = any>(config: ApiHandlerConfig<TBody, TQuery>) {
    return async (req: NextRequest) => {
        try {
            let userId: string | undefined;

            // 1. Authentication Check
            if (config.requireAuth || config.requireAdmin) {
                const { user, profile } = await getAuthContext(req);

                if (!user) {
                    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
                }

                userId = user.uid;

                // 2. Admin Check
                if (config.requireAdmin) {
                    if (profile?.role !== 'admin' && profile?.role !== 'su') {
                        return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
                    }
                }
            }

            // 3. Body Validation & Parsing
            let body: TBody = {} as TBody;
            const method = req.method.toUpperCase();
            const hasBody = ['POST', 'PUT', 'PATCH'].includes(method);

            if (hasBody) {
                const rawBody = await req.json().catch(() => ({}));
                if (config.schema) {
                    const result = config.schema.safeParse(rawBody);
                    if (!result.success) {
                        return NextResponse.json({
                            success: false,
                            error: result.error.issues[0].message,
                            details: result.error.issues
                        }, { status: 400 });
                    }
                    body = result.data;
                } else {
                    body = rawBody as TBody;
                }
            }

            // 4. Query Validation
            let queryData: TQuery = {} as TQuery;
            if (config.querySchema) {
                const { searchParams } = new URL(req.url);
                const rawQuery = Object.fromEntries(searchParams.entries());
                const result = config.querySchema.safeParse(rawQuery);
                if (!result.success) {
                    return NextResponse.json({
                        success: false,
                        error: `Query: ${result.error.issues[0].message}`
                    }, { status: 400 });
                }
                queryData = result.data;
            }

            // 5. Resource Quota Check
            let resourceStatus: ResourceCheckResult | undefined;
            if (config.resourceCheck && userId) {
                resourceStatus = await checkResourceQuota(
                    userId,
                    config.resourceCheck.resource,
                    config.resourceCheck.amount || 1
                );

                if (!resourceStatus.success) {
                    return NextResponse.json({
                        success: false,
                        error: resourceStatus.error,
                        resourceStatus
                    }, { status: 429 });
                }
            }

            // 6. Execute Handler
            const response = await config.handler(req, { body, query: queryData, userId });

            return response;

        } catch (error: any) {
            // Centralized Error Reporting (Wire Sentry here)
            console.error('[API Error]:', error);

            const status = error.status || 500;
            const message = error.message || 'Internal Server Error';

            return NextResponse.json({
                success: false,
                error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : message
            }, { status });
        }
    };
}
