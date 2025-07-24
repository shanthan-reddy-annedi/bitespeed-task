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
    private readonly contactRepository: Repository<Contact>,
  ) {}

  async identifyContact(
    input: IdentifyRequestDto,
  ): Promise<IdentifyResponseDto> {
    const { email, phoneNumber } = input;
    const existingContacts = await this.findContactsByEmailOrPhone(
      email,
      phoneNumber,
    );

    if (existingContacts.length === 0) {
      return this.createNewPrimaryContact(email, phoneNumber);
    }

    const relatedContacts = await this.findAllRelatedContacts(existingContacts);
    const primaryContact = this.findOldestPrimaryContact(relatedContacts);

    await this.createSecondaryContactIfNeeded(
      email,
      phoneNumber,
      primaryContact.id,
      relatedContacts,
    );

    const updatedRelatedContacts =
      await this.findAllRelatedContacts(existingContacts);

    return this.buildContactResponse(primaryContact, updatedRelatedContacts);
  }

  private async findContactsByEmailOrPhone(
    email?: string,
    phoneNumber?: string,
  ): Promise<Contact[]> {
    const queryBuilder = this.contactRepository.createQueryBuilder('contact');

    if (email && phoneNumber) {
      queryBuilder.where(
        'contact.email = :email OR contact.phoneNumber = :phoneNumber',
        {
          email,
          phoneNumber,
        },
      );
    } else if (email) {
      queryBuilder.where('contact.email = :email', { email });
    } else if (phoneNumber) {
      queryBuilder.where('contact.phoneNumber = :phoneNumber', { phoneNumber });
    } else {
      return [];
    }

    return queryBuilder.getMany();
  }

  private async createNewPrimaryContact(
    email?: string,
    phoneNumber?: string,
  ): Promise<IdentifyResponseDto> {
    const newContact = this.contactRepository.create({ email, phoneNumber });
    await this.contactRepository.save(newContact);

    return {
      contact: {
        primaryContatctId: newContact.id,
        emails: email ? [email] : [],
        phoneNumbers: phoneNumber ? [phoneNumber] : [],
        secondaryContactIds: [],
      },
    };
  }

  private async findAllRelatedContacts(
    contacts: Contact[],
  ): Promise<Contact[]> {
    const primaryIds = this.extractPrimaryContactIds(contacts);

    if (primaryIds.size === 0) {
      return contacts;
    }

    return this.contactRepository.find({
      where: [{ id: In([...primaryIds]) }, { linkedId: In([...primaryIds]) }],
    });
  }

  private extractPrimaryContactIds(contacts: Contact[]): Set<number> {
    const contactIds = new Set<number>();

    for (const contact of contacts) {
      if (contact.linkPrecedence === 'primary') {
        contactIds.add(contact.id);
      } else if (contact.linkedId) {
        contactIds.add(contact.linkedId);
      }
    }

    return contactIds;
  }

  private findOldestPrimaryContact(contacts: Contact[]): Contact {
    return contacts
      .filter((contact) => contact.linkPrecedence === 'primary')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
  }

  private async createSecondaryContactIfNeeded(
    email?: string,
    phoneNumber?: string,
    primaryContactId?: number,
    existingContacts: Contact[] = [],
  ): Promise<void> {
    if (!primaryContactId || (!email && !phoneNumber)) {
      return;
    }

    const hasEmail =
      email && existingContacts.some((contact) => contact.email === email);
    const hasPhone =
      phoneNumber &&
      existingContacts.some((contact) => contact.phoneNumber === phoneNumber);

    const needsNewSecondary =
      (email && !hasEmail) || (phoneNumber && !hasPhone);

    const exactMatchExists = existingContacts.some(
      (contact) =>
        (email === contact.email || (!email && !contact.email)) &&
        (phoneNumber === contact.phoneNumber ||
          (!phoneNumber && !contact.phoneNumber)),
    );

    if (needsNewSecondary && !exactMatchExists) {
      const newSecondaryContact = this.contactRepository.create({
        email: !hasEmail ? email : undefined,
        phoneNumber: !hasPhone ? phoneNumber : undefined,
        linkedId: primaryContactId,
        linkPrecedence: 'secondary',
      });

      await this.contactRepository.save(newSecondaryContact);
    }
  }

  private buildContactResponse(
    primaryContact: Contact,
    allContacts: Contact[],
  ): IdentifyResponseDto {
    const uniqueEmails = this.extractUniqueValues(allContacts, 'email');
    const uniquePhoneNumbers = this.extractUniqueValues(
      allContacts,
      'phoneNumber',
    );
    const secondaryContactIds = allContacts
      .filter((contact) => contact.linkPrecedence === 'secondary')
      .map((contact) => contact.id);

    // Ensure primary contact values appear first in the lists
    const orderedEmails = this.orderValuesByPrimary(
      uniqueEmails,
      primaryContact.email,
    );

    const orderedPhoneNumbers = this.orderValuesByPrimary(
      uniquePhoneNumbers,
      primaryContact.phoneNumber,
    );

    return {
      contact: {
        primaryContatctId: primaryContact.id,
        emails: orderedEmails,
        phoneNumbers: orderedPhoneNumbers,
        secondaryContactIds,
      },
    };
  }

  private extractUniqueValues(
    contacts: Contact[],
    property: keyof Contact,
  ): string[] {
    return Array.from(
      new Set(
        contacts.map((contact) => contact[property] as string).filter(Boolean),
      ),
    );
  }

  private orderValuesByPrimary(
    values: string[],
    primaryValue?: string,
  ): string[] {
    if (!primaryValue) {
      return values;
    }

    return [primaryValue, ...values.filter((value) => value !== primaryValue)];
  }
}
