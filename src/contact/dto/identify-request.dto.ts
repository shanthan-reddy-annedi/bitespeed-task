import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class IdentifyRequestDto {
  @ApiProperty({
    description: 'Email address of the contact',
    example: 'george@hillvalley.edu',
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: 'Phone number of the contact',
    example: '717171',
    required: false,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
