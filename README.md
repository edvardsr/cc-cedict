# cc-cedict

**cc-cedict** is a helper library for working with the [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) Chinese-English dictionary. It provides tools for retrieving words and definitions in both simplified and traditional Chinese, as well as processing variants and pinyin.

## Features

- Definition retrieval by simplified or traditional Chinese characters.
- Support for handling pinyin and word variants.
- Support for handling classifiers.
- Efficient access thanks to pre-mapping entries.
- Built-in functions for case-sensitive pinyin matching and definition merging.

## Installation

Install via NPM:

```bash
npm install cc-cedict
```

On installation a postinstall script is run that attempts to download the latest CC-CEDICT dictionary and rebuild the dictionary data based on it. If it fails, the package falls back to CC-CEDICT data processed at build time.

The rationale behind the postinstall script is so that package users could always have fresh CC-CEDICT data without depending on a new version of this package being released. This can be especially important if the package isn't updated for a long time, while CC-CEDICT on the other hand is [constantly updated](https://cc-cedict.org/editor/editor.php?handler=ListChanges).

## Usage

### Basic Usage

```javascript
import cedict from 'cc-cedict';

// Retrieve a word by its simplified form
cedict.getBySimplified('中国');

// Retrieve a word by its traditional form
cedict.getByTraditional('中國');

// Retrieve a word by its pinyin
// Pinyin is space separated and with tones 1 - 5, where 5 is the neutral tone. Only exact matches are supported.
cedict.getByTraditional('前邊', "qian2 bian5");

// Disable case sensitive search
cedict.getByTraditional('前邊', "QIAN2 bian5", { caseSensitiveSearch: false });

// Retrieve a word by its pinyin and merge results from different cases
cedict.getByTraditional('張', null, { mergeCases: true });

// Return results as an array
cedict.getBySimplified('只', null, { asObject: false });

// Do not return variants
cedict.getBySimplified('家具', null, { allowVariants: false });
```

### Advanced Options

Both `getBySimplified` and `getByTraditional` support configuration overrides using a JSON object:

```javascript
const result = cedict.getBySimplified('你好', pinyin, configOverrides);
```

The keys supported by the config overrides object are:

- `caseSensitiveSearch`: Whether pinyin search is case-sensitive (default: `true`).
- `mergeCases`: Merge pinyin cases in results by converting them to lowercase (default: `false`). An example of this is 張 (zhang1/Zhang1) - CC-CEDICT separates the capitalized pinyin into a separate entry, this option decides whether they should be merged or be separate. If they are merged, definitions from the lowercase definition go first.
- `asObject`: Return results as an object (pinyin -> definitions) instead of an array (default: `true`).
- `allowVariants`: Include word variants in the results (default: `true`).

### Example Outputs

```javascript
// general example
cedict.getBySimplified('中国');
```
```json
{
  "Zhong1 guo2": [
    {
      "traditional": "中國",
      "simplified": "中国",
      "pinyin": "Zhong1 guo2",
      "english": [
        "China"
      ],
      "classifiers": [],
      "variant_of": [],
      "is_variant": false
    }
  ]
}
```

```javascript
// Example for case sensitive search being disabled and pinyin search
cedict.getByTraditional('前邊', "QIAN2 bian5", { caseSensitiveSearch: false });
```
```json
{
  "qian2 bian5": [
    {
      "traditional": "前邊",
      "simplified": "前边",
      "pinyin": "qian2 bian5",
      "english": [
        "front",
        "the front side",
        "in front of"
      ],
      "classifiers": [],
      "variant_of": [],
      "is_variant": false
    },
    {
      "traditional": "前邊兒",
      "simplified": "前边儿",
      "pinyin": "qian2 bian5 r5",
      "english": [
        "erhua variant of 前邊|前边[qian2 bian5]"
      ],
      "classifiers": [],
      "variant_of": [
        {
          "traditional": "前邊",
          "simplified": "前边",
          "pinyin": "qian2 bian5"
        }
      ],
      "is_variant": true
    }
  ]
}
```

```javascript
// Example for cases not being merged, default behavior
cedict.getByTraditional('張');
```
```json
{
  "zhang1": [
    {
      "traditional": "張",
      "simplified": "张",
      "pinyin": "zhang1",
      "english": [
        "to open up",
        "to spread",
        "sheet of paper",
        "classifier for flat objects, sheet",
        "classifier for votes"
      ],
      "classifiers": [],
      "variant_of": [],
      "is_variant": false
    }
  ],
  "Zhang1": [
    {
      "traditional": "張",
      "simplified": "张",
      "pinyin": "Zhang1",
      "english": [
        "surname Zhang"
      ],
      "classifiers": [],
      "variant_of": [],
      "is_variant": false
    }
  ]
}
```

```javascript
// Example for case merging
cedict.getByTraditional('張', null, { mergeCases: true });
```
```json
{
  "zhang1": [
    {
      "traditional": "張",
      "simplified": "张",
      "pinyin": "zhang1",
      "english": [
        "to open up",
        "to spread",
        "sheet of paper",
        "classifier for flat objects, sheet",
        "classifier for votes",
        "surname Zhang"
      ],
      "classifiers": [],
      "variant_of": [],
      "is_variant": false
    }
  ]
}
```

```javascript
// Example for returning results as an array
cedict.getByTraditional('張', null, { asObject: false });
```
```json
[
  {
    "traditional": "張",
    "simplified": "张",
    "pinyin": "zhang1",
    "english": [
      "to open up",
      "to spread",
      "sheet of paper",
      "classifier for flat objects, sheet",
      "classifier for votes"
    ],
    "classifiers": [],
    "variant_of": [],
    "is_variant": false
  },
  {
    "traditional": "張",
    "simplified": "张",
    "pinyin": "Zhang1",
    "english": [
      "surname Zhang"
    ],
    "classifiers": [],
    "variant_of": [],
    "is_variant": false
  }
]
```

```javascript
// Example for variants in output
cedict.getBySimplified('家具');
```
```json
{
  "jia1 ju4": [
    {
      "traditional": "家具",
      "simplified": "家具",
      "pinyin": "jia1 ju4",
      "english": [
        "furniture"
      ],
      "classifiers": [
        [
          "件",
          "件",
          "jian4"
        ],
        [
          "套",
          "套",
          "tao4"
        ]
      ],
      "variant_of": [],
      "is_variant": false
    },
    {
      "traditional": "傢俱",
      "simplified": "家俱",
      "pinyin": "jia1 ju4",
      "english": [
        "variant of 家具[jia1 ju4]"
      ],
      "classifiers": [],
      "variant_of": [
        {
          "traditional": "家具",
          "simplified": "家具",
          "pinyin": "jia1 ju4"
        }
      ],
      "is_variant": true
    },
    {
      "traditional": "傢具",
      "simplified": "傢具",
      "pinyin": "jia1 ju4",
      "english": [
        "variant of 家具[jia1 ju4]"
      ],
      "classifiers": [],
      "variant_of": [
        {
          "traditional": "家具",
          "simplified": "家具",
          "pinyin": "jia1 ju4"
        }
      ],
      "is_variant": true
    },
    {
      "traditional": "家俱",
      "simplified": "家俱",
      "pinyin": "jia1 ju4",
      "english": [
        "variant of 家具[jia1 ju4]"
      ],
      "classifiers": [],
      "variant_of": [
        {
          "traditional": "家具",
          "simplified": "家具",
          "pinyin": "jia1 ju4"
        }
      ],
      "is_variant": true
    }
  ]
}
```

```javascript
// Example for variants being omitted from the output
cedict.getBySimplified('家具', null, { allowVariants: false });
```
```json
{
  "jia1 ju4": [
    {
      "traditional": "家具",
      "simplified": "家具",
      "pinyin": "jia1 ju4",
      "english": [
        "furniture"
      ],
      "classifiers": [
        [
          "件",
          "件",
          "jian4"
        ],
        [
          "套",
          "套",
          "tao4"
        ]
      ],
      "variant_of": [],
      "is_variant": false
    }
  ]
}
```

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request on [GitHub](https://github.com/edvardsr/cc-cedict).

## License

This project is licensed under the MIT License.