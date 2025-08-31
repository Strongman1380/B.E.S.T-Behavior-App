// Minimal zip (store/no compression) generator for browser
// Usage: const blob = await createZip([{ name: 'a.csv', data: '...' }, ...])

function textEncoder() {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder()
  throw new Error('TextEncoder not available')
}

function toBytes(input) {
  if (input instanceof Uint8Array) return input
  return textEncoder().encode(String(input ?? ''))
}

// CRC32 implementation
function makeCrcTable() {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : (c >>> 1)
    table[n] = c >>> 0
  }
  return table
}
const CRC_TABLE = makeCrcTable()
function crc32(bytes) {
  let c = 0 ^ (-1)
  for (let i = 0; i < bytes.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ bytes[i]) & 0xFF]
  return (c ^ (-1)) >>> 0
}

function writeUint16LE(view, offset, value) {
  view.setUint16(offset, value & 0xFFFF, true)
}
function writeUint32LE(view, offset, value) {
  view.setUint32(offset, value >>> 0, true)
}

export async function createZip(files) {
  const entries = []
  let totalSize = 0
  // First pass: compute sizes
  for (const f of files) {
    const nameBytes = toBytes(f.name)
    const dataBytes = toBytes(f.data)
    const crc = crc32(dataBytes)
    const localHeaderSize = 30 + nameBytes.length
    const entry = {
      nameBytes,
      dataBytes,
      crc,
      localHeaderOffset: totalSize,
    }
    totalSize += localHeaderSize + dataBytes.length
    entries.push(entry)
  }
  // Central directory
  let centralDirSize = 0
  for (const e of entries) centralDirSize += 46 + e.nameBytes.length
  const endRecordSize = 22
  const totalLen = totalSize + centralDirSize + endRecordSize
  const buf = new ArrayBuffer(totalLen)
  const view = new DataView(buf)
  let offset = 0

  // Write local file headers + data
  for (let i = 0; i < files.length; i++) {
    const e = entries[i]
    // Local file header signature
    writeUint32LE(view, offset, 0x04034b50); offset += 4
    writeUint16LE(view, offset, 20); offset += 2 // version needed
    writeUint16LE(view, offset, 0); offset += 2 // flags
    writeUint16LE(view, offset, 0); offset += 2 // compression (store)
    writeUint16LE(view, offset, 0); offset += 2 // mod time
    writeUint16LE(view, offset, 0); offset += 2 // mod date
    writeUint32LE(view, offset, e.crc); offset += 4
    writeUint32LE(view, offset, e.dataBytes.length); offset += 4
    writeUint32LE(view, offset, e.dataBytes.length); offset += 4
    writeUint16LE(view, offset, e.nameBytes.length); offset += 2
    writeUint16LE(view, offset, 0); offset += 2 // extra len
    new Uint8Array(buf, offset, e.nameBytes.length).set(e.nameBytes); offset += e.nameBytes.length
    new Uint8Array(buf, offset, e.dataBytes.length).set(e.dataBytes); offset += e.dataBytes.length
  }

  const centralDirOffset = offset
  // Write central directory
  for (let i = 0; i < files.length; i++) {
    const e = entries[i]
    writeUint32LE(view, offset, 0x02014b50); offset += 4 // central file header
    writeUint16LE(view, offset, 20); offset += 2 // version made by
    writeUint16LE(view, offset, 20); offset += 2 // version needed
    writeUint16LE(view, offset, 0); offset += 2 // flags
    writeUint16LE(view, offset, 0); offset += 2 // compression
    writeUint16LE(view, offset, 0); offset += 2 // mod time
    writeUint16LE(view, offset, 0); offset += 2 // mod date
    writeUint32LE(view, offset, e.crc); offset += 4
    writeUint32LE(view, offset, e.dataBytes.length); offset += 4
    writeUint32LE(view, offset, e.dataBytes.length); offset += 4
    writeUint16LE(view, offset, e.nameBytes.length); offset += 2
    writeUint16LE(view, offset, 0); offset += 2 // extra
    writeUint16LE(view, offset, 0); offset += 2 // comment
    writeUint16LE(view, offset, 0); offset += 2 // disk start
    writeUint16LE(view, offset, 0); offset += 2 // int attrs
    writeUint32LE(view, offset, 0); offset += 4 // ext attrs
    writeUint32LE(view, offset, e.localHeaderOffset); offset += 4
    new Uint8Array(buf, offset, e.nameBytes.length).set(e.nameBytes); offset += e.nameBytes.length
  }

  const centralDirSizeWritten = offset - centralDirOffset
  // End of central directory
  writeUint32LE(view, offset, 0x06054b50); offset += 4
  writeUint16LE(view, offset, 0); offset += 2 // disk
  writeUint16LE(view, offset, 0); offset += 2 // disk start
  writeUint16LE(view, offset, files.length); offset += 2
  writeUint16LE(view, offset, files.length); offset += 2
  writeUint32LE(view, offset, centralDirSizeWritten); offset += 4
  writeUint32LE(view, offset, centralDirOffset); offset += 4
  writeUint16LE(view, offset, 0); offset += 2 // comment len

  return new Blob([buf], { type: 'application/zip' })
}
