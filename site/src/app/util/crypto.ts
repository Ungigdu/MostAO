import { ArweaveSigner } from "arseeding-arbundles/src/signing";
import { createData } from "arseeding-arbundles";
import { JWKInterface } from "arseeding-arbundles/src/interface-jwk";
import { decryptAESKeywithRSA, encryptAESKeywithRSA } from 'arweavekit/encryption';

export async function generateAESKey(): Promise<Uint8Array> {
  return crypto.getRandomValues(new Uint8Array(32));
}

export async function encryptAESKeyWithRSA(aesKey: Uint8Array,
  publicKeyStr: string) {
  // In a browser environment, use_wallet or nothing can be passed.
  // const wallet = "use_wallet"
  // In a node environment, Arweave wallet JWK can be used.
  // const wallet = JSON.parse(fs.readFileSync('wallet.json').toString());

  const isWalletExist = localStorage.getItem('wallet');
  const wallet = JSON.parse(isWalletExist);

  // Create a TextDecoder instance
  const decoder = new TextDecoder('utf-8');

  // Decode the Uint8Array to a string
  const str = decoder.decode(aesKey);

  const encryptedAESKey = await encryptAESKeywithRSA({
    key: str,
    wallet: wallet.key
  });

  // Convert the encrypted AES key to a base64 string
  const encryptedAESKeyArray = Array.from(new Uint8Array(encryptedAESKey));
  return btoa(String.fromCharCode.apply(null, encryptedAESKeyArray));
}

export async function encryptAESKeyWithRSA_OLD(
  aesKey: Uint8Array,
  publicKeyStr: string
): Promise<string> {
  try {
    // Decode the base64 encoded `n` field
    const binaryDerString = atob(
      publicKeyStr.replace(/-/g, "+").replace(/_/g, "/")
    );
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
      binaryDer[i] = binaryDerString.charCodeAt(i);
    }

    // Construct the JWK object
    const jwk = {
      kty: "RSA",
      n: publicKeyStr,
      e: "AQAB",
    };

    // Import the JWK public key
    const publicKey = await window.crypto.subtle.importKey(
      "jwk",
      jwk,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["encrypt"]
    );

    // Encrypt the AES key with the imported public key
    const encryptedAESKey = await window.crypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      publicKey,
      aesKey
    );

    // Convert the encrypted AES key to a base64 string
    const encryptedAESKeyArray = Array.from(new Uint8Array(encryptedAESKey));
    return btoa(String.fromCharCode.apply(null, encryptedAESKeyArray));
  } catch (error) {
    console.error("Error in encryptAESKeyWithRSA:", error);
    throw error;
  }
}
export async function decryptAESKeyWithPlugin(
  encryptedAESKey: string
): Promise<Uint8Array> {
  try {
    // Convert base64 string back to Uint8Array
    console.log("encryptedAESKey:", encryptedAESKey);
    const encryptedKeyBinary = atob(encryptedAESKey);
    const encryptedKeyArray = new Uint8Array(encryptedKeyBinary.length);
    for (let i = 0; i < encryptedKeyBinary.length; i++) {
      encryptedKeyArray[i] = encryptedKeyBinary.charCodeAt(i);
    }

    // Type assertion for window.arweaveWallet
    const arweaveWallet = (window as any).arweaveWallet as {
      decrypt: (
        encryptedKeyArray: Uint8Array,
        options: { name: string }
      ) => Promise<ArrayBuffer>;
    };

    // Use the plugin to decrypt
    const decryptedKeyArrayBuffer = await arweaveWallet.decrypt(
      encryptedKeyArray,
      { name: "RSA-OAEP" }
    );

    console.log("decryptedKeyArrayBuffer:", decryptedKeyArrayBuffer);
    return new Uint8Array(decryptedKeyArrayBuffer);
  } catch (error) {
    console.error("Error in decryptAESKeyWithPlugin:", error);
    throw error;
  }
}
export async function decryptAESKeyWithRSA(
  encryptedAESKey: string,
  privateKey: CryptoKey
): Promise<Uint8Array> {

  try {
    // Create a TextEncoder instance
    const encoder = new TextEncoder();
  
    // Encode the string to a Uint8Array
    const uint8Array = encoder.encode(encryptedAESKey);
  
    const isWalletExist = localStorage.getItem('wallet');
    const wallet = JSON.parse(isWalletExist);
  
    const decryptedAESKey = await decryptAESKeywithRSA({
      key: uint8Array,
      wallet: wallet.key
    });
  
    console.log('decryptedAESKey', decryptedAESKey)

    return encoder.encode(decryptedAESKey);
    
  } catch (error) {
    console.log('decryptAESKeyWithRSA', error)
  }
}

export async function decryptAESKeyWithRSA_OLD(
  encryptedAESKey: string,
  privateKey: CryptoKey
): Promise<Uint8Array> {
  try {
    const encryptedKeyBinary = atob(encryptedAESKey);
    const encryptedKeyArray = new Uint8Array(encryptedKeyBinary.length);
    for (let i = 0; i < encryptedKeyBinary.length; i++) {
      encryptedKeyArray[i] = encryptedKeyBinary.charCodeAt(i);
    }

    const decryptedKey = await window.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      privateKey,
      encryptedKeyArray
    );

    return new Uint8Array(decryptedKey);
  } catch (error) {
    console.error("Error in decryptAESKeyWithRSA:", error);
    throw error;
  }
}

export async function encryptMessageWithAES(
  message: string,
  aesKey: Uint8Array
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await window.crypto.subtle.importKey(
    "raw",
    aesKey,
    {
      name: "AES-GCM",
    },
    false,
    ["encrypt"]
  );

  const encryptedMessage = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    new TextEncoder().encode(message)
  );

  const encryptedArray = new Uint8Array(encryptedMessage);
  const combinedArray = new Uint8Array(iv.length + encryptedArray.length);
  combinedArray.set(iv);
  combinedArray.set(encryptedArray, iv.length);

  // 将 Uint8Array 转换为字符串之前，先将其转换为普通数组
  const combinedArrayAsArray = Array.from(combinedArray);
  return btoa(String.fromCharCode.apply(null, combinedArrayAsArray));
}

export async function decryptMessageWithAES(
  encryptedMessage: string,
  aesKey: Uint8Array
): Promise<string> {
  try {
    const combinedArray = new Uint8Array(
      atob(encryptedMessage)
        .split("")
        .map((char) => char.charCodeAt(0))
    );
    const iv = combinedArray.slice(0, 12);
    const encryptedArray = combinedArray.slice(12);

    const key = await window.crypto.subtle.importKey(
      "raw",
      aesKey,
      {
        name: "AES-GCM",
      },
      false,
      ["decrypt"]
    );

    const decryptedMessage = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encryptedArray
    );

    return new TextDecoder().decode(decryptedMessage);
  } catch (error) {
    console.error("Error in decryptMessageWithAES:", error);
    throw error;
  }
}

export async function prepareSessionKeyData(
  aesKey: Uint8Array,
  ownPublicKeyStr: string,
  otherPublicKeyStr: string
) {
  const encryptedAESKeyBySelf = await encryptAESKeyWithRSA(
    aesKey,
    ownPublicKeyStr
  );
  const encryptedAESKeyByOther = await encryptAESKeyWithRSA(
    aesKey,
    otherPublicKeyStr
  );

  return {
    encrypted_sk_by_a: encryptedAESKeyBySelf,
    pubkey_a: ownPublicKeyStr,
    encrypted_sk_by_b: encryptedAESKeyByOther,
    pubkey_b: otherPublicKeyStr,
  };
}

// Added by Kevin
export async function generateRSAKeyPair() {
  try {
    // 使用 Web Crypto API 生成 RSA 密钥对
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048, // 密钥长度，2048 位是常见的选择
        publicExponent: new Uint8Array([1, 0, 1]), // 公钥指数通常是 65537 (0x010001)
        hash: { name: 'SHA-256' }, // 用于签名和验证的哈希算法
      },
      true, // 是否可以导出密钥
      ['encrypt', 'decrypt'] // 密钥用途，'encrypt' 和 'decrypt' 适用于加密解密
    );

    // 导出公钥和私钥为 PEM 格式
    const publicKey = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
    const privateKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

    // 将 ArrayBuffer 转换为 Base64 字符串
    const publicKeyBase64 = arrayBufferToBase64(publicKey);
    const privateKeyBase64 = arrayBufferToBase64(privateKey);

    // console.log('Public Key (Base64):', publicKeyBase64);
    // console.log('Private Key (Base64):', privateKeyBase64);

    // 存储密钥对到 IndexedDB
    // await storeKeys(publicKeyBase64, privateKeyBase64);

    // 存储密钥对到 localStorage
    localStorage.setItem('pubkey', publicKeyBase64);
    localStorage.setItem('privkey', privateKeyBase64);

    return {
      publicKey: publicKeyBase64,
      privateKey: privateKeyBase64,
    };
  } catch (error) {
    console.error('Error generating RSA key pair:', error);
    return '';
  }
}

// 辅助函数：将 ArrayBuffer 转换为 Base64 字符串
function arrayBufferToBase64(buffer: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(buffer));
  return window.btoa(binary);
}

// 辅助函数：将 Base64 字符串转换为 ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// 导入公钥
export async function importPublicKey(base64PublicKey: string): Promise<CryptoKey> {
  const publicKeyBuffer = base64ToArrayBuffer(base64PublicKey);
  return window.crypto.subtle.importKey(
    'spki', // 使用 'spki' (X.509) 格式导入公钥
    publicKeyBuffer,
    {
      name: 'RSA-OAEP',
      hash: { name: 'SHA-256' }
    },
    true, // 允许导出的密钥
    ['encrypt'] // 公钥用途：加密
  );
}

// 导入私钥
export async function importPrivateKey(base64PrivateKey: string): Promise<CryptoKey> {
  const privateKeyBuffer = base64ToArrayBuffer(base64PrivateKey);
  return window.crypto.subtle.importKey(
    'pkcs8', // 使用 'pkcs8' 格式导入私钥
    privateKeyBuffer,
    {
      name: 'RSA-OAEP',
      hash: { name: 'SHA-256' }
    },
    true, // 允许导出的密钥
    ['decrypt'] // 私钥用途：解密
  );
}

// create a custom signer
export const dataItemSigner = (jwk: JWKInterface) => async ({
  data,
  tags = [],
  target,
  anchor
}: {
  data: any;
  tags?: { name: string; value: string }[];
  target?: string;
  anchor?: string;
}): Promise<{ id: string; raw: ArrayBuffer }> => {

  const signer = new ArweaveSigner(jwk);
  const dataItem = createData(data, signer, { tags, target, anchor });
  await dataItem.sign(signer);

  return {
    id: dataItem.id,
    raw: dataItem.getRaw()
  }
}