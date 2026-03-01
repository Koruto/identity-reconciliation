import { getPrisma } from "../db/client.js";
import type { Contact, CreateContactInput, LinkPrecedence } from "../models/contact.model.js";

function mapRow(row: {
  id: number;
  phoneNumber: string | null;
  email: string | null;
  linkedId: number | null;
  linkPrecedence: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): Contact {
  return {
    id: row.id,
    phoneNumber: row.phoneNumber,
    email: row.email,
    linkedId: row.linkedId,
    linkPrecedence: row.linkPrecedence as LinkPrecedence,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export async function findByEmail(email: string): Promise<Contact[]> {
  const prisma = getPrisma();
  const rows = await prisma.contact.findMany({
    where: { email: email, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapRow);
}

export async function findByPhoneNumber(phone: string): Promise<Contact[]> {
  const prisma = getPrisma();
  const rows = await prisma.contact.findMany({
    where: { phoneNumber: phone, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapRow);
}

export async function findById(id: number): Promise<Contact | null> {
  const prisma = getPrisma();
  const row = await prisma.contact.findFirst({
    where: { id, deletedAt: null },
  });
  return row ? mapRow(row) : null;
}

export async function findSecondaryByLinkedId(primaryId: number): Promise<Contact[]> {
  const prisma = getPrisma();
  const rows = await prisma.contact.findMany({
    where: { linkedId: primaryId, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapRow);
}

export async function create(data: CreateContactInput): Promise<Contact> {
  const prisma = getPrisma();
  const row = await prisma.contact.create({
    data: {
      email: data.email,
      phoneNumber: data.phoneNumber,
      linkedId: data.linkedId,
      linkPrecedence: data.linkPrecedence,
    },
  });
  return mapRow(row);
}

export async function updateLinkPrecedence(
  id: number,
  linkedId: number
): Promise<Contact> {
  const prisma = getPrisma();
  const row = await prisma.contact.update({
    where: { id },
    data: {
      linkedId,
      linkPrecedence: "secondary",
    },
  });
  return mapRow(row);
}

export async function findAll(): Promise<Contact[]> {
  const prisma = getPrisma();
  const rows = await prisma.contact.findMany({
    where: { deletedAt: null },
    orderBy: [{ linkPrecedence: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapRow);
}
