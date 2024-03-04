// Importation du module crypto pour webcrypto
import { webcrypto } from "crypto";

// Fonction pour convertir un ArrayBuffer en chaîne Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

// Fonction pour convertir une chaîne Base64 en ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  var buff = Buffer.from(base64, "base64");
  return buff.buffer.slice(buff.byteOffset, buff.byteOffset + buff.byteLength);
}

// Définition du type de la fonction pour générer une paire de clés RSA
type GenerateRsaKeyPair = {
  publicKey: webcrypto.CryptoKey;
  privateKey: webcrypto.CryptoKey;
};

// Fonction pour générer une paire de clés RSA
export async function generateRsaKeyPair(): Promise<GenerateRsaKeyPair> {
  const keyPair = await webcrypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
  );
  return keyPair;
}

// Fonction pour exporter une clé publique crypto en format Base64
export async function exportPubKey(key: webcrypto.CryptoKey): Promise<string> {
  const EXPkey = await webcrypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(EXPkey);
}

// Fonction pour exporter une clé privée crypto en format Base64
export async function exportPrvKey(
    key: webcrypto.CryptoKey | null
): Promise<string | null> {
  if (key === null) {
    return null;
  }
  const EXPkey = await webcrypto.subtle.exportKey("pkcs8", key);
  return arrayBufferToBase64(EXPkey);
}

// Fonction pour importer une clé publique en format Base64 vers son format natif
export async function importPubKey(
    strKey: string
): Promise<webcrypto.CryptoKey> {
  const kBuffer = base64ToArrayBuffer(strKey);
  const key = await webcrypto.subtle.importKey(
      "spki",
      kBuffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["encrypt"]
  );
  return key;
}

// Fonction pour importer une clé privée en format Base64 vers son format natif
export async function importPrvKey(
  encodedKey: string
): Promise<webcrypto.CryptoKey> {
// Convert the base64 encoded private key to an ArrayBuffer
const privateKeyBuffer = base64ToArrayBuffer(encodedKey);
// Import the private key for use with RSA-OAEP and decryption
const importedPrivateKey = await webcrypto.subtle.importKey(
  "pkcs8",
  privateKeyBuffer,
  {
    name: "RSA-OAEP",
    hash: "SHA-256",
  },
  true, // The key is extractable
  ["decrypt"] // Key usage
);
return importedPrivateKey;
}


// Fonction pour chiffrer un message avec une clé publique RSA
export async function rsaEncrypt(
  base64Data: string,
  publicKeyString: string
): Promise<string> {
// Import the public key
const publicKey = await importPubKey(publicKeyString);
// Convert the base64 encoded data to an ArrayBuffer
const dataBuffer = new TextEncoder().encode(base64Data);
// Encrypt the data using RSA-OAEP
const encryptedBuffer = await webcrypto.subtle.encrypt(
  {
    name: "RSA-OAEP",
  },
  publicKey,
  dataBuffer
);
// Convert the encrypted data back to a base64 string
return arrayBufferToBase64(encryptedBuffer);
}


// Fonction pour déchiffrer un message avec une clé privée RSA
export async function rsaDecrypt(
  data: string,
  privateKey: webcrypto.CryptoKey
): Promise<string> {
// Convert the base64 encoded data to an ArrayBuffer
const encryptedDataBuffer = base64ToArrayBuffer(data);
// Decrypt the data using RSA-OAEP with the provided private key
const decryptedData = await webcrypto.subtle.decrypt(
  {
    name: "RSA-OAEP",
  },
  privateKey,
  encryptedDataBuffer
);
// Decode the decrypted data into a string and return it
return new TextDecoder().decode(decryptedData);
}


// Fonction pour créer une clé symétrique aléatoire
export async function createRandomSymmetricKey(): Promise<webcrypto.CryptoKey> {
  const key = await webcrypto.subtle.generateKey(
      {
        name: "AES-CBC",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
  );
  return key;
}

// Fonction pour exporter une clé symétrique en format Base64
export async function exportSymKey(key: webcrypto.CryptoKey): Promise<string> {
  const EXPkey = await webcrypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(EXPkey);
}

// Fonction pour importer une clé symétrique en format Base64 vers son format natif
export async function importSymKey(
    strKey: string
): Promise<webcrypto.CryptoKey> {
  const kBuffer = base64ToArrayBuffer(strKey);
  const key = await webcrypto.subtle.importKey(
      "raw",
      kBuffer,
      {
        name: "AES-CBC",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
  );
  return key;
}

// Fonction pour chiffrer un message avec une clé symétrique
export async function symEncrypt(
  key: webcrypto.CryptoKey,
  data: string
): Promise<string> {
// Generating a random initialization vector (IV)
const initializationVector = webcrypto.getRandomValues(new Uint8Array(16));
// Encoding the input data to a Uint8Array
const dataToEncode = new TextEncoder().encode(data);
// Encrypting the data using the AES-CBC algorithm
const encryptedBytes = await webcrypto.subtle.encrypt(
  {
    name: "AES-CBC",
    iv: initializationVector,
  },
  key,
  dataToEncode
);

// Creating a new Uint8Array to hold the IV and the encrypted data
const combinedData = new Uint8Array(initializationVector.byteLength + encryptedBytes.byteLength);
combinedData.set(initializationVector, 0);
combinedData.set(new Uint8Array(encryptedBytes), initializationVector.byteLength);

// Converting the combined IV + encrypted data array buffer to Base64 string
return arrayBufferToBase64(combinedData.buffer);
}


// Fonction pour déchiffrer un message avec une clé symétrique
export async function symDecrypt(
  strKey: string,
  encryptedData: string
): Promise<string> {
const symmetricKey = await importSymKey(strKey);
const cipherDataBuffer = base64ToArrayBuffer(encryptedData);
const ivForDecryption = cipherDataBuffer.slice(0, 16);
const encryptedContent = cipherDataBuffer.slice(16);

const decryptedData = await webcrypto.subtle.decrypt(
  {
    name: "AES-CBC",
    iv: ivForDecryption,
  },
  symmetricKey,
  encryptedContent
);

return new TextDecoder().decode(decryptedData);
}

