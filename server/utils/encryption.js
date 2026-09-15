const crypto = require('crypto');

class EncryptionUtil {
  constructor(secretKey) {
    if (secretKey.length !== 32) {
      throw new Error('Encryption key must be 32 bytes long');
    }
    this.secretKey = Buffer.from(secretKey, 'utf8');
    this.algorithm = 'aes-256-ecb';
  }

  encryptPayload(payload) {
    try {
      const jsonString = JSON.stringify(payload);

      const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, null);
      cipher.setAutoPadding(true);

      let encrypted = cipher.update(jsonString, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      return encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  decryptPayload(encryptedData) {
    try {
      const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, null);
      decipher.setAutoPadding(true);

      let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }
}

module.exports = EncryptionUtil;
