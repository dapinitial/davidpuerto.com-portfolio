// A software passkey for the tests: a P-256 key pair that answers WebAuthn
// registration ("none" attestation) and sign-in the way a platform passkey
// does, with user presence and verification set. Real signatures, checked by
// the same @simplewebauthn/server code production runs.
import { createHash, createSign, generateKeyPairSync, randomBytes } from 'node:crypto';

/* the little CBOR the attestation needs: ints, byte and text strings, maps */
function cbor(v) {
  const head = (major, n) => {
    if (n < 24) return Buffer.from([(major << 5) | n]);
    if (n < 256) return Buffer.from([(major << 5) | 24, n]);
    if (n < 65536) { const b = Buffer.alloc(3); b[0] = (major << 5) | 25; b.writeUInt16BE(n, 1); return b; }
    const b = Buffer.alloc(5); b[0] = (major << 5) | 26; b.writeUInt32BE(n, 1); return b;
  };
  if (typeof v === 'number') return v >= 0 ? head(0, v) : head(1, -1 - v);
  if (Buffer.isBuffer(v)) return Buffer.concat([head(2, v.length), v]);
  if (typeof v === 'string') { const b = Buffer.from(v, 'utf8'); return Buffer.concat([head(3, b.length), b]); }
  if (v instanceof Map) return Buffer.concat([head(5, v.size), ...[...v].flatMap(([k, x]) => [cbor(k), cbor(x)])]);
  throw new Error(`cbor: ${typeof v}`);
}

const b64u = (b) => Buffer.from(b).toString('base64url');
const sha256 = (b) => createHash('sha256').update(b).digest();

export function softPasskey({ rpID, origin }) {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = publicKey.export({ format: 'jwk' });
  const credId = randomBytes(16);
  let counter = 0;
  const clientData = (type, challenge) => Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false }));
  const flagsAndCount = (flags, n) => { const b = Buffer.alloc(5); b[0] = flags; b.writeUInt32BE(n, 1); return b; };

  return {
    id: b64u(credId),
    register(options) {
      const cose = cbor(new Map([[1, 2], [3, -7], [-1, 1], [-2, Buffer.from(jwk.x, 'base64url')], [-3, Buffer.from(jwk.y, 'base64url')]]));
      const idLen = Buffer.alloc(2); idLen.writeUInt16BE(credId.length);
      // UP | UV | AT (attested credential data follows)
      const authData = Buffer.concat([sha256(rpID), flagsAndCount(0x45, 0), Buffer.alloc(16), idLen, credId, cose]);
      const attestationObject = cbor(new Map([['fmt', 'none'], ['attStmt', new Map()], ['authData', authData]]));
      return {
        id: b64u(credId), rawId: b64u(credId), type: 'public-key', clientExtensionResults: {},
        response: { clientDataJSON: b64u(clientData('webauthn.create', options.challenge)), attestationObject: b64u(attestationObject), transports: ['internal'] },
      };
    },
    // { counter } lets a test replay an old count, the way a cloned key would
    sign(options, { counter: n = ++counter } = {}) {
      const cd = clientData('webauthn.get', options.challenge);
      const authData = Buffer.concat([sha256(rpID), flagsAndCount(0x05, n)]);
      const signature = createSign('SHA256').update(Buffer.concat([authData, sha256(cd)])).sign(privateKey);
      return {
        id: b64u(credId), rawId: b64u(credId), type: 'public-key', clientExtensionResults: {},
        response: { clientDataJSON: b64u(cd), authenticatorData: b64u(authData), signature: b64u(signature) },
      };
    },
  };
}
