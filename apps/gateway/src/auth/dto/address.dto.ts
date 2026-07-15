import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AddressDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  street!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  extNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  intNumber?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  neighborhood!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  city!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  state!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(12)
  postalCode!: string;

  // ISO-3166 alpha-2; por defecto 'MX' si se omite (se resuelve en el caso de uso).
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  country?: string;
}
