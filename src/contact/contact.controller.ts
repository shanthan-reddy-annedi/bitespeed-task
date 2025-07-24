import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { IdentifyRequestDto } from './dto/identify-request.dto';
import { IdentifyResponseDto } from './dto/identify-response.dto';

@ApiTags('contact')
@Controller('identify')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @ApiOperation({
    summary: 'Identify and consolidate contact information',
    description:
      'Identifies a person based on email or phone number and returns consolidated contact information including primary and secondary contacts.',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact identified successfully',
    type: IdentifyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
    schema: {
      example: {
        message: ['At least one of email or phoneNumber must be provided'],
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  async identify(
    @Body() body: IdentifyRequestDto,
  ): Promise<IdentifyResponseDto> {
    return this.contactService.identifyContact(body);
  }
}
