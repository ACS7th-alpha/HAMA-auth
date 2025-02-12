import { IsString, IsOptional, IsIn, IsDateString } from 'class-validator';

export class UpdateChildDto {
  @IsString()
  name: string;

  @IsIn(['male', 'female']) // 성별 제한
  gender: 'male' | 'female';

  @IsDateString() // 날짜 형식 검증
  birthdate: string;
}
