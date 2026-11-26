import fs from 'node:fs';
import zlib from 'node:zlib';

export interface ApkPartRange {
  filePath: string;
  size: number;
  start: number;
  end: number;
}

export interface ApkFileEntrySummary {
  name: string;
  detail: string;
  size: string;
}

export interface ParsedApkMetadata {
  packageName: string | null;
  versionName: string | null;
  versionCode: number | null;
  minSdkVersion: number | null;
  minAndroidLabel: string | null;
  fileCount: number | null;
  entries: ApkFileEntrySummary[] | null;
}

const EOCD_SIG = 0x06054b50;
const CD_SIG = 0x02014b50;
const LOCAL_FILE_SIG = 0x04034b50;

const RES_STRING_POOL_TYPE = 0x0001;
const RES_XML_TYPE = 0x0003;
const RES_XML_RESOURCE_MAP_TYPE = 0x0180;
const RES_XML_START_ELEMENT_TYPE = 0x0102;

const ATTR_RES_ID_VERSION_CODE = 0x0101021b;
const ATTR_RES_ID_VERSION_NAME = 0x0101021c;
const ATTR_RES_ID_MIN_SDK = 0x0101020c;

const SDK_TO_ANDROID_LABEL: Record<number, string> = {
  21: 'Android 5.0+',
  22: 'Android 5.1+',
  23: 'Android 6.0+',
  24: 'Android 7.0+',
  25: 'Android 7.1+',
  26: 'Android 8.0+',
  27: 'Android 8.1+',
  28: 'Android 9+',
  29: 'Android 10+',
  30: 'Android 11+',
  31: 'Android 12+',
  32: 'Android 12L+',
  33: 'Android 13+',
  34: 'Android 14+',
  35: 'Android 15+',
  36: 'Android 16+',
};

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

function readRangeFromParts(
  parts: ApkPartRange[],
  rangeStart: number,
  length: number,
): Buffer {
  if (length <= 0) return Buffer.alloc(0);
  const rangeEnd = rangeStart + length - 1;
  const out = Buffer.allocUnsafe(length);
  let outOffset = 0;

  for (const part of parts) {
    if (part.end < rangeStart || part.start > rangeEnd) continue;
    const localStart = Math.max(0, rangeStart - part.start);
    const localEnd = Math.min(part.size - 1, rangeEnd - part.start);
    const toRead = localEnd - localStart + 1;
    if (toRead <= 0) continue;

    const fd = fs.openSync(part.filePath, 'r');
    try {
      let totalRead = 0;
      while (totalRead < toRead) {
        const n = fs.readSync(
          fd,
          out,
          outOffset + totalRead,
          toRead - totalRead,
          localStart + totalRead,
        );
        if (n <= 0) break;
        totalRead += n;
      }
      outOffset += totalRead;
    } finally {
      fs.closeSync(fd);
    }
  }

  return outOffset === length ? out : out.subarray(0, outOffset);
}

function parseAxmlStringPool(buf: Buffer, offset: number, chunkSize: number): string[] {
  if (offset + 28 > buf.length) return [];
  const headerSize = buf.readUInt16LE(offset + 2);
  const stringCount = buf.readUInt32LE(offset + 8);
  const flags = buf.readUInt32LE(offset + 16);
  const stringsStart = buf.readUInt32LE(offset + 20);
  const isUtf8 = (flags & 0x0100) !== 0;

  const offsetsTableStart = offset + headerSize;
  const stringsDataBase = offset + stringsStart;
  const chunkEnd = Math.min(buf.length, offset + chunkSize);
  const strings: string[] = [];

  for (let i = 0; i < stringCount; i++) {
    const idxPos = offsetsTableStart + i * 4;
    if (idxPos + 4 > chunkEnd) break;
    const relOffset = buf.readUInt32LE(idxPos);
    let p = stringsDataBase + relOffset;
    if (p >= chunkEnd) {
      strings.push('');
      continue;
    }

    if (isUtf8) {
      // UTF-16 char length (varint, 1 or 2 bytes)
      const u16First = buf[p++];
      if ((u16First & 0x80) !== 0 && p < chunkEnd) {
        p++;
      }
      if (p >= chunkEnd) {
        strings.push('');
        continue;
      }
      // UTF-8 byte length (varint, 1 or 2 bytes)
      let byteLen = buf[p++];
      if ((byteLen & 0x80) !== 0 && p < chunkEnd) {
        byteLen = ((byteLen & 0x7f) << 8) | buf[p++];
      }
      const end = Math.min(chunkEnd, p + byteLen);
      strings.push(buf.toString('utf8', p, end));
    } else {
      if (p + 2 > chunkEnd) {
        strings.push('');
        continue;
      }
      let charLen = buf.readUInt16LE(p);
      p += 2;
      if ((charLen & 0x8000) !== 0 && p + 2 <= chunkEnd) {
        charLen = ((charLen & 0x7fff) << 16) | buf.readUInt16LE(p);
        p += 2;
      }
      const end = Math.min(chunkEnd, p + charLen * 2);
      strings.push(buf.toString('utf16le', p, end));
    }
  }

  return strings;
}

function parseAndroidManifestAxml(buf: Buffer): {
  packageName: string | null;
  versionName: string | null;
  versionCode: number | null;
  minSdkVersion: number | null;
} {
  if (buf.length < 8) {
    return { packageName: null, versionName: null, versionCode: null, minSdkVersion: null };
  }

  const rootType = buf.readUInt16LE(0);
  if (rootType !== RES_XML_TYPE) {
    return { packageName: null, versionName: null, versionCode: null, minSdkVersion: null };
  }

  const rootHeaderSize = buf.readUInt16LE(2);
  let pos = rootHeaderSize;
  let strings: string[] = [];
  let resourceIds: number[] = [];

  let packageName: string | null = null;
  let versionName: string | null = null;
  let versionCode: number | null = null;
  let minSdkVersion: number | null = null;

  while (pos + 8 <= buf.length) {
    const chunkType = buf.readUInt16LE(pos);
    const headerSize = buf.readUInt16LE(pos + 2);
    const chunkSize = buf.readUInt32LE(pos + 4);
    if (chunkSize < 8 || pos + chunkSize > buf.length) break;

    if (chunkType === RES_STRING_POOL_TYPE) {
      strings = parseAxmlStringPool(buf, pos, chunkSize);
    } else if (chunkType === RES_XML_RESOURCE_MAP_TYPE) {
      const count = Math.floor((chunkSize - headerSize) / 4);
      resourceIds = [];
      for (let i = 0; i < count; i++) {
        resourceIds.push(buf.readUInt32LE(pos + headerSize + i * 4));
      }
    } else if (chunkType === RES_XML_START_ELEMENT_TYPE) {
      const extPos = pos + headerSize;
      if (extPos + 20 <= pos + chunkSize) {
        const nameIdx = buf.readInt32LE(extPos + 4);
        const attrStart = buf.readUInt16LE(extPos + 8);
        const attrSize = buf.readUInt16LE(extPos + 10);
        const attrCount = buf.readUInt16LE(extPos + 12);
        const tagName = nameIdx >= 0 && nameIdx < strings.length ? strings[nameIdx] : '';

        const attrsBase = extPos + attrStart;
        for (let i = 0; i < attrCount; i++) {
          const aPos = attrsBase + i * attrSize;
          if (aPos + 20 > pos + chunkSize) break;
          const attrNameIdx = buf.readInt32LE(aPos + 4);
          const rawValueIdx = buf.readInt32LE(aPos + 8);
          const dataType = buf.readUInt8(aPos + 15);
          const data = buf.readInt32LE(aPos + 16);

          const attrName =
            attrNameIdx >= 0 && attrNameIdx < strings.length ? strings[attrNameIdx] : '';
          const attrResId =
            attrNameIdx >= 0 && attrNameIdx < resourceIds.length ? resourceIds[attrNameIdx] : 0;

          const getStringAttr = (): string | null => {
            if (dataType === 0x03 && data >= 0 && data < strings.length) {
              return strings[data];
            }
            if (rawValueIdx >= 0 && rawValueIdx < strings.length) {
              return strings[rawValueIdx];
            }
            return null;
          };

          const getIntAttr = (): number | null => {
            if (dataType === 0x10 || dataType === 0x11) {
              return data;
            }
            return null;
          };

          if (tagName === 'manifest') {
            if (attrName === 'package') {
              packageName = getStringAttr()?.trim() || packageName;
            } else if (attrName === 'versionName' || attrResId === ATTR_RES_ID_VERSION_NAME) {
              const rawVer = getStringAttr()?.trim() || '';
              if (rawVer) {
                versionName = rawVer.replace(/^v+/i, '');
              }
            } else if (attrName === 'versionCode' || attrResId === ATTR_RES_ID_VERSION_CODE) {
              versionCode = getIntAttr() ?? versionCode;
            }
          } else if (tagName === 'uses-sdk') {
            if (attrName === 'minSdkVersion' || attrResId === ATTR_RES_ID_MIN_SDK) {
              minSdkVersion = getIntAttr() ?? minSdkVersion;
            }
          }
        }
      }
    }

    pos += chunkSize;
  }

  return { packageName, versionName, versionCode, minSdkVersion };
}

export function inspectApkMetadata(
  parts: ApkPartRange[],
  totalSize: number,
): ParsedApkMetadata {
  const empty: ParsedApkMetadata = {
    packageName: null,
    versionName: null,
    versionCode: null,
    minSdkVersion: null,
    minAndroidLabel: null,
    fileCount: null,
    entries: null,
  };

  if (totalSize < 22 || parts.length === 0) {
    return empty;
  }

  try {
    // 1. Locate End of Central Directory (EOCD) in the last 65 KB
    const tailLen = Math.min(totalSize, 65557);
    const tailStart = totalSize - tailLen;
    const tail = readRangeFromParts(parts, tailStart, tailLen);

    let eocdOffset = -1;
    for (let i = tail.length - 22; i >= 0; i--) {
      if (tail.readUInt32LE(i) === EOCD_SIG) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset < 0) return empty;

    const totalEntries = tail.readUInt16LE(eocdOffset + 10);
    const cdSize = tail.readUInt32LE(eocdOffset + 12);
    const cdOffset = tail.readUInt32LE(eocdOffset + 16);

    if (
      cdOffset >= totalSize ||
      cdSize === 0 ||
      cdOffset + cdSize > totalSize ||
      cdSize > 32 * 1024 * 1024
    ) {
      return empty;
    }

    // 2. Read Central Directory & summarize entries
    const cdBuf = readRangeFromParts(parts, cdOffset, cdSize);
    let cursor = 0;
    let fileCount = 0;

    let dexSize = 0;
    let dexCount = 0;
    let arscSize = 0;
    let resSize = 0;
    let resCount = 0;
    let manifestSize = 0;
    let metaInfSize = 0;
    let metaInfCount = 0;
    let libSize = 0;
    let libCount = 0;

    let manifestEntry: {
      compression: number;
      compressedSize: number;
      localHeaderOffset: number;
    } | null = null;

    while (cursor + 46 <= cdBuf.length) {
      if (cdBuf.readUInt32LE(cursor) !== CD_SIG) break;

      const compression = cdBuf.readUInt16LE(cursor + 10);
      const compressedSize = cdBuf.readUInt32LE(cursor + 20);
      const uncompressedSize = cdBuf.readUInt32LE(cursor + 24);
      const nameLen = cdBuf.readUInt16LE(cursor + 28);
      const extraLen = cdBuf.readUInt16LE(cursor + 30);
      const commentLen = cdBuf.readUInt16LE(cursor + 32);
      const localHeaderOffset = cdBuf.readUInt32LE(cursor + 42);

      const nameStart = cursor + 46;
      if (nameStart + nameLen > cdBuf.length) break;
      const entryName = cdBuf.toString('utf8', nameStart, nameStart + nameLen);
      cursor += 46 + nameLen + extraLen + commentLen;

      if (entryName.endsWith('/')) continue;
      fileCount += 1;

      if (entryName === 'AndroidManifest.xml') {
        manifestSize = compressedSize || uncompressedSize;
        manifestEntry = { compression, compressedSize, localHeaderOffset };
      } else if (/^classes\d*\.dex$/.test(entryName)) {
        dexSize += compressedSize || uncompressedSize;
        dexCount += 1;
      } else if (entryName === 'resources.arsc') {
        arscSize = compressedSize || uncompressedSize;
      } else if (entryName.startsWith('res/')) {
        resSize += compressedSize || uncompressedSize;
        resCount += 1;
      } else if (entryName.startsWith('META-INF/')) {
        metaInfSize += compressedSize || uncompressedSize;
        metaInfCount += 1;
      } else if (entryName.startsWith('lib/')) {
        libSize += compressedSize || uncompressedSize;
        libCount += 1;
      }
    }

    const entries: ApkFileEntrySummary[] = [];
    if (dexCount > 0) {
      entries.push({
        name: dexCount === 1 ? 'classes.dex' : `classes*.dex (${dexCount} files)`,
        detail: 'Compiled Kotlin & Compose runtime bytecode',
        size: formatBytes(dexSize),
      });
    }
    if (arscSize > 0) {
      entries.push({
        name: 'resources.arsc',
        detail: 'Compiled string tables, theme palettes & styles',
        size: formatBytes(arscSize),
      });
    }
    if (resCount > 0) {
      entries.push({
        name: `res/ (${resCount} files)`,
        detail: 'Layouts, vector drawables, icons & XML resources',
        size: formatBytes(resSize),
      });
    }
    if (libCount > 0) {
      entries.push({
        name: `lib/ (${libCount} files)`,
        detail: 'Native ABI libraries bundled inside APK',
        size: formatBytes(libSize),
      });
    }
    if (manifestSize > 0) {
      entries.push({
        name: 'AndroidManifest.xml',
        detail: 'App version, permissions, deep links & guard services',
        size: formatBytes(manifestSize),
      });
    }
    if (metaInfCount > 0) {
      entries.push({
        name: `META-INF/ (${metaInfCount} files)`,
        detail: 'APK signing metadata & manifest digests',
        size: formatBytes(metaInfSize),
      });
    }

    // 3. Extract and parse AndroidManifest.xml if present
    let parsedManifest = {
      packageName: null as string | null,
      versionName: null as string | null,
      versionCode: null as number | null,
      minSdkVersion: null as number | null,
    };

    if (manifestEntry && manifestEntry.compressedSize > 0 && manifestEntry.compressedSize < 8 * 1024 * 1024) {
      const localHdr = readRangeFromParts(parts, manifestEntry.localHeaderOffset, 30);
      if (localHdr.length === 30 && localHdr.readUInt32LE(0) === LOCAL_FILE_SIG) {
        const lNameLen = localHdr.readUInt16LE(26);
        const lExtraLen = localHdr.readUInt16LE(28);
        const dataOffset = manifestEntry.localHeaderOffset + 30 + lNameLen + lExtraLen;
        const compressedBytes = readRangeFromParts(parts, dataOffset, manifestEntry.compressedSize);

        let xmlBytes: Buffer | null = null;
        if (manifestEntry.compression === 0) {
          xmlBytes = compressedBytes;
        } else if (manifestEntry.compression === 8) {
          xmlBytes = zlib.inflateRawSync(compressedBytes);
        }

        if (xmlBytes) {
          parsedManifest = parseAndroidManifestAxml(xmlBytes);
        }
      }
    }

    const minAndroidLabel =
      parsedManifest.minSdkVersion !== null
        ? SDK_TO_ANDROID_LABEL[parsedManifest.minSdkVersion] ||
          `Android SDK ${parsedManifest.minSdkVersion}+`
        : null;

    return {
      packageName: parsedManifest.packageName,
      versionName: parsedManifest.versionName,
      versionCode: parsedManifest.versionCode,
      minSdkVersion: parsedManifest.minSdkVersion,
      minAndroidLabel,
      fileCount: fileCount || totalEntries || null,
      entries: entries.length > 0 ? entries : null,
    };
  } catch {
    return empty;
  }
}
