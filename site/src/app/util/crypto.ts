declare global {
  interface Window {
    arweaveWallet: {
      decrypt: (
        encryptedKeyArray: Uint8Array,
        options: { name: string }
      ) => Promise<ArrayBuffer>;
    };
  }
}
export async function generateAESKey(): Promise<Uint8Array> {
  return crypto.getRandomValues(new Uint8Array(32));
}

export async function encryptAESKeyWithRSA(
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

    // Use the plugin to decrypt
    const decryptedKeyArrayBuffer = await window.arweaveWallet.decrypt(
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
