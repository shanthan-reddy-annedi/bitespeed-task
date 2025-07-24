import { ApiProperty } from '@nestjs/swagger';

class ContactInfo {
  @ApiProperty({
    description: 'Primary contact ID',
    example: 1,
  })
  primaryContatctId: number;

  @ApiProperty({
    description: 'List of email addresses associated with the contact',
    example: ['george@hillvalley.edu', 'biffdude@hillvalley.edu'],
  })
  emails: string[];

  @ApiProperty({
    description: 'List of phone numbers associated with the contact',
    example: ['717171', '818181'],
  })
  phoneNumbers: string[];

  @ApiProperty({
    description: 'List of secondary contact IDs',
    example: [2, 3],
  })
  secondaryContactIds: number[];
}

export class IdentifyResponseDto {
  @ApiProperty({
    description: 'Contact information',
    type: ContactInfo,
  })
  contact: ContactInfo;
}
