import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Match } from '../../common/validators/match.decorator';
import { AddressDto } from './address.dto';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @Match('password')
  confirmPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName!: string;

  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'phoneNumber debe estar en formato E.164 (p. ej. +5216181234567)',
  })
  phoneNumber!: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;
}
