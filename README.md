# JSON Schema Validator

A JSON Schema Draft 7 validator built from scratch. Live error display with JSON Pointer paths, zero dependencies, no build step.

**Demo**: https://sen.ltd/portfolio/json-schema-validator/

## Features

- **Live validation** — validates on every keystroke (debounced 250ms)
- **JSON Pointer paths** — errors show exact location (e.g. `/user/email`)
- **Draft 7 keywords**: type, required, properties, items, minLength, maxLength, pattern, minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf, minItems, maxItems, uniqueItems, minProperties, maxProperties, enum, const, format, oneOf, anyOf, allOf, not, if/then/else, additionalProperties, patternProperties, dependencies, contains
- **Format validators**: email, uri, date, date-time, ipv4, ipv6, uuid, hostname, time
- **Example schemas**: User, Product, Config
- **Copy errors as JSON**
- **Japanese / English UI**
- **Dark / light theme**

## Usage

Open `index.html` in a browser, or run a local server:

```sh
npm run serve   # python3 -m http.server 8080
```

No npm install required — zero dependencies.

## Tests

```sh
node --test tests/validator.test.js
```

## License

MIT © 2026 SEN LLC (SEN 合同会社)

<!-- sen-publish:links -->
## Links

- 🌐 Demo: https://sen.ltd/portfolio/json-schema-validator/
- 📝 dev.to: https://dev.to/sendotltd/writing-a-json-schema-draft-7-validator-from-scratch-8de
<!-- /sen-publish:links -->
