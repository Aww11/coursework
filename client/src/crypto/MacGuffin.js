const MacGuffin = {
  sboxes: [
    [0x02, 0x00, 0x00, 0x05, 0x03, 0x01, 0x01, 0x00, 0x00, 0x01, 0x01, 0x00, 0x03, 0x03, 0x01, 0x02],
    [0x03, 0x03, 0x00, 0x02, 0x00, 0x01, 0x02, 0x02, 0x00, 0x01, 0x01, 0x00, 0x02, 0x02, 0x01, 0x02],
    [0x0c, 0x04, 0x04, 0x0c, 0x08, 0x00, 0x08, 0x04, 0x00, 0x0c, 0x08, 0x00, 0x08, 0x04, 0x0c, 0x0c],
    [0x00, 0x0c, 0x0c, 0x00, 0x04, 0x08, 0x08, 0x08, 0x00, 0x00, 0x0c, 0x0c, 0x0c, 0x04, 0x04, 0x00],
    [0x00, 0x02, 0x02, 0x03, 0x00, 0x00, 0x01, 0x02, 0x01, 0x00, 0x02, 0x01, 0x03, 0x02, 0x00, 0x01],
    [0x07, 0x08, 0x0c, 0x0f, 0x01, 0x05, 0x07, 0x08, 0x0c, 0x0f, 0x01, 0x05, 0x07, 0x08, 0x0c, 0x0f],
    [0x09, 0x0f, 0x05, 0x0b, 0x02, 0x07, 0x09, 0x0f, 0x05, 0x0b, 0x02, 0x07, 0x09, 0x0f, 0x05, 0x0b],
    [0x0b, 0x0d, 0x00, 0x04, 0x03, 0x09, 0x0b, 0x0d, 0x00, 0x04, 0x03, 0x09, 0x0b, 0x0d, 0x00, 0x04]
  ],

  keySetup: function (key) {
    const ROUNDS = 32;
    const KSIZE = ROUNDS * 3;
    const ek = new Array(KSIZE).fill(0);

    let left = key.slice(0, 8);
    let right = key.slice(8, 16);

    for (let h = 0; h < ROUNDS; h++) {
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          let t = this.sboxes[j][(left[i] ^ right[i]) & 0x3F];
          ek[h * 3 + i] ^= t;
        }
      }
      [left, right] = [right, left];
    }

    return ek;
  },

  encryptBlock: function (block, ek) {
    const ROUNDS = 32;
    let [left, right] = [block.slice(0, 8), block.slice(8, 16)];

    for (let i = 0; i < ROUNDS; i++) {
      for (let j = 0; j < 8; j++) {
        let t = this.sboxes[j][(left[j] ^ ek[i * 3 + j]) & 0x3F];
        right[j] ^= t;
      }
      [left, right] = [right, left];
    }

    // Преобразуем left и right в массивы перед конкатенацией
    return Array.isArray(left) && Array.isArray(right) ? left.concat(right) : [];
  },

  decryptBlock: function (block, ek) {
    const ROUNDS = 32;
    let [left, right] = [block.slice(0, 8), block.slice(8, 16)];

    for (let i = ROUNDS - 1; i >= 0; i--) {
      for (let j = 0; j < 8; j++) {
        let t = this.sboxes[j][(left[j] ^ ek[i * 3 + j]) & 0x3F];
        right[j] ^= t;
      }
      [left, right] = [right, left];
    }

    // Преобразуем left и right в массивы перед конкатенацией
    return Array.isArray(left) && Array.isArray(right) ? left.concat(right) : [];
  },

  encrypt: function (message, key) {
    const ek = this.keySetup(stringToUint8Array(key));
    const blockSize = 16;
    const binaryMessage = stringToUint8Array(message);
    const paddedMessage = padMessage(binaryMessage, blockSize);
    let encryptedMessage = [];

    for (let i = 0; i < paddedMessage.length; i += blockSize) {
      const block = paddedMessage.slice(i, i + blockSize);
      const encryptedBlock = this.encryptBlock(block, ek);
      encryptedMessage = encryptedMessage.concat(encryptedBlock);
    }

    return new Uint8Array(encryptedMessage);
  },

  decrypt: function (encryptedMessage, key) {
    const ek = this.keySetup(stringToUint8Array(key));
    const blockSize = 16;
    let decryptedMessage = [];

    for (let i = 0; i < encryptedMessage.length; i += blockSize) {
      const block = encryptedMessage.slice(i, i + blockSize);
      const decryptedBlock = this.decryptBlock(block, ek);
      decryptedMessage = decryptedMessage.concat(decryptedBlock);
    }

    const unpaddedMessage = unpadMessage(new Uint8Array(decryptedMessage));
    return uint8ArrayToString(unpaddedMessage);
  },

  encryptString: function (message, key) {
    const encryptedBytes = this.encrypt(message, key);
    return uint8ArrayToHex(encryptedBytes);
  },

  decryptString: function (encryptedMessage, key) {
    const decryptedBytes = this.decrypt(hexToUint8Array(encryptedMessage), key);
    return decryptedBytes;
  },
};

// Преобразование строки в Uint8Array
function stringToUint8Array(str) {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// Преобразование Uint8Array в строку
function uint8ArrayToString(arr) {
  const decoder = new TextDecoder();
  return decoder.decode(arr);
}

// Преобразование Uint8Array в шестнадцатеричную строку
function uint8ArrayToHex(arr) {
  return Array.from(arr)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

// Преобразование шестнадцатеричной строки в Uint8Array
function hexToUint8Array(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return arr;
}

// Дополнение сообщения до длины, кратной blockSize (PKCS7)
function padMessage(message, blockSize) {
  const paddingLength = blockSize - (message.length % blockSize);
  const padding = new Uint8Array(paddingLength).fill(paddingLength);
  return concatUint8Arrays([message, padding]);
}

// Удаление дополнения (PKCS7)
function unpadMessage(message) {
  const paddingLength = message[message.length - 1];
  return message.slice(0, message.length - paddingLength);
}

// Конкатенация Uint8Array
function concatUint8Arrays(arrays) {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  arrays.forEach(arr => {
    result.set(arr, offset);
    offset += arr.length;
  });
  return result;
}

export default MacGuffin;