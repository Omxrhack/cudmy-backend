import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { CodeHasher } from '../../application/ports/code-hasher.port';

@Injectable()
export class Argon2CodeHasher extends CodeHasher {
  hash(code: string): Promise<string> {
    return argon2.hash(code, { type: argon2.argon2id });
  }

  async verify(hash: string, code: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, code);
    } catch {
      return false;
    }
  }
}
