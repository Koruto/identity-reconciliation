import type { Prisma } from "@prisma/client";
import { getPrisma } from "../db/client.js";
import * as contactRepository from "../repositories/contact.repository.js";
import type { Contact } from "../models/contact.model.js";
import type { IdentifyResponse } from "../models/api.types.js";

function getPrimaryId(c: Contact): number {
  if (c.linkPrecedence === "primary") return c.id;
  return c.linkedId ?? c.id;
}

function buildResponse(primary: Contact, secondaries: Contact[]): IdentifyResponse {
  const emails: string[] = [];
  const seenEmails = new Set<string>();
  if (primary.email) {
    emails.push(primary.email);
    seenEmails.add(primary.email);
  }
  const byCreated = [...secondaries].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );
  for (const s of byCreated) {
    if (s.email && !seenEmails.has(s.email)) {
      emails.push(s.email);
      seenEmails.add(s.email);
    }
  }

  const phoneNumbers: string[] = [];
  const seenPhones = new Set<string>();
  if (primary.phoneNumber) {
    phoneNumbers.push(primary.phoneNumber);
    seenPhones.add(primary.phoneNumber);
  }
  for (const s of byCreated) {
    if (s.phoneNumber && !seenPhones.has(s.phoneNumber)) {
      phoneNumbers.push(s.phoneNumber);
      seenPhones.add(s.phoneNumber);
    }
  }

  const secondaryContactIds = secondaries.map((s) => s.id);

  return {
    contact: {
      primaryContactId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds,
    },
  };
}

function inChain(
  primary: Contact,
  secondaries: Contact[],
  email?: string | null,
  phone?: string | null
): { email: boolean; phone: boolean } {
  const all = [primary, ...secondaries];
  return {
    email: !!email && all.some((c) => c.email === email),
    phone: !!phone && all.some((c) => c.phoneNumber === phone),
  };
}

async function mergePrimaries(
  primaryIds: Set<number>,
  contacts: Contact[]
): Promise<IdentifyResponse> {
  const primaryRows: Contact[] = [];
  for (const pid of primaryIds) {
    const inList = contacts.find((c) => c.id === pid);
    const row = inList ?? (await contactRepository.findById(pid));
    if (row) primaryRows.push(row);
  }
  const sorted = primaryRows.sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );
  const winner = sorted[0];
  const toDemote = sorted.slice(1);
  const prisma = getPrisma();
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const p of toDemote) {
      await tx.contact.update({
        where: { id: p.id },
        data: { linkedId: winner.id, linkPrecedence: "secondary" },
      });
      await tx.contact.updateMany({
        where: { linkedId: p.id },
        data: { linkedId: winner.id },
      });
    }
  });
  const secondaries = await contactRepository.findSecondaryByLinkedId(winner.id);
  return buildResponse(winner, secondaries);
}

export async function identify(
  email?: string | null,
  phoneNumber?: string | null
): Promise<IdentifyResponse> {

  const byEmail = email
    ? await contactRepository.findByEmail(email)
    : [];
  const byPhone = phoneNumber
    ? await contactRepository.findByPhoneNumber(phoneNumber)
    : [];

  const allContacts = new Map<number, Contact>();
  for (const contact of [...byEmail, ...byPhone]) allContacts.set(contact.id, contact);
  const contacts = Array.from(allContacts.values());

  if (contacts.length === 0) {
    const primary = await contactRepository.create({
      email: email,
      phoneNumber: phoneNumber,
      linkedId: null,
      linkPrecedence: "primary",
    });
    return buildResponse(primary, []);
  }

  const primaryIds = new Set(contacts.map(getPrimaryId));

  if (primaryIds.size > 1) {
    return mergePrimaries(primaryIds, contacts);
  }

  const primaries = contacts.filter((c) => c.linkPrecedence === "primary");
  const primary = primaries[0]
  let secondaries = await contactRepository.findSecondaryByLinkedId(primary.id);

  const found = inChain(primary, secondaries, email, phoneNumber);
  const hasNewInfo = (email && !found.email) || (phoneNumber && !found.phone);

  if (hasNewInfo) {
    await contactRepository.create({
      email: email,
      phoneNumber: phoneNumber,
      linkedId: primary.id,
      linkPrecedence: "secondary",
    });
    secondaries = await contactRepository.findSecondaryByLinkedId(primary.id);
  }

  return buildResponse(primary, secondaries);
}
