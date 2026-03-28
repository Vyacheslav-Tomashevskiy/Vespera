import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CacheService } from '../../common/cache/cache.service';

export interface WebSocketSession {
  id: string;
  userId: string;
  connectionId: string;
  connectedAt: string;
  lastActivity: string;
  metadata: Record<string, any>;
}

const SESSION_PREFIX = 'ws-session';
const USER_CONNECTIONS_PREFIX = 'ws-user-connections';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours absolute
const IDLE_TTL_MS = 30 * 60 * 1000; // 30 min idle
const MAX_CONNECTIONS_PER_USER = 5;

@Injectable()
export class WebSocketSessionService {
  private readonly logger = new Logger(WebSocketSessionService.name);

  constructor(private readonly cacheService: CacheService) {}

  // ─── Session CRUD ────────────────────────────────────────────────────────────

  async createSession(
    userId: string,
    connectionId: string,
  ): Promise<WebSocketSession> {
    const connectionCount = await this.getUserConnectionCount(userId);
    if (connectionCount >= MAX_CONNECTIONS_PER_USER) {
      this.logger.warn(
        `User ${userId} exceeded max connections (${MAX_CONNECTIONS_PER_USER})`,
      );
      // Evict oldest connection
      await this.evictOldestConnection(userId);
    }

    const session: WebSocketSession = {
      id: randomUUID(),
      userId,
      connectionId,
      connectedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      metadata: {},
    };

    await this.cacheService.set(
      `${SESSION_PREFIX}:${session.id}`,
      session,
      SESSION_TTL_MS,
    );

    await this.trackUserConnection(userId, session.id);

    this.logger.log(`Session created: ${session.id} for user ${userId}`);
    return session;
  }

  async getSession(sessionId: string): Promise<WebSocketSession | null> {
    return this.cacheService.get<WebSocketSession>(
      `${SESSION_PREFIX}:${sessionId}`,
    );
  }

  async getSessionByConnectionId(
    _connectionId: string,
  ): Promise<WebSocketSession | null> {
    // Scan user connections to find by connectionId — used on disconnect
    // In practice the gateway stores sessionId on socket.data so this is a fallback
    return null;
  }

  async updateActivity(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    session.lastActivity = new Date().toISOString();

    // Reset idle TTL on activity, but cap at absolute TTL from connectedAt
    const connectedAt = new Date(session.connectedAt).getTime();
    const absoluteRemaining = SESSION_TTL_MS - (Date.now() - connectedAt);
    const ttl = Math.min(IDLE_TTL_MS, absoluteRemaining);

    if (ttl <= 0) {
      await this.deleteSession(sessionId);
      return;
    }

    await this.cacheService.set(`${SESSION_PREFIX}:${sessionId}`, session, ttl);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      await this.removeUserConnection(session.userId, sessionId);
    }
    await this.cacheService.invalidate(`${SESSION_PREFIX}:${sessionId}`);
    this.logger.log(`Session deleted: ${sessionId}`);
  }

  async validateSession(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session) return false;

    // Check idle timeout
    const idleMs = Date.now() - new Date(session.lastActivity).getTime();
    if (idleMs > IDLE_TTL_MS) {
      await this.deleteSession(sessionId);
      return false;
    }

    return true;
  }

  // ─── Multi-connection tracking ───────────────────────────────────────────────

  async getUserSessions(userId: string): Promise<WebSocketSession[]> {
    const sessionIds = await this.getUserConnectionIds(userId);
    const sessions = await Promise.all(
      sessionIds.map((id) => this.getSession(id)),
    );
    return sessions.filter(Boolean) as WebSocketSession[];
  }

  async getUserConnectionCount(userId: string): Promise<number> {
    const ids = await this.getUserConnectionIds(userId);
    return ids.length;
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    const sessionIds = await this.getUserConnectionIds(userId);
    await Promise.all(sessionIds.map((id) => this.deleteSession(id)));
    await this.cacheService.invalidate(`${USER_CONNECTIONS_PREFIX}:${userId}`);
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async getUserConnectionIds(userId: string): Promise<string[]> {
    return (
      (await this.cacheService.get<string[]>(
        `${USER_CONNECTIONS_PREFIX}:${userId}`,
      )) ?? []
    );
  }

  private async trackUserConnection(
    userId: string,
    sessionId: string,
  ): Promise<void> {
    const ids = await this.getUserConnectionIds(userId);
    ids.push(sessionId);
    await this.cacheService.set(
      `${USER_CONNECTIONS_PREFIX}:${userId}`,
      ids,
      SESSION_TTL_MS,
    );
  }

  private async removeUserConnection(
    userId: string,
    sessionId: string,
  ): Promise<void> {
    const ids = await this.getUserConnectionIds(userId);
    const updated = ids.filter((id) => id !== sessionId);
    await this.cacheService.set(
      `${USER_CONNECTIONS_PREFIX}:${userId}`,
      updated,
      SESSION_TTL_MS,
    );
  }

  private async evictOldestConnection(userId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);
    if (!sessions.length) return;

    const oldest = sessions.sort(
      (a, b) =>
        new Date(a.connectedAt).getTime() - new Date(b.connectedAt).getTime(),
    )[0];

    this.logger.warn(`Evicting oldest session ${oldest.id} for user ${userId}`);
    await this.deleteSession(oldest.id);
  }
}
