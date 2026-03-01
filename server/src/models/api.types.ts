export interface IdentifyRequest {
  email?: string | null;
  phoneNumber?: number | string | null;
}

export interface IdentifyResponseContact {
  primaryContactId: number;
  emails: string[];
  phoneNumbers: string[];
  secondaryContactIds: number[];
}

export interface IdentifyResponse {
  contact: IdentifyResponseContact;
}
