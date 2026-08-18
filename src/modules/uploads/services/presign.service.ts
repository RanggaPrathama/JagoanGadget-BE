import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AppConfig } from '@config/configuration';
import type { UploadPurpose } from '../uploads.constants';

export interface PresignPayload {
  purpose: UploadPurpose;
  expiresAt: number;
  ownerId: string;
}

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class PresignService {
  private readonly secret: string;

  constructor(private readonly configService: ConfigService<AppConfig>) {
    this.secret =
      this.configService.get<AppConfig['auth']>('auth')?.secret ?? '';
  }

  /**
   * Create a signed upload token (HMAC-SHA256) that binds a purpose, owner, and
   * expiry into a tamper-proof string. The token is safe to embed in a URL —
   * no auth cookie is needed when it's verified.
   *
   * Token format: `{purpose}.{expiresAt}.{ownerId}.{hexSignature}`
   *
   * @param purpose - Upload purpose key (e.g. `'avatar'`, `'document'`).
   * @param ownerId - Authenticated user id who owns the upload.
   * @returns `{ token, expiresAt }` — `token` goes into the presigned URL;
   *   `expiresAt` is a Unix ms timestamp (15 min from now).
   */
  create(
    purpose: UploadPurpose,
    ownerId: string,
  ): { token: string; expiresAt: number } {
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    const payload = this.signPayload(purpose, expiresAt, ownerId);
    const sig = this.signature(payload);
    return { token: `${payload}.${sig}`, expiresAt };
  }

  /**
   * Verify an upload token: recomputes the HMAC, does a constant-time
   * comparison, and checks the expiry. A tampered or expired token is rejected.
   * @param token - The raw token string from the URL path.
   * @returns The decoded `PresignPayload` (`purpose`, `expiresAt`, `ownerId`)
   *   when the signature and expiry are valid.
   * @throws UnauthorizedException when the token is malformed, tampered, or expired.
   */
  verify(token: string): PresignPayload {
    const [purpose, expiresAtRaw, ownerId, sig] = token.split('.');
    if (!purpose || !expiresAtRaw || !ownerId || !sig) {
      throw new UnauthorizedException('Invalid upload token');
    }

    const payload = `${purpose}.${expiresAtRaw}.${ownerId}`;
    const expected = Buffer.from(this.signature(payload), 'utf8');
    const actual = Buffer.from(sig, 'utf8');

    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      throw new UnauthorizedException('Invalid upload token');
    }

    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
      throw new UnauthorizedException('Upload token expired');
    }

    return { purpose: purpose as UploadPurpose, expiresAt, ownerId };
  }

  /**
   * Assemble the plaintext payload to sign.
   * @returns Dot-separated string `purpose.expiresAt.ownerId`.
   */
  private signPayload(
    purpose: string,
    expiresAt: number,
    ownerId: string,
  ): string {
    return `${purpose}.${expiresAt}.${ownerId}`;
  }

  /**
   * Compute the HMAC-SHA256 signature of a payload string.
   * @param payload - Plaintext payload (dot-separated fields).
   * @returns Hex-encoded signature.
   */
  private signature(payload: string): string {
    return createHmac('sha256', this.secret).update(payload).digest('hex');
  }
}
