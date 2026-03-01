import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuth } from '@/lib/firebase-admin';

// Re-export common types
export type ApiResponse<T = any> = {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
};

type ApiHandlerConfig<TBody = any, TQuery = any> = {
    schema?: z.ZodSchema<TBody>;
    querySchema?: z.ZodSchema<TQuery>;
    requireAuth?: boolean;
    requireAdmin?: boolean;
    handler: (req: NextRequest, context: { body: TBody; query: TQuery; userId?: string }) => Promise<NextResponse>;
};

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
                const authHeader = req.headers.get('Authorization');
                let decodedToken;

                if (authHeader?.startsWith('Bearer ')) {
                    const token = authHeader.substring(7);
                    decodedToken = await adminAuth.verifyIdToken(token);
                } else {
                    const sessionCookie = req.cookies.get('session')?.value;
                    if (sessionCookie) {
                        decodedToken = await adminAuth.verifySessionCookie(sessionCookie);
                    }
                }

                if (!decodedToken) {
                    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
                }

                userId = decodedToken.uid;

                // 2. Admin Check
                if (config.requireAdmin) {
                    if (decodedToken.role !== 'admin' && decodedToken.role !== 'su') {
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

            // 5. Execute Handler
            return await config.handler(req, { body, query: queryData, userId });

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
