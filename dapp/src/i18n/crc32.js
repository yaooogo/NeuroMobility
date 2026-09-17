const crcTable = new Uint32Array(256).map((_, index) => {
  let value = index;

  for (let i = 0; i < 8; i += 1) {
    value = (value & 1) !== 0 ? (value >>> 1) ^ 0xedb88320 : value >>> 1;
  }

  return value >>> 0;
});

export function crc32(input) {
  const data = new TextEncoder().encode(String(input));
  let crc = 0xffffffff;

  for (const byte of data) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }

  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}
