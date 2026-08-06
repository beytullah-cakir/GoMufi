import { Issuer, Client, generators } from 'openid-client';
import { config } from '../config';

let googleClient: Client | null = null;

export async function getGoogleClient(): Promise<Client> {
  if (googleClient) return googleClient;

  const googleIssuer = await Issuer.discover('https://accounts.google.com');
  googleClient = new googleIssuer.Client({
    client_id: config.GOOGLE_CLIENT_ID,
    client_secret: config.GOOGLE_CLIENT_SECRET,
    redirect_uris: [],
    response_types: ['code'],
  });

  return googleClient;
}

export function generateState(): string {
  return generators.state();
}

export function generateNonce(): string {
  return generators.nonce();
}
