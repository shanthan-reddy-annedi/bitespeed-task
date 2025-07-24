import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'atLeastOneField', async: false })
class AtLeastOneFieldConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments) {
    const obj = args.object as any;
    return Boolean(obj.email || obj.phoneNumber);
  }

  defaultMessage() {
    return 'At least one of email or phoneNumber must be provided';
  }
}

function AtLeastOneField(validationOptions?: ValidationOptions) {
  return (object: Object, propertyName: string): void => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: AtLeastOneFieldConstraint,
    });
  };
}

export class IdentifyRequestDto {
  @ApiProperty({
    description: 'Email address of the contact.',
    example: 'george@hillvalley.edu',
    required: false,
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;

  @ApiProperty({
    description: 'Phone number of the contact.',
    example: '717171',
    required: false,
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @AtLeastOneField({
    message: 'At least one of email or phoneNumber must be provided',
  })
  private readonly _atLeastOneField: boolean = true;
}
