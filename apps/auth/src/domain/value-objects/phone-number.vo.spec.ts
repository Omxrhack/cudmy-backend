import { InvalidPhoneNumberError } from '../errors/auth-domain.errors';
import { PhoneNumber } from './phone-number.vo';

describe('PhoneNumber', () => {
  it('acepta un E.164 válido y recorta espacios', () => {
    expect(new PhoneNumber('  +5215555555555 ').raw).toBe('+5215555555555');
  });

  it.each(['12345', '5555555555', '++52155', 'abc', '', '+0123'])(
    'rechaza "%s"',
    (value) => {
      expect(() => new PhoneNumber(value)).toThrow(InvalidPhoneNumberError);
    },
  );
});
