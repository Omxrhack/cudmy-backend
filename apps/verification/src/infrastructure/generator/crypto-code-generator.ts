import { randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CodeGenerator } from '../../application/ports/code-generator.port';

@Injectable()
export class CryptoCodeGenerator extends CodeGenerator {
  generate(length: number): string {
    let out = '';
    for (let i = 0; i < length; i++) {
      out += randomInt(0, 10).toString();
    }
    return out;
  }
}
