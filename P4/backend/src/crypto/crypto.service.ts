import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    const keyString = this.configService.get<string>('AES_KEY');
    if (!keyString) {
      throw new Error('AES_KEY environment variable is missing');
    }
    this.key = Buffer.from(keyString, 'base64');
  }

  // AES Encryption
  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  // AES Decryption
  decrypt(encryptedData: string): string {
    const [ivHex, encryptedText] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Hashing for deterministic search (e.g. emailHash for exact match)
  hashForIndex(text: string): string {
    return crypto.createHmac('sha256', this.key).update(text).digest('hex');
  }

  // Password Hashing (Argon2)
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
  }

  // Password Verification (Argon2)
  async verifyPassword(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
