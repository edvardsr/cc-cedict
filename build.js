import https from 'https';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { fileURLToPath } from 'url';
import path from 'path';

const cedictUrl = 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.zip';
const dataPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');

const PATHS = {
    status: path.join(dataPath, 'status.txt'),
    zipFile: path.join(dataPath, 'cedict.zip'),
    all: path.join(dataPath, 'all.json'),
    traditional: path.join(dataPath, 'traditional.json'),
    simplified: path.join(dataPath, 'simplified.json')
};

const REGEX = {
    line: /\/(.*)/s,
    variant_of: /(variant of (([\p{Unified_Ideograph}\u3006\u3007][\ufe00-\ufe0f\u{e0100}-\u{e01ef}]?){1,})?(\|([\p{Unified_Ideograph}\u3006\u3007][\ufe00-\ufe0f\u{e0100}-\u{e01ef}]?){1,})?(\[([^\]]*))?)/gmu,
    pinyin: /([A-Za-z\:]+[0-9])/g,
};

const VERSION = '1.0.0';

// Utility to ensure a directory exists
const ensureDirectoryExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// Downloads a file from the given URL
const downloadFile = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download '${url}' (status code: ${response.statusCode})`));
                return;
            }
            response.pipe(file);
        }).on('error', (err) => {
            reject(err);
        });

        file.on('finish', () => {
            file.close(() => resolve());
        });

        file.on('error', (err) => {
            fs.unlink(dest, () => reject(err)); // Cleanup if there’s an error
        });
    });
};

// Push a parsed variant into the data structure
const pushVariantTo = (val, orig, allIdx, arr, field) => {
    if (!orig[2]) return;

    arr[orig[field]] ??= {};
    arr[orig[field]][orig[2]] ??= [[], []];
    arr[orig[field]][orig[2]][val !== orig ? 1 : 0].push(allIdx);
};

// Extract and process the ZIP file
const extractAndProcessZip = (zipPath) => {
    try {
        const zip = new AdmZip(zipPath);
        const cedictEntry = zip.getEntry('cedict_ts.u8');

        if (!cedictEntry) {
            console.error('cedict_ts.u8 not found in the ZIP file');
            return;
        }

        const cedictData = cedictEntry.getData().toString('utf8');
        const lines = cedictData.split('\n');
        const variantQueue = [];
        const all = [];
        const traditional = {};
        const simplified = {};

        for (const line of lines) {
            const parsedLine = parseLine(line);
            if (!parsedLine) continue;

            if (parsedLine[4].length) variantQueue.push(parsedLine);

            let skip = parsedLine[4].some(variant =>
                variant[2] === parsedLine[2] && (variant[0] === parsedLine[0] || variant[1] === parsedLine[1])
            );

            if (!skip) {
                pushVariantTo(parsedLine, parsedLine, all.length, traditional, 0);
                pushVariantTo(parsedLine, parsedLine, all.length, simplified, 1);
                all.push(parsedLine);
            }
        }

        for (const parsedLine of variantQueue) {
            for (const original of parsedLine[4]) {
                pushVariantTo(parsedLine, original, all.length, traditional, 0);
                pushVariantTo(parsedLine, original, all.length, simplified, 1);
            }
            all.push(parsedLine);
        }

        fs.writeFileSync(PATHS.all, JSON.stringify(all));
        fs.writeFileSync(PATHS.traditional, JSON.stringify(traditional));
        fs.writeFileSync(PATHS.simplified, JSON.stringify(simplified));
    } catch (err) {
        console.error('Error processing ZIP file:', err.stack || err);
    }
};

// Parse a single line of the dictionary
const parseLine = (line) => {
    line = line.trim();
    if (!line || line.startsWith('#')) return null;

    const splitLine = line.split(REGEX.line);
    if (!splitLine || splitLine.length < 2) return null;

    try {
        const [meanings, variant_of] = Object.values(parseMeanings(splitLine[1]));
        const [chars, pinyinPart] = splitLine[0].split('[');
        const [traditional, simplified] = chars.trim().split(' ');
        const pinyin = pinyinPart.split(']')[0];

        return [ traditional, simplified, pinyin, meanings, variant_of ];
    } catch (e) {
        console.error('Error parsing line:', e.stack || e);
        return null;
    }
};

// Parse meanings and variants
const parseMeanings = (input) => {
    const result = { meanings: [], variant_of: [] };
    const variantMap = {};

    for (const meaning of input.replace('\r', '').split('/')) {
        const trimmed = meaning.trim();
        if (!trimmed) continue;

        const variantMatches = trimmed.match(REGEX.variant_of);
        if (variantMatches) {
            for (const variant of variantMatches) {
                const parsed = parseVariant(variant.substring(11));
                const key = Object.values(parsed).join('');
                if (!variantMap[key]) {
                    variantMap[key] = true;
                    result.variant_of.push(parsed);
                }
            }
        }

        result.meanings.push(trimmed);
    }

    return result;
};

// Parse a variant definition
const parseVariant = (input) => {
    const [chars, pinyinPart] = input.split('[');
    const [simplified, traditional] = chars.split('|');
    const pinyin = pinyinPart?.match(REGEX.pinyin)?.join(' ') || null;

    return [ simplified, traditional || simplified, pinyin ];
};

// Main entry point
const main = async () => {
    try {
        ensureDirectoryExists(dataPath);

        if (!fs.existsSync(PATHS.status)) {
            console.log('Downloading CC-CEDICT...');
            let success = false;

            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    await downloadFile(cedictUrl, PATHS.zipFile);
                    success = true;
                    break;
                } catch (err) {
                    console.error(`Download attempt ${attempt} failed:`, err);
                }
            }

            try {
                if (!success) throw 'Failed to download CC-CEDICT';

                console.log('Parsing CC-CEDICT data...');
                extractAndProcessZip(PATHS.zipFile);
    
                console.log('Removing raw CC-CEDICT files...');
                fs.unlinkSync(PATHS.zipFile);
                fs.writeFileSync(PATHS.status, `1|${VERSION}|${new Date().toISOString()}`);
            } catch (e) {
                console.error(`${e}. Using fallback CC-CEDICT data processed at package upload time...`);
                fs.unlinkSync(PATHS.zipFile);
                fs.writeFileSync(PATHS.status, `0|${VERSION}|${new Date().toISOString()}`);
                return;
            }
        }

        console.log('CC-CEDICT setup complete!');
    } catch (err) {
        console.error('Error in main execution:', err.stack || err);
    }
};

main();
