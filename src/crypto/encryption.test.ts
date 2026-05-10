import {
  decrypt,
  deserializePayload,
  encrypt,
  EncryptedPayload,
  serializePayload,
} from './encryption';

const PASSWORD = 'super-secret-password-123';
const PLAINTEXT = 'DB_PASSWORD=hunter2\nAPI_KEY=abc123\nNODE_ENV=production';

describe('encryption', () => {
  describe('encrypt', () => {
    it('should return an encrypted payload with required fields', () => {
      const payload = encrypt(PLAINTEXT, PASSWORD);
      expect(payload).toHaveProperty('iv');
      expect(payload).toHaveProperty('salt');
      expect(payload).toHaveProperty('tag');
      expect(payload).toHaveProperty('ciphertext');
    });

    it('should produce different ciphertexts for the same input', () => {
      const payload1 = encrypt(PLAINTEXT, PASSWORD);
      const payload2 = encrypt(PLAINTEXT, PASSWORD);
      expect(payload1.ciphertext).not.toBe(payload2.ciphertext);
    });

    it('should not include plaintext in ciphertext', () => {
      const payload = encrypt(PLAINTEXT, PASSWORD);
      expect(payload.ciphertext).not.toContain('hunter2');
    });
  });

  describe('decrypt', () => {
    it('should correctly decrypt an encrypted payload', () => {
      const payload = encrypt(PLAINTEXT, PASSWORD);
      const result = decrypt(payload, PASSWORD);
      expect(result).toBe(PLAINTEXT);
    });

    it('should throw on wrong password', () => {
      const payload = encrypt(PLAINTEXT, PASSWORD);
      expect(() => decrypt(payload, 'wrong-password')).toThrow();
    });

    it('should throw on tampered ciphertext', () => {
      const payload = encrypt(PLAINTEXT, PASSWORD);
      const tampered: EncryptedPayload = { ...payload, ciphertext: payload.ciphertext.slice(0, -4) + 'dead' };
      expect(() => decrypt(tampered, PASSWORD)).toThrow();
    });
  });

  describe('serializePayload / deserializePayload', () => {
    it('should round-trip serialize and deserialize a payload', () => {
      const payload = encrypt(PLAINTEXT, PASSWORD);
      const serialized = serializePayload(payload);
      const deserialized = deserializePayload(serialized);
      expect(deserialized).toEqual(payload);
    });

    it('should throw on invalid base64 payload', () => {
      expect(() => deserializePayload('not-valid-base64!!!')).toThrow('Invalid encrypted payload format');
    });
  });
});
