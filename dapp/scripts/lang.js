import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const srcDir = path.join(rootDir, "src");
const localesDir = path.join(srcDir, "i18n", "locales");

// These keys are resolved dynamically by the Launchpad pages, so the regular
// lang("...") scanner cannot discover all of them by itself.
const preservedTexts = [
  "普通会员",
  "区域合伙人",
  "城市合伙人",
  "战略合伙人"
];

const seedEn = {
 
};

const insuranceLocaleSeeds = {
  
};

const stakingLocaleSeeds = {
  
};

function buildCrcTable() {
  const table = [];

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let i = 0; i < 8; i += 1) {
      value = (value & 1) !== 0 ? (value >>> 1) ^ 0xedb88320 : value >>> 1;
    }

    table[index] = value >>> 0;
  }

  return table;
}

const crcTable = buildCrcTable();

function crc32(input) {
  const bytes = new TextEncoder().encode(String(input));
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }

  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}

function walk(dirPath) {
  return fs.readdirSync(dirPath, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (fullPath.startsWith(localesDir)) {
        return [];
      }

      return walk(fullPath);
    }

    if (!/\.(vue|js)$/.test(entry.name)) {
      return [];
    }

    return [fullPath];
  });
}

function extractTexts(content) {
  const matches = [];
  const pattern = /lang\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*)\1\s*\)/g;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const value = match[2]
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, "\"")
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, "\\");

    matches.push(value);
  }

  return matches;
}

function loadLocale(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const source = fs.readFileSync(filePath, "utf8");
  const pairs = [...source.matchAll(/"([0-9a-f]{8})":\s*"((?:\\.|[^"])*)"/g)];

  return Object.fromEntries(
    pairs.map(([, key, value]) => [
      key,
      value
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, "\"")
        .replace(/\\\\/g, "\\")
    ])
  );
}

function serializeLocale(locale) {
  const lines = Object.entries(locale)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `  "${key}": ${JSON.stringify(value)}`);

  return `export default {\n${lines.join(",\n")}\n};\n`;
}

function hasLocaleValue(locale, key) {
  return Object.prototype.hasOwnProperty.call(locale, key);
}

function getLocaleCodes() {
  const defaultOrder = ["zh", "en", "id", "ko", "ja", "th", "hi", "vi"];
  const localeFiles = fs.existsSync(localesDir)
    ? fs.readdirSync(localesDir).filter((fileName) => /^[a-z]{2}\.js$/.test(fileName))
    : [];
  const localeCodes = new Set([
    ...defaultOrder,
    ...localeFiles.map((fileName) => fileName.replace(/\.js$/, ""))
  ]);

  return [...localeCodes].sort((a, b) => {
    const aIndex = defaultOrder.indexOf(a);
    const bIndex = defaultOrder.indexOf(b);

    if (aIndex >= 0 && bIndex >= 0) {
      return aIndex - bIndex;
    }

    if (aIndex >= 0) {
      return -1;
    }

    if (bIndex >= 0) {
      return 1;
    }

    return a.localeCompare(b);
  });
}

fs.mkdirSync(localesDir, { recursive: true });

const sourceFiles = walk(srcDir);
const sourceTexts = new Set(preservedTexts);

for (const filePath of sourceFiles) {
  const content = fs.readFileSync(filePath, "utf8");
  for (const text of extractTexts(content)) {
    sourceTexts.add(text);
  }
}

const localeCodes = getLocaleCodes();
const existingLocales = Object.fromEntries(
  localeCodes.map((code) => [code, loadLocale(path.join(localesDir, `${code}.js`))])
);
const nextLocales = Object.fromEntries(localeCodes.map((code) => [code, {}]));

for (const text of [...sourceTexts].sort((a, b) => a.localeCompare(b, "zh-Hans"))) {
  const key = crc32(text);

  for (const code of localeCodes) {
    const existingLocale = existingLocales[code] || {};
    const insuranceLocaleValue = insuranceLocaleSeeds[code]?.[text];

    if (insuranceLocaleValue) {
      nextLocales[code][key] = insuranceLocaleValue;
    } else if (stakingLocaleSeeds[code]?.[text]) {
      nextLocales[code][key] = stakingLocaleSeeds[code][text];
    } else if (hasLocaleValue(existingLocale, key)) {
      nextLocales[code][key] = existingLocale[key];
    } else if (code === "zh") {
      nextLocales[code][key] = text;
    } else if (code === "en") {
      nextLocales[code][key] = stakingLocaleSeeds.en?.[text] || seedEn[text] || text;
    } else {
      nextLocales[code][key] = stakingLocaleSeeds[code]?.[text] || existingLocales.en?.[key] || stakingLocaleSeeds.en?.[text] || seedEn[text] || text;
    }
  }
}

for (const code of localeCodes) {
  fs.writeFileSync(path.join(localesDir, `${code}.js`), serializeLocale(nextLocales[code]), "utf8");
}

console.log(`Generated ${sourceTexts.size} language keys for ${localeCodes.length} locales: ${localeCodes.join(", ")}.`);
