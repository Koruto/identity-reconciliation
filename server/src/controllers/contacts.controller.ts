import type { Request, Response } from "express";
import * as contactRepository from "../repositories/contact.repository.js";

export async function listContacts(_req: Request, res: Response): Promise<void> {
  const contacts = await contactRepository.findAll();
  res.status(200).json({ contacts });
}
