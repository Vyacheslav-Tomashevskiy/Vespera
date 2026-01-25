import { Injectable, NestMiddleware, TooManyRequestsException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * Rate limiting middleware for authentication endpoints
 * Limits requests by IP address
 */
@Injectable()
export class AuthRateLimitMiddleware implements NestMiddleware {
  private readonly store: RateLimitStore = {};
  private readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private readonly MAX_REQUESTS = 5; // Max 5 attempts per window

  use(req: Request, res: Response, next: NextFunction) {
    const key = this.getClientIp(req);
    const now = Date.now();

    if (!this.store[key]) {
      this.store[key] = {
        count: 1,
        resetTime: now + this.WINDOW_MS,
      };
      return next();
    }

    const record = this.store[key];

    // Reset if window has passed
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + this.WINDOW_MS;
      return next();
    }

    // Check if limit exceeded
    if (record.count >= this.MAX_REQUESTS) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      throw new TooManyRequestsException(
        `Too many authentication attempts. Please try again in ${retryAfter} seconds.`,
      );
    }

    record.count += 1;
    next();
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || 'unknown';
  }
}
