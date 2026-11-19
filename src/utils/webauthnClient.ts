export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    Boolean(navigator.credentials?.create) &&
    Boolean(navigator.credentials?.get)
  );
}

export function isLikelyEmbeddedIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function base64UrlToArrayBuffer(b64u: string): ArrayBuffer {
  const pad = '='.repeat((4 - (b64u.length % 4)) % 4);
  const b64 = (b64u + pad).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  const buf = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buf;
}

function arrayBufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export interface ServerRegistrationOptions {
  rp: { name: string; id: string };
  user: { id: string; name: string; displayName: string };
  challenge: string;
  challengeToken: string;
  pubKeyCredParams: Array<{ type: 'public-key'; alg: number }>;
  timeout: number;
  attestation: AttestationConveyancePreference;
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  excludeCredentials?: Array<{
    id: string;
    type: 'public-key';
    transports?: AuthenticatorTransport[];
  }>;
}

export interface ServerAuthOptions {
  rpId: string;
  challenge: string;
  challengeToken: string;
  timeout: number;
  userVerification: UserVerificationRequirement;
  allowCredentials: Array<{
    id: string;
    type: 'public-key';
    transports?: AuthenticatorTransport[];
  }>;
}

export async function createBrowserPasskeyCredential(options: ServerRegistrationOptions) {
  const credential = (await navigator.credentials.create({
    publicKey: {
      rp: options.rp,
      user: {
        id: base64UrlToArrayBuffer(options.user.id),
        name: options.user.name,
        displayName: options.user.displayName,
      },
      challenge: base64UrlToArrayBuffer(options.challenge),
      pubKeyCredParams: options.pubKeyCredParams,
      timeout: options.timeout,
      attestation: options.attestation,
      authenticatorSelection: options.authenticatorSelection,
      excludeCredentials: (options.excludeCredentials ?? []).map((c) => ({
        id: base64UrlToArrayBuffer(c.id),
        type: c.type,
        transports: c.transports,
      })),
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('Passkey creation was cancelled.');
  }

  const response = credential.response as AuthenticatorAttestationResponse;
  const transports =
    typeof response.getTransports === 'function' ? response.getTransports() : [];

  return {
    id: credential.id,
    rawId: arrayBufferToBase64Url(credential.rawId),
    response: {
      clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
      attestationObject: arrayBufferToBase64Url(response.attestationObject),
      transports,
    },
  };
}

export async function getBrowserPasskeyAssertion(options: ServerAuthOptions) {
  const credential = (await navigator.credentials.get({
    publicKey: {
      rpId: options.rpId,
      challenge: base64UrlToArrayBuffer(options.challenge),
      timeout: options.timeout,
      userVerification: options.userVerification,
      allowCredentials: options.allowCredentials.map((c) => ({
        id: base64UrlToArrayBuffer(c.id),
        type: c.type,
        transports: c.transports,
      })),
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('Passkey authentication was cancelled.');
  }

  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: arrayBufferToBase64Url(credential.rawId),
    response: {
      clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
      authenticatorData: arrayBufferToBase64Url(response.authenticatorData),
      signature: arrayBufferToBase64Url(response.signature),
    },
  };
}

export function describePasskeyError(err: unknown): { message: string; iframeBlocked: boolean } {
  const raw = err instanceof Error ? err.message : String(err);
  const isIframePermission =
    /publickey-credentials|permissions policy|not enabled in this document|same-origin/i.test(raw) ||
    (isLikelyEmbeddedIframe() && /NotAllowedError|SecurityError/i.test(raw));

  if (isIframePermission) {
    return {
      message:
        'Browser preview iframes block biometric Passkey prompts for security. Open #admin in a standalone tab (or Render URL) to use Face ID / Touch ID / Fingerprint, or unlock below with your recovery secret.',
      iframeBlocked: true,
    };
  }

  if (/NotAllowedError|cancelled|timed out|abort/i.test(raw)) {
    return {
      message: 'Biometric prompt dismissed or timed out. Tap again to retry.',
      iframeBlocked: false,
    };
  }

  return { message: raw || 'Passkey operation failed.', iframeBlocked: false };
}
