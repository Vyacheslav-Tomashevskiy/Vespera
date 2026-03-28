export enum ThreatLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ThreatType {
  BRUTE_FORCE = 'brute_force',
  CREDENTIAL_STUFFING = 'credential_stuffing',
  SQL_INJECTION = 'sql_injection',
  XSS_ATTEMPT = 'xss_attempt',
  PATH_TRAVERSAL = 'path_traversal',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_IP = 'suspicious_ip',
  ACCOUNT_TAKEOVER = 'account_takeover',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  DATA_EXFILTRATION = 'data_exfiltration',
  ANOMALOUS_BEHAVIOR = 'anomalous_behavior',
  BOT_ACTIVITY = 'bot_activity',
  REPLAY_ATTACK = 'replay_attack',
}

export enum ThreatStatus {
  DETECTED = 'detected',
  INVESTIGATING = 'investigating',
  CONFIRMED = 'confirmed',
  MITIGATED = 'mitigated',
  FALSE_POSITIVE = 'false_positive',
}

export interface ThreatEvent {
  id: string;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestPath: string | null;
  requestMethod: string | null;
  threatType: ThreatType;
  threatLevel: ThreatLevel;
  status: ThreatStatus;
  evidence: Record<string, unknown>;
  description: string | null;
  blocked: boolean;
  autoMitigated: boolean;
  mitigationAction: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ThreatStats {
  totalThreats: number;
  threatsByType: Record<ThreatType, number>;
  threatsByLevel: Record<ThreatLevel, number>;
  threatsByStatus: Record<ThreatStatus, number>;
  threatsOverTime: { date: string; count: number }[];
  topOffendingIps: { ip: string; count: number }[];
  mitigationRate: number;
}
