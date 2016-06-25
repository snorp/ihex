'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseHexData = parseHexData;
exports.parseHexFile = parseHexFile;
exports.writeHexData = writeHexData;

var _streamBuffers = require('stream-buffers');

var _fs = require('fs');

var LINE_START = ':';
var RECORD_TYPE_DATA = 0;
var RECORD_TYPE_END = 1;

var END_RECORD = ':00000001FF';

function createChecksum(buf) {
  var sum = 0;
  for (var i = 0; i < buf.length; i++) {
    var val = buf.readUInt8(i);
    sum = (sum + val) % 256;
  }

  sum = ((sum ^ 0xff) + 1) % 256;
  return sum;
}

function validateLine(buf) {
  var expected = buf[buf.length - 1]; // last byte
  var sum = createChecksum(buf.slice(0, buf.length - 1));
  return sum === expected;
}

function parseHexData(data) {
  var lines = data.toString().split('\n');

  var out = new _streamBuffers.WritableStreamBuffer();
  var expectAddress = 0;
  var haveEnd = false;

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = lines[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var line = _step.value;

      if (line[0] !== LINE_START) {
        throw new Error('Not a hex line!');
      }

      var buffer = new Buffer(line.trim().substring(1), 'hex');
      if (!validateLine(buffer)) {
        throw new Error('Failed checksum');
      }

      var count = buffer.readUInt8(0);
      var address = buffer.readUInt16BE(1);
      var recordType = buffer.readUInt8(3);
      var body = buffer.slice(4, 4 + count);

      if (count && address !== expectAddress) {
        throw new Error('Expected sequential address ' + expectAddress + ', got ' + address);
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
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  if (!haveEnd) {
    throw new Error('Unexpected end of data');
  }

  return out.getContents();
}

function parseHexFile(path) {
  return new Promise(function (resolve, reject) {
    (0, _fs.readFile)(path, function (err, data) {
      if (err) {
        return reject(err);
      }

      try {
        resolve(parseHexData(data));
      } catch (e) {
        reject(e);
      }
    });
  });
}

function writeHexData(input) {
  var chunkSize = arguments.length <= 1 || arguments[1] === undefined ? 16 : arguments[1];

  var out = new _streamBuffers.WritableStreamBuffer();

  for (var offset = 0; offset < input.length; offset += chunkSize) {
    out.write(LINE_START);

    var lineStart = new Buffer(4);
    lineStart.writeUInt8(Math.min(chunkSize, input.length - offset), 0);
    lineStart.writeUInt16BE(offset, 1);
    lineStart.writeUInt8(0, 3);

    var line = Buffer.concat([lineStart, input.slice(offset, Math.min(input.length, offset + chunkSize))]);

    out.write(line.toString('hex'));
    out.write(createChecksum(line).toString(16));
    out.write('\n');
  }

  out.write(END_RECORD);

  return out.getContents().toString();
}