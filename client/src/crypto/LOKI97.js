const LOKI97 = {
  encrypt: (message, key) => {
      // Преобразуем сообщение и ключ в бинарные данные
      const binaryMessage = stringToUint8Array(message);
      const binaryKey = stringToUint8Array(key);

      // Генерация подключей
      const subkeys = generateSubkeys(binaryKey);

      // Шифрование данных
      const encryptedMessage = encryptData(binaryMessage, subkeys);

      // Возвращаем зашифрованное сообщение в виде строки
      return uint8ArrayToHex(encryptedMessage);
  },

  decrypt: (encryptedMessage, key) => {
      // Преобразуем зашифрованное сообщение и ключ в бинарные данные
      const binaryEncryptedMessage = hexToUint8Array(encryptedMessage);
      const binaryKey = stringToUint8Array(key);

      // Генерация подключей
      const subkeys = generateSubkeys(binaryKey);

      // Дешифрование данных
      const decryptedMessage = decryptData(binaryEncryptedMessage, subkeys);

      // Возвращаем расшифрованное сообщение в виде строки
      return uint8ArrayToString(decryptedMessage);
  },
};

// Генерация подключей
function generateSubkeys(key) {
  const subkeys = [];
  const keySchedule = initializeKeySchedule(key);

  // Генерация 48 подключей с использованием несбалансированной сети Фейстеля
  for (let i = 0; i < 48; i++) {
      const K1 = keySchedule[0];
      const K2 = keySchedule[1];
      const K3 = keySchedule[2];
      const K4 = keySchedule[3];

      const subkey = K1.slice(0, 8); // Каждый подключ — 8 байт
      subkeys.push(subkey);

      // Обновление ключевого расписания
      keySchedule[0] = K4;
      keySchedule[1] = K3;
      keySchedule[2] = K2;
      keySchedule[3] = xor(K1, fFunction(concatUint8Arrays([K1, K3, K2]), K4));
  }

  return subkeys;
}

// Инициализация ключевого расписания
function initializeKeySchedule(key) {
  const keySchedule = [];

  if (key.length === 16) {
      // 128-битный ключ
      keySchedule.push(key.slice(0, 8));
      keySchedule.push(key.slice(8, 16));
      keySchedule.push(fFunction(key.slice(8, 16), key.slice(0, 8)));
      keySchedule.push(fFunction(key.slice(0, 8), key.slice(8, 16)));
  } else if (key.length === 24) {
      // 192-битный ключ
      keySchedule.push(key.slice(0, 8));
      keySchedule.push(key.slice(8, 16));
      keySchedule.push(key.slice(16, 24));
      keySchedule.push(fFunction(key.slice(0, 8), key.slice(8, 16)));
  } else if (key.length === 32) {
      // 256-битный ключ
      keySchedule.push(key.slice(0, 8));
      keySchedule.push(key.slice(8, 16));
      keySchedule.push(key.slice(16, 24));
      keySchedule.push(key.slice(24, 32));
  } else {
      throw new Error('Invalid key length. Key must be 128, 192, or 256 bits.');
  }

  return keySchedule;
}

// Шифрование данных
function encryptData(message, subkeys) {
  let L = message.slice(0, 8); // Левая половина
  let R = message.slice(8, 16); // Правая половина

  for (let i = 0; i < 16; i++) {
      const temp = R;
      R = concatUint8Arrays([L, xor(R, fFunction(concatUint8Arrays([R, subkeys[3 * i]]), subkeys[3 * i + 1]))]);
      L = temp;
  }

  return concatUint8Arrays([R, L]);
}

// Дешифрование данных
function decryptData(encryptedMessage, subkeys) {
  let L = encryptedMessage.slice(0, 8); // Левая половина
  let R = encryptedMessage.slice(8, 16); // Правая половина

  for (let i = 15; i >= 0; i--) {
      const temp = L;
      L = concatUint8Arrays([R, xor(L, fFunction(concatUint8Arrays([L, subkeys[3 * i]]), subkeys[3 * i + 1]))]);
      R = temp;
  }

  return concatUint8Arrays([R, L]);
}

// Нелинейная функция f
function fFunction(A, B) {
  // Реализация функции f, описанной в спецификации LOKI97
  const S1 = sBox1(A.slice(0, 4));
  const S2 = sBox2(A.slice(4, 8));
  const P = permutation(concatUint8Arrays([S1, S2]));
  return xor(P, B);
}

// S-box 1
function sBox1(input) {
  const x = uint8ArrayToNumber(input);
  const xInv = x ^ 0x1FFF; // Инвертирование входного значения
  const output = (xInv ** 3) % 0x2911; // Кубическая функция в GF(2^13)
  return numberToUint8Array(output, 4);
}

// S-box 2
function sBox2(input) {
  const x = uint8ArrayToNumber(input);
  const xInv = x ^ 0x7FF; // Инвертирование входного значения
  const output = (xInv ** 3) % 0xAA7; // Кубическая функция в GF(2^11)
  return numberToUint8Array(output, 4);
}

// Перестановка P
function permutation(input) {
  const output = new Uint8Array(8);
  const permTable = [
      56, 48, 40, 32, 24, 16, 8, 0,
      57, 49, 41, 33, 25, 17, 9, 1,
      58, 50, 42, 34, 26, 18, 10, 2,
      59, 51, 43, 35, 27, 19, 11, 3,
      60, 52, 44, 36, 28, 20, 12, 4,
      61, 53, 45, 37, 29, 21, 13, 5,
      62, 54, 46, 38, 30, 22, 14, 6,
      63, 55, 47, 39, 31, 23, 15, 7,
  ];

  for (let i = 0; i < 64; i++) {
      output[i] = input[permTable[i]];
  }

  return output;
}

// XOR двух Uint8Array
function xor(buffer1, buffer2) {
  const result = new Uint8Array(buffer1.length);
  for (let i = 0; i < buffer1.length; i++) {
      result[i] = buffer1[i] ^ buffer2[i];
  }
  return result;
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

// Преобразование Uint8Array в число
function uint8ArrayToNumber(arr) {
  let num = 0;
  for (let i = 0; i < arr.length; i++) {
      num = (num << 8) | arr[i];
  }
  return num;
}

// Преобразование числа в Uint8Array
function numberToUint8Array(num, length) {
  const arr = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
      arr[length - 1 - i] = (num >> (i * 8)) & 0xFF;
  }
  return arr;
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

export default LOKI97;