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
    classifiers: /(CL:((([\p{Unified_Ideograph}\u3006\u3007][\ufe00-\ufe0f\u{e0100}-\u{e01ef}]?){1,})?(\|([\p{Unified_Ideograph}\u3006\u3007][\ufe00-\ufe0f\u{e0100}-\u{e01ef}]?){1,})?(\[([^\]]*)\]),?)+)/gmu,
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
const pushVariantTo = (val, orig, lineToNum, arr, field) => {
    const valKey = `${val[0]}_${val[1]}_${val[2]}`
    if (
        !orig[field] // no hanzi in original value
        || (orig !== val && !arr[orig[field]] && (!orig[2] || !val[field] || !val[2])) // variant for non-existing field in array lacking necessary data
        || !val[field] // no hanzi in new value
        || !val[2] // no pinyin in new value
    ) return;

    arr[orig[field]] ??= {};
    arr[orig[field]][orig[2]] ??= [[], []];
    arr[orig[field]][orig[2]][val !== orig ? 1 : 0].push(lineToNum[valKey]);
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
        const lineToNum = {};
        const all = [];
        const traditional = {};
        const simplified = {};

        for (const line of lines) {
            const parsedLine = parseLine(line);
            if (!parsedLine || !parsedLine[0] || !parsedLine[1] || !parsedLine[2]) continue;

            const key = `${parsedLine[0]}_${parsedLine[1]}_${parsedLine[2]}`

            if (parsedLine[4].length) {
                variantQueue.push(parsedLine);
            }


            if (lineToNum[key] !== undefined) throw key;
            lineToNum[key] = all.length;
            pushVariantTo(parsedLine, parsedLine, lineToNum, traditional, 0);
            pushVariantTo(parsedLine, parsedLine, lineToNum, simplified, 1);
            all.push(parsedLine);
        }

        for (const parsedLine of variantQueue) {
            for (const original of parsedLine[4]) {
                pushVariantTo(parsedLine, original, lineToNum, traditional, 0);
                pushVariantTo(parsedLine, original, lineToNum, simplified, 1);
            }
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
        const [meanings, variant_of, classifiers] = Object.values(parseMeanings(splitLine[1]));
        const [chars, pinyinPart] = splitLine[0].split('[');
        const [traditional, simplified] = chars.trim().split(' ');
        const pinyin = pinyinPart.split(']')[0];

        return [ traditional, simplified, pinyin, meanings, variant_of, classifiers ];
    } catch (e) {
        console.error('Error parsing line:', e.stack || e);
        return null;
    }
};

// Parse meanings and variants
const parseMeanings = (input) => {
    const result = { meanings: [], variant_of: [], classifiers: [] };
    const variantMap = {};
    const classifierMap = {};

    for (const meaning of input.replace('\r', '').split('/')) {
        const trimmed = meaning.trim();
        if (!trimmed) continue;
        
        const variantMatches = trimmed.match(REGEX.variant_of);
        let skipMeaning = false;

        if (variantMatches) {
            if (variantMatches[0] === trimmed) skipMeaning = true;
            const variant = variantMatches[0].substring(11);
            const parsed = parseVariant(variant);
            if (!parsed) continue;
            const key = Object.values(parsed).join('');
            if (!variantMap[key]) {
                variantMap[key] = true;
                result.variant_of.push(parsed);
            }
        }
        const classifierMatches = trimmed.match(REGEX.classifiers);
        if (classifierMatches) {
            if (classifierMatches[0] === trimmed) skipMeaning = true;
            const classifiers = classifierMatches[0].substring(3).split(',');
            for (const classifier of classifiers) {
                const parsed = parseVariant(classifier);
                if (!parsed) continue;
                const key = Object.values(parsed).join('');
                if (!classifierMap[key]) {
                    classifierMap[key] = true;
                    result.classifiers.push(parsed);
                }
            }
        }

        if (!skipMeaning) {
            result.meanings.push(trimmed);
        }
    }

    return result;
};

// Parse a variant definition
const parseVariant = (input) => {
    if (!input || !input.length) return;
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
