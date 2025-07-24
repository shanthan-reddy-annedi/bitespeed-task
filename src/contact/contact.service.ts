import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Contact } from './contact.entity';
import { IdentifyRequestDto } from './dto/identify-request.dto';
import { IdentifyResponseDto } from './dto/identify-response.dto';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact)
    private contactRepo: Repository<Contact>,
  ) {}

  async identifyContact(
    input: IdentifyRequestDto,
  ): Promise<IdentifyResponseDto> {
    const { email, phoneNumber } = input;

    const existingContacts = await this.contactRepo.find({
      where: [{ email }, { phoneNumber }],
    });

    let allRelatedContacts: Contact[] = [];

    if (existingContacts.length === 0) {
      const newContact = this.contactRepo.create({ email, phoneNumber });
      await this.contactRepo.save(newContact);
      return {
        contact: {
          primaryContatctId: newContact.id,
          emails: [newContact.email].filter(Boolean),
          phoneNumbers: [newContact.phoneNumber].filter(Boolean),
          secondaryContactIds: [],
        },
      };
    }

    const contactIdsToSearch = new Set<number>();
    for (const contact of existingContacts) {
      if (contact.linkPrecedence === 'primary') {
        contactIdsToSearch.add(contact.id);
      } else {
        contactIdsToSearch.add(contact.linkedId);
      }
    }

    allRelatedContacts = await this.contactRepo.find({
      where: [
        { id: In([...contactIdsToSearch]) },
        { linkedId: In([...contactIdsToSearch]) },
      ],
    });

    const primaryContact = allRelatedContacts
      .filter((c) => c.linkPrecedence === 'primary')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

    const alreadyHasEmail = allRelatedContacts.some((c) => c.email === email);
    const alreadyHasPhone = allRelatedContacts.some(
      (c) => c.phoneNumber === phoneNumber,
    );

    if (!alreadyHasEmail || !alreadyHasPhone) {
      const newContact = this.contactRepo.create({
        email,
        phoneNumber,
        linkedId: primaryContact.id,
        linkPrecedence: 'secondary',
      });
      await this.contactRepo.save(newContact);
      allRelatedContacts.push(newContact);
    }

    const emails = Array.from(
      new Set(allRelatedContacts.map((c) => c.email).filter(Boolean)),
    );
    const phoneNumbers = Array.from(
      new Set(allRelatedContacts.map((c) => c.phoneNumber).filter(Boolean)),
    );
    const secondaryContactIds = allRelatedContacts
      .filter((c) => c.linkPrecedence === 'secondary')
      .map((c) => c.id);

    return {
      contact: {
        primaryContatctId: primaryContact.id,
        emails: [
          primaryContact.email,
          ...emails.filter((e) => e !== primaryContact.email),
        ],
        phoneNumbers: [
          primaryContact.phoneNumber,
          ...phoneNumbers.filter((p) => p !== primaryContact.phoneNumber),
        ],
        secondaryContactIds,
      },
    };
  }
}
