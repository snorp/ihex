var ihex = require('../lib');
var fs = require('fs');

var expect = require('chai').expect;

describe('ihex', function() {
  it('should parse the file', function() {
    return ihex.parseHexFile('test/valid.hex').then(data => {
      expect(data.length).to.equal(48);
    });
  });

  it('should fail due to crc error', function() {
    return ihex.parseHexFile('test/crc-error.hex').then(() => {
      throw new Error('Expected CRC validation failure');
    }, err => {
      return true;
    });
  });

  it('should fail due to unexpected end of data', function() {
    return ihex.parseHexFile('test/unexpected-end.hex').then(() => {
      throw new Error('Expected failure due to unterminated file');
    }, err => {
      return true;
    });
  });

  it('should fail due to invalid formatting', function() {
    return ihex.parseHexFile('test/invalid.hex').then(() => {
      throw new Error('Expected failure due to invalid formatting');
    }, err => {
      return true;
    });
  });

  it('should fail due to non-sequential records', function() {
    return ihex.parseHexFile('test/non-sequential.hex').then(() => {
      throw new Error('Expected failure due to non-sequential records');
    }, err => {
      return true;
    });
  });

  it('should fail due to unknown record type', function() {
    return ihex.parseHexFile('test/unknown-record.hex').then(() => {
      throw new Error('Expected failure due to unknown record type');
    }, err => {
      return true;
    });
  });

  it('should encode data correctly', function() {
    return ihex.parseHexFile('test/valid.hex').then(originalData => {
      const hex = ihex.writeHexData(originalData);
      const newData = ihex.parseHexData(hex);

      expect(newData.length).to.equal(originalData.length);
      for (var i = 0; i < originalData.length; i++) {
        expect(originalData[i]).to.equal(newData[i]);
      }
    });
  });

  it('should encode with larger chunk size', function() {
    return ihex.parseHexFile('test/valid.hex').then(originalData => {
      const hex = ihex.writeHexData(originalData, 64);
      const newData = ihex.parseHexData(hex);

      expect(newData.length).to.equal(originalData.length);
      for (var i = 0; i < originalData.length; i++) {
        expect(originalData[i]).to.equal(newData[i]);
      }
    });
  });

  it('should encode with smaller chunk size', function() {
    return ihex.parseHexFile('test/valid.hex').then(originalData => {
      const hex = ihex.writeHexData(originalData, 4);
      const newData = ihex.parseHexData(hex);

      expect(newData.length).to.equal(originalData.length);
      for (var i = 0; i < originalData.length; i++) {
        expect(originalData[i]).to.equal(newData[i]);
      }
    });
  });
});