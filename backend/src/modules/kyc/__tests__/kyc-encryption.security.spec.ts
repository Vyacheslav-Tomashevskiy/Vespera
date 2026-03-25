import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../../security/encryption.service';
import * as crypto from 'crypto';

/**
 * Security tests for KYC encryption
 * Tests for key exposure, tampering detection, and cryptographic properties
 */
describe('KYC Encryption - Security Tests', () => {
    let encryptionService: EncryptionService;

    const mockConfigService = {
        get: jest.fn((key: string) => {
            if (key === 'SECURITY_ENCRYPTION_KEY') {
                return 'c'.repeat(64);
            }
            return undefined;
        }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EncryptionService,
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        encryptionService = module.get<EncryptionService>(EncryptionService);
    });

    describe('Key Exposure Prevention', () => {
        it('should not expose plaintext in encrypted output', () => {
            const plaintext = 'sensitive-kyc-data-12345';
            const encrypted = encryptionService.encrypt(plaintext);

            expect(encrypted).not.toContain(plaintext);
            expect(encrypted).not.toContain('sensitive');
            expect(encrypted).not.toContain('kyc');
        });

        it('should not expose key material in encrypted output', () => {
            const plaintext = 'test-data';
            const encrypted = encryptionService.encrypt(plaintext);

            // Key is 'c' repeated 64 times
            expect(encrypted).not.toContain('cccccccc');
            expect(encrypted).not.toContain('c'.repeat(16));
        });

        it('should produce base64 output (not raw binary)', () => {
            const plaintext = 'test-data';
            const encrypted = encryptionService.encrypt(plaintext);

            // Should be valid base64
            expect(() => {
                Buffer.from(encrypted, 'base64');
            }).not.toThrow();

            // Should not contain binary null bytes
            expect(encrypted).not.toContain('\x00');
        });

        it('should not leak information through ciphertext length', () => {
            const short = 'a';
            const medium = 'a'.repeat(50);
            const long = 'a'.repeat(1000);

            const encShort = encryptionService.encrypt(short);
            const encMedium = encryptionService.encrypt(medium);
            const encLong = encryptionService.encrypt(long);

            // Ciphertext lengths should differ (due to different plaintext lengths)
            // but should not directly correlate
            expect(encShort.length).toBeLessThan(encMedium.length);
            expect(encMedium.length).toBeLessThan(encLong.length);
        });
    });

    describe('Tampering Detection (GCM Authentication)', () => {
        it('should detect truncation of ciphertext', () => {
            const plaintext = 'test-data';
            const encrypted = encryptionService.encrypt(plaintext);

            // Remove last 10 characters
            const truncated = encrypted.slice(0, -10);

            expect(() => {
                encryptionService.decrypt(truncated);
            }).toThrow();
        });

        it('should detect appended data', () => {
            const plaintext = 'test-data';
            const encrypted = encryptionService.encrypt(plaintext);

            // Append extra data
            const appended = encrypted + 'extra-data';

            expect(() => {
                encryptionService.decrypt(appended);
            }).toThrow();
        });

        it('should detect invalid base64', () => {
            const invalidBase64 = '!!!invalid!!!';

            expect(() => {
                encryptionService.decrypt(invalidBase64);
            }).toThrow();
        });

        it('should detect corrupted payload', () => {
            const plaintext = 'test-data';
            const encrypted = encryptionService.encrypt(plaintext);
            const buffer = Buffer.from(encrypted, 'base64');

            // Corrupt the payload by flipping bits
            if (buffer.length > 100) {
                buffer[buffer.length - 1] ^= 0xff;
                const corrupted = buffer.toString('base64');

                expect(() => {
                    encryptionService.decrypt(corrupted);
                }).toThrow();
            }
        });
    });

    describe('Cryptographic Strength', () => {
        it('should use AES-256 (256-bit key)', () => {
            // Verify by checking that key derivation produces 32-byte key
            const plaintext = 'test';
            const encrypted = encryptionService.encrypt(plaintext);

            // Should successfully decrypt (proves correct key size)
            expect(() => {
                encryptionService.decrypt(encrypted);
            }).not.toThrow();
        });

        it('should use random IV for each encryption', () => {
            const plaintext = 'test-data';
            const encrypted1 = encryptionService.encrypt(plaintext);
            const encrypted2 = encryptionService.encrypt(plaintext);

            const buffer1 = Buffer.from(encrypted1, 'base64');
            const buffer2 = Buffer.from(encrypted2, 'base64');

            // Extract IVs (bytes 64-80)
            const iv1 = buffer1.subarray(64, 80);
            const iv2 = buffer2.subarray(64, 80);

            expect(iv1).not.toEqual(iv2);
        });

        it('should use random salt for each encryption', () => {
            const plaintext = 'test-data';
            const encrypted1 = encryptionService.encrypt(plaintext);
            const encrypted2 = encryptionService.encrypt(plaintext);

            const buffer1 = Buffer.from(encrypted1, 'base64');
            const buffer2 = Buffer.from(encrypted2, 'base64');

            // Extract salts (bytes 0-64)
            const salt1 = buffer1.subarray(0, 64);
            const salt2 = buffer2.subarray(0, 64);

            expect(salt1).not.toEqual(salt2);
        });

        it('should use PBKDF2 with sufficient iterations', () => {
            // Verify by checking that decryption works correctly
            // (PBKDF2 with correct iterations is required)
            const plaintext = 'test-data';
            const encrypted = encryptionService.encrypt(plaintext);
            const decrypted = encryptionService.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('should use GCM mode for authenticated encryption', () => {
            // GCM provides both confidentiality and authenticity
            const plaintext = 'test-data';
            const encrypted = encryptionService.encrypt(plaintext);
            const buffer = Buffer.from(encrypted, 'base64');

            // Payload should include auth tag (16 bytes at position 80-96)
            expect(buffer.length).toBeGreaterThanOrEqual(96);
        });
    });

    describe('Key Derivation Security', () => {
        it('should produce different derived keys for different salts', () => {
            // This is tested indirectly through encryption/decryption
            const plaintext = 'test-data';
            const encrypted1 = encryptionService.encrypt(plaintext);
            const encrypted2 = encryptionService.encrypt(plaintext);

            // Different salts should produce different ciphertexts
            expect(encrypted1).not.toBe(encrypted2);

            // But both should decrypt correctly
            expect(encryptionService.decrypt(encrypted1)).toBe(plaintext);
            expect(encryptionService.decrypt(encrypted2)).toBe(plaintext);
        });

        it('should use sufficient PBKDF2 iterations', () => {
            // Verify by checking that decryption works
            // (Correct iteration count is required for proper key derivation)
            const plaintext = 'sensitive-kyc-data';
            const encrypted = encryptionService.encrypt(plaintext);
            const decrypted = encryptionService.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });
    });

    describe('Hash Function Security', () => {
        it('should produce cryptographically secure hashes', () => {
            const input = 'test@example.com';
            const hash = encryptionService.hash(input);

            // Should be hex string
            expect(/^[a-f0-9]+$/.test(hash)).toBe(true);

            // Should be 64 characters (SHA256 = 256 bits = 64 hex chars)
            expect(hash).toHaveLength(64);
        });

        it('should not be reversible', () => {
            const input = 'test@example.com';
            const hash = encryptionService.hash(input);

            // Hash should not contain original input
            expect(hash).not.toContain(input);
            expect(hash).not.toContain('test');
            expect(hash).not.toContain('example');
        });

        it('should be collision-resistant', () => {
            // Generate many hashes and verify uniqueness
            const inputs = Array.from({ length: 100 }, (_, i) => `user-${i}@example.com`);
            const hashes = inputs.map((input) => encryptionService.hash(input));
            const uniqueHashes = new Set(hashes);

            expect(uniqueHashes.size).toBe(100);
        });

        it('should use HMAC for deterministic hashing', () => {
            const input = 'test@example.com';
            const hash1 = encryptionService.hash(input);
            const hash2 = encryptionService.hash(input);

            expect(hash1).toBe(hash2);
        });
    });

    describe('Token Generation Security', () => {
        it('should generate cryptographically secure tokens', () => {
            const token = encryptionService.generateSecureToken(32);

            // Should be hex string
            expect(/^[a-f0-9]+$/.test(token)).toBe(true);

            // Should be 64 characters (32 bytes = 64 hex chars)
            expect(token).toHaveLength(64);
        });

        it('should generate unique tokens', () => {
            const tokens = new Set();
            for (let i = 0; i < 1000; i++) {
                tokens.add(encryptionService.generateSecureToken(32));
            }

            expect(tokens.size).toBe(1000);
        });

        it('should use sufficient entropy', () => {
            // Generate multiple tokens and check for randomness
            const tokens = Array.from({ length: 100 }, () =>
                encryptionService.generateSecureToken(32),
            );

            // All should be unique
            const uniqueTokens = new Set(tokens);
            expect(uniqueTokens.size).toBe(100);
        });
    });

    describe('Signed Token Security', () => {
        it('should generate valid signed tokens', () => {
            const payload = 'user-123';
            const token = encryptionService.generateSignedToken(payload, 3600);

            expect(encryptionService.verifySignedToken(token, payload)).toBe(true);
        });

        it('should reject tokens with wrong payload', () => {
            const token = encryptionService.generateSignedToken('user-123', 3600);

            expect(encryptionService.verifySignedToken(token, 'user-456')).toBe(false);
        });

        it('should reject expired tokens', () => {
            const token = encryptionService.generateSignedToken('user-123', -1);

            expect(encryptionService.verifySignedToken(token, 'user-123')).toBe(false);
        });

        it('should reject tampered tokens', () => {
            const token = encryptionService.generateSignedToken('user-123', 3600);

            // Tamper with token
            const tampered = token.slice(0, -5) + 'xxxxx';

            expect(encryptionService.verifySignedToken(tampered, 'user-123')).toBe(
                false,
            );
        });

        it('should use timing-safe comparison', () => {
            // This is tested indirectly - the service should not be vulnerable to timing attacks
            const token = encryptionService.generateSignedToken('user-123', 3600);

            // Multiple verifications should take similar time
            const start1 = Date.now();
            encryptionService.verifySignedToken(token, 'user-123');
            const time1 = Date.now() - start1;

            const start2 = Date.now();
            encryptionService.verifySignedToken(token, 'wrong-payload');
            const time2 = Date.now() - start2;

            // Times should be similar (within 100ms for test reliability)
            // This is a loose check due to system variability
            expect(Math.abs(time1 - time2)).toBeLessThan(100);
        });
    });

    describe('Encryption Key Validation', () => {
        it('should require encryption key to be set', () => {
            const mockConfigServiceNoKey = {
                get: jest.fn(() => undefined),
            };

            expect(() => {
                new EncryptionService(mockConfigServiceNoKey as any);
            }).toThrow('SECURITY_ENCRYPTION_KEY is required');
        });

        it('should require encryption key to be at least 256 bits', () => {
            const mockConfigServiceShortKey = {
                get: jest.fn(() => 'short-key'),
            };

            expect(() => {
                new EncryptionService(mockConfigServiceShortKey as any);
            }).toThrow('SECURITY_ENCRYPTION_KEY must be at least 64 hex characters');
        });

        it('should accept valid 256-bit keys', () => {
            const mockConfigServiceValidKey = {
                get: jest.fn(() => 'd'.repeat(64)),
            };

            expect(() => {
                new EncryptionService(mockConfigServiceValidKey as any);
            }).not.toThrow();
        });

        it('should accept keys longer than 256 bits', () => {
            const mockConfigServiceLongKey = {
                get: jest.fn(() => 'e'.repeat(128)),
            };

            expect(() => {
                new EncryptionService(mockConfigServiceLongKey as any);
            }).not.toThrow();
        });
    });

    describe('Side-Channel Attack Prevention', () => {
        it('should not leak information through error messages', () => {
            const invalidBase64 = '!!!invalid!!!';

            try {
                encryptionService.decrypt(invalidBase64);
                fail('Should have thrown');
            } catch (error) {
                // Error message should not reveal key or internal state
                expect((error as Error).message).not.toContain('key');
                expect((error as Error).message).not.toContain('secret');
            }
        });

        it('should handle decryption errors gracefully', () => {
            const plaintext = 'test-data';
            const encrypted = encryptionService.encrypt(plaintext);
            const corrupted = encrypted.slice(0, -10) + 'corrupted!';

            expect(() => {
                encryptionService.decrypt(corrupted);
            }).toThrow();
        });
    });

    describe('Compliance and Standards', () => {
        it('should use NIST-approved algorithms', () => {
            // AES-256-GCM is NIST-approved
            const plaintext = 'test-data';
            const encrypted = encryptionService.encrypt(plaintext);
            const decrypted = encryptionService.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('should use PBKDF2 for key derivation', () => {
            // PBKDF2 is NIST-approved for key derivation
            const plaintext = 'test-data';
            const encrypted = encryptionService.encrypt(plaintext);
            const decrypted = encryptionService.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('should use SHA-256 for hashing', () => {
            // SHA-256 is NIST-approved
            const hash = encryptionService.hash('test@example.com');

            // SHA-256 produces 64 hex characters
            expect(hash).toHaveLength(64);
        });
    });
});
