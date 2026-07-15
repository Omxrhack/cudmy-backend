import { IsBoolean, IsJWT, IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @IsString()
  @IsJWT()
  refreshToken!: string;

  @IsOptional()
  @IsBoolean()
  allSessions?: boolean;
}
