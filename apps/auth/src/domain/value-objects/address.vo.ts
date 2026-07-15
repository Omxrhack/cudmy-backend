import { InvalidAddressError } from '../errors/auth-domain.errors';

export interface AddressProps {
  street: string;
  extNumber: string;
  intNumber?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/** Value object de dirección. Normaliza y valida los campos obligatorios. */
export class Address {
  readonly street: string;
  readonly extNumber: string;
  readonly intNumber: string | null;
  readonly neighborhood: string;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
  readonly country: string;

  constructor(props: AddressProps) {
    const street = (props.street ?? '').trim();
    const extNumber = (props.extNumber ?? '').trim();
    const neighborhood = (props.neighborhood ?? '').trim();
    const city = (props.city ?? '').trim();
    const state = (props.state ?? '').trim();
    const postalCode = (props.postalCode ?? '').trim();
    const country = (props.country ?? '').trim().toUpperCase();
    const intNumber = props.intNumber?.trim() || null;

    if (
      !street ||
      !extNumber ||
      !neighborhood ||
      !city ||
      !state ||
      !postalCode ||
      !country
    ) {
      throw new InvalidAddressError('Faltan campos obligatorios de la dirección');
    }
    // El CP mexicano son 5 dígitos; para otros países solo se exige no vacío.
    if (country === 'MX' && !/^\d{5}$/.test(postalCode)) {
      throw new InvalidAddressError(`Código postal inválido: "${postalCode}"`);
    }

    this.street = street;
    this.extNumber = extNumber;
    this.intNumber = intNumber;
    this.neighborhood = neighborhood;
    this.city = city;
    this.state = state;
    this.postalCode = postalCode;
    this.country = country;
  }
}
