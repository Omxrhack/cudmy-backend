import { InvalidAddressError } from '../errors/auth-domain.errors';
import { Address } from './address.vo';

const base = {
  street: 'Calle 1',
  extNumber: '10',
  neighborhood: 'Centro',
  city: 'CDMX',
  state: 'CDMX',
  postalCode: '01000',
  country: 'MX',
};

describe('Address', () => {
  it('construye una dirección válida, normaliza país y vacía intNumber a null', () => {
    const address = new Address({ ...base, country: 'mx', intNumber: '' });
    expect(address.country).toBe('MX');
    expect(address.intNumber).toBeNull();
    expect(address.postalCode).toBe('01000');
  });

  it('rechaza campos obligatorios vacíos', () => {
    expect(() => new Address({ ...base, city: '' })).toThrow(
      InvalidAddressError,
    );
  });

  it('rechaza un CP mexicano que no sea de 5 dígitos', () => {
    expect(() => new Address({ ...base, postalCode: 'ABC' })).toThrow(
      InvalidAddressError,
    );
  });
});
