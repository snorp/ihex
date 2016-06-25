import { WritableStreamBuffer } from 'stream-buffers';
import { readFile } from 'fs';

const LINE_START = ':';
const RECORD_TYPE_DATA = 0;
const RECORD_TYPE_END = 1;

const END_RECORD = ':00000001FF';

function createChecksum(buf) {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const val = buf.readUInt8(i);
    sum = (sum + val) % 256;
  }

  sum = ((sum ^ 0xff) + 1) % 256;
  return sum;
}

function validateLine(buf) {
  const expected = buf[buf.length - 1]; // last byte
  const sum = createChecksum(buf.slice(0, buf.length - 1));
  return sum === expected;
}

export function parseHexData(data) {
  const lines = data.toString().split('\n');

  let out = new WritableStreamBuffer();
  let expectAddress = 0;
  let haveEnd = false;

  for (const line of lines) {
    if (line[0] !== LINE_START) {
      throw new Error('Not a hex line!');
    }

    const buffer = new Buffer(line.trim().substring(1), 'hex');
    if (!validateLine(buffer)) {
      throw new Error('Failed checksum');
    }

    const count = buffer.readUInt8(0);
    const address = buffer.readUInt16BE(1);
    const recordType = buffer.readUInt8(3);
    const body = buffer.slice(4, 4 + count);

    if (count && address !== expectAddress) {
      throw new Error(`Expected sequential address ${expectAddress}, got ${address}`);
    }

    if (recordType === RECORD_TYPE_DATA) {
      out.write(body);
    } else if (recordType === RECORD_TYPE_END) {
      haveEnd = true;
      break;
    } else {
      throw new Error('Unknown record type: ' + recordType);
    }

    expectAddress += count;
  }

  if (!haveEnd) {
    throw new Error('Unexpected end of data');
  }

  return out.getContents();
}

export function parseHexFile(path) {
  return new Promise((resolve, reject) => {
    readFile(path, (err, data) => {
      if (err) {
        return reject(err);
      }

      try {
        resolve(parseHexData(data));
      } catch(e) {
        reject(e);
      }
    });
  });
}

export function writeHexData(input, chunkSize = 16) {
  let out = new WritableStreamBuffer();

  for (let offset = 0; offset < input.length; offset += chunkSize) {
    out.write(LINE_START);

    let lineStart = new Buffer(4);
    lineStart.writeUInt8(Math.min(chunkSize, input.length - offset), 0);
    lineStart.writeUInt16BE(offset, 1);
    lineStart.writeUInt8(0, 3);

    const line = Buffer.concat([lineStart, input.slice(offset, Math.min(input.length, offset + chunkSize))]);

    out.write(line.toString('hex'));
    out.write(createChecksum(line).toString(16));
    out.write('\n');
  }

  out.write(END_RECORD);

  return out.getContents().toString();
}