import { Test, TestingModule } from '@nestjs/testing';
import { WebSocketSessionService } from './websocket-session.service';
import { CacheService } from '../../common/cache/cache.service';

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  invalidate: jest.fn(),
};

describe('WebSocketSessionService', () => {
  let service: WebSocketSessionService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebSocketSessionService,
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<WebSocketSessionService>(WebSocketSessionService);
  });

  describe('createSession', () => {
    it('creates and stores a session', async () => {
      mockCacheService.get.mockResolvedValue(null); // no existing connections
      mockCacheService.set.mockResolvedValue(undefined);

      const session = await service.createSession('user-1', 'conn-1');

      expect(session.userId).toBe('user-1');
      expect(session.connectionId).toBe('conn-1');
      expect(session.id).toBeDefined();
      expect(mockCacheService.set).toHaveBeenCalledTimes(2); // session + user connections
    });

    it('evicts oldest session when max connections exceeded', async () => {
      const existingIds = ['s1', 's2', 's3', 's4', 's5'];
      const existingSessions = existingIds.map((id) => ({
        id,
        userId: 'user-1',
        connectionId: `conn-${id}`,
        connectedAt: new Date(Date.now() - 10000).toISOString(),
        lastActivity: new Date().toISOString(),
        metadata: {},
      }));

      mockCacheService.get
        .mockResolvedValueOnce(existingIds) // getUserConnectionIds for count
        .mockResolvedValueOnce(existingIds) // getUserConnectionIds for evict
        .mockResolvedValueOnce(existingSessions[0]) // getSession for oldest
        .mockResolvedValueOnce(existingSessions[1])
        .mockResolvedValueOnce(existingSessions[2])
        .mockResolvedValueOnce(existingSessions[3])
        .mockResolvedValueOnce(existingSessions[4])
        .mockResolvedValueOnce(existingSessions[0]) // deleteSession getSession
        .mockResolvedValue(null);

      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.invalidate.mockResolvedValue(undefined);

      const session = await service.createSession('user-1', 'conn-new');
      expect(session.userId).toBe('user-1');
      expect(mockCacheService.invalidate).toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('returns session from cache', async () => {
      const mockSession = {
        id: 'sess-1',
        userId: 'user-1',
        connectionId: 'conn-1',
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        metadata: {},
      };
      mockCacheService.get.mockResolvedValue(mockSession);

      const result = await service.getSession('sess-1');
      expect(result).toEqual(mockSession);
    });

    it('returns null when session not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      const result = await service.getSession('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('validateSession', () => {
    it('returns true for active session', async () => {
      const session = {
        id: 'sess-1',
        userId: 'user-1',
        connectionId: 'conn-1',
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        metadata: {},
      };
      mockCacheService.get.mockResolvedValue(session);

      const result = await service.validateSession('sess-1');
      expect(result).toBe(true);
    });

    it('returns false and deletes session when idle timeout exceeded', async () => {
      const session = {
        id: 'sess-1',
        userId: 'user-1',
        connectionId: 'conn-1',
        connectedAt: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
        lastActivity: new Date(Date.now() - 31 * 60 * 1000).toISOString(), // 31 min ago
        metadata: {},
      };
      mockCacheService.get
        .mockResolvedValueOnce(session) // validateSession
        .mockResolvedValueOnce(session) // deleteSession -> getSession
        .mockResolvedValue([]); // removeUserConnection

      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.invalidate.mockResolvedValue(undefined);

      const result = await service.validateSession('sess-1');
      expect(result).toBe(false);
      expect(mockCacheService.invalidate).toHaveBeenCalledWith(
        'ws-session:sess-1',
      );
    });

    it('returns false when session does not exist', async () => {
      mockCacheService.get.mockResolvedValue(null);
      const result = await service.validateSession('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('updateActivity', () => {
    it('updates lastActivity and resets TTL', async () => {
      const session = {
        id: 'sess-1',
        userId: 'user-1',
        connectionId: 'conn-1',
        connectedAt: new Date().toISOString(),
        lastActivity: new Date(Date.now() - 5000).toISOString(),
        metadata: {},
      };
      mockCacheService.get.mockResolvedValue(session);
      mockCacheService.set.mockResolvedValue(undefined);

      await service.updateActivity('sess-1');

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'ws-session:sess-1',
        expect.objectContaining({ id: 'sess-1' }),
        expect.any(Number),
      );
    });

    it('does nothing when session not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      await service.updateActivity('nonexistent');
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('deleteSession', () => {
    it('removes session and user connection tracking', async () => {
      const session = {
        id: 'sess-1',
        userId: 'user-1',
        connectionId: 'conn-1',
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        metadata: {},
      };
      mockCacheService.get
        .mockResolvedValueOnce(session)
        .mockResolvedValue(['sess-1']);
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.invalidate.mockResolvedValue(undefined);

      await service.deleteSession('sess-1');

      expect(mockCacheService.invalidate).toHaveBeenCalledWith(
        'ws-session:sess-1',
      );
    });
  });

  describe('getUserSessions', () => {
    it('returns all active sessions for a user', async () => {
      const session = {
        id: 'sess-1',
        userId: 'user-1',
        connectionId: 'conn-1',
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        metadata: {},
      };
      mockCacheService.get
        .mockResolvedValueOnce(['sess-1'])
        .mockResolvedValueOnce(session);

      const result = await service.getUserSessions('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('sess-1');
    });
  });
});
