/**
 * Tests for JSON Schema validator.
 * Run: node --test tests/validator.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validate, typeOf, validateType, deepEqual } from '../src/validator.js';
import { isValidFormat } from '../src/formats.js';

// ─── typeOf ───────────────────────────────────────────────────────────────────
describe('typeOf', () => {
  it('returns null for null', () => assert.equal(typeOf(null), 'null'));
  it('returns array for arrays', () => assert.equal(typeOf([]), 'array'));
  it('returns object for objects', () => assert.equal(typeOf({}), 'object'));
  it('returns string', () => assert.equal(typeOf('hi'), 'string'));
  it('returns number', () => assert.equal(typeOf(3.14), 'number'));
  it('returns boolean', () => assert.equal(typeOf(true), 'boolean'));
});

// ─── validateType ─────────────────────────────────────────────────────────────
describe('validateType', () => {
  it('accepts integer for type integer', () => assert.ok(validateType(5, 'integer')));
  it('rejects float for type integer', () => assert.ok(!validateType(5.5, 'integer')));
  it('accepts array type', () => assert.ok(validateType([], 'array')));
  it('accepts null type', () => assert.ok(validateType(null, 'null')));
  it('accepts multi-type array', () => assert.ok(validateType('x', ['string', 'number'])));
});

// ─── deepEqual ────────────────────────────────────────────────────────────────
describe('deepEqual', () => {
  it('primitives equal', () => assert.ok(deepEqual(1, 1)));
  it('primitives not equal', () => assert.ok(!deepEqual(1, 2)));
  it('arrays equal', () => assert.ok(deepEqual([1, 2], [1, 2])));
  it('arrays not equal length', () => assert.ok(!deepEqual([1], [1, 2])));
  it('objects equal', () => assert.ok(deepEqual({ a: 1 }, { a: 1 })));
  it('objects not equal', () => assert.ok(!deepEqual({ a: 1 }, { a: 2 })));
  it('null equals null', () => assert.ok(deepEqual(null, null)));
  it('null not equal object', () => assert.ok(!deepEqual(null, {})));
});

// ─── type keyword ─────────────────────────────────────────────────────────────
describe('validate — type', () => {
  it('passes string', () => {
    assert.deepEqual(validate({ type: 'string' }, 'hello'), []);
  });
  it('fails string → number', () => {
    const errs = validate({ type: 'string' }, 42);
    assert.equal(errs.length, 1);
    assert.equal(errs[0].keyword, 'type');
  });
  it('passes integer', () => {
    assert.deepEqual(validate({ type: 'integer' }, 5), []);
  });
  it('fails float for integer', () => {
    const errs = validate({ type: 'integer' }, 5.5);
    assert.equal(errs[0].keyword, 'type');
  });
  it('passes null type', () => {
    assert.deepEqual(validate({ type: 'null' }, null), []);
  });
  it('passes boolean', () => {
    assert.deepEqual(validate({ type: 'boolean' }, false), []);
  });
  it('passes object', () => {
    assert.deepEqual(validate({ type: 'object' }, {}), []);
  });
  it('passes array', () => {
    assert.deepEqual(validate({ type: 'array' }, []), []);
  });
  it('multi-type passes', () => {
    assert.deepEqual(validate({ type: ['string', 'null'] }, null), []);
  });
});

// ─── required ─────────────────────────────────────────────────────────────────
describe('validate — required', () => {
  it('passes when all required present', () => {
    assert.deepEqual(validate({ required: ['a', 'b'] }, { a: 1, b: 2 }), []);
  });
  it('fails when required missing', () => {
    const errs = validate({ required: ['a', 'b'] }, { a: 1 });
    assert.equal(errs.length, 1);
    assert.equal(errs[0].keyword, 'required');
    assert.ok(errs[0].path.endsWith('/b'));
  });
  it('path is correct', () => {
    const errs = validate({ type: 'object', required: ['name'] }, {});
    assert.equal(errs[0].path, '/name');
  });
});

// ─── properties ───────────────────────────────────────────────────────────────
describe('validate — properties', () => {
  it('passes valid nested object', () => {
    const schema = {
      type: 'object',
      properties: { name: { type: 'string' }, age: { type: 'integer' } }
    };
    assert.deepEqual(validate(schema, { name: 'Alice', age: 30 }), []);
  });
  it('fails nested type mismatch', () => {
    const schema = {
      type: 'object',
      properties: { age: { type: 'integer' } }
    };
    const errs = validate(schema, { age: 'old' });
    assert.equal(errs.length, 1);
    assert.equal(errs[0].path, '/age');
    assert.equal(errs[0].keyword, 'type');
  });
  it('preserves nested path', () => {
    const schema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: { email: { type: 'string' } }
        }
      }
    };
    const errs = validate(schema, { user: { email: 123 } });
    assert.equal(errs[0].path, '/user/email');
  });
});

// ─── minLength / maxLength ────────────────────────────────────────────────────
describe('validate — string length', () => {
  it('minLength passes', () => assert.deepEqual(validate({ minLength: 3 }, 'abc'), []));
  it('minLength fails', () => {
    const errs = validate({ minLength: 5 }, 'hi');
    assert.equal(errs[0].keyword, 'minLength');
  });
  it('maxLength passes', () => assert.deepEqual(validate({ maxLength: 5 }, 'abc'), []));
  it('maxLength fails', () => {
    const errs = validate({ maxLength: 2 }, 'abc');
    assert.equal(errs[0].keyword, 'maxLength');
  });
});

// ─── pattern ─────────────────────────────────────────────────────────────────
describe('validate — pattern', () => {
  it('passes matching pattern', () => {
    assert.deepEqual(validate({ pattern: '^\\d+$' }, '123'), []);
  });
  it('fails non-matching pattern', () => {
    const errs = validate({ pattern: '^\\d+$' }, 'abc');
    assert.equal(errs[0].keyword, 'pattern');
  });
});

// ─── minimum / maximum ────────────────────────────────────────────────────────
describe('validate — numeric range', () => {
  it('minimum passes', () => assert.deepEqual(validate({ minimum: 0 }, 5), []));
  it('minimum fails', () => {
    const errs = validate({ minimum: 10 }, 5);
    assert.equal(errs[0].keyword, 'minimum');
  });
  it('maximum passes', () => assert.deepEqual(validate({ maximum: 100 }, 50), []));
  it('maximum fails', () => {
    const errs = validate({ maximum: 10 }, 50);
    assert.equal(errs[0].keyword, 'maximum');
  });
  it('exclusiveMinimum draft7 style', () => {
    const errs = validate({ exclusiveMinimum: 5 }, 5);
    assert.equal(errs[0].keyword, 'exclusiveMinimum');
    assert.deepEqual(validate({ exclusiveMinimum: 5 }, 6), []);
  });
  it('exclusiveMaximum draft7 style', () => {
    const errs = validate({ exclusiveMaximum: 10 }, 10);
    assert.equal(errs[0].keyword, 'exclusiveMaximum');
  });
  it('multipleOf passes', () => assert.deepEqual(validate({ multipleOf: 5 }, 10), []));
  it('multipleOf fails', () => {
    const errs = validate({ multipleOf: 5 }, 7);
    assert.equal(errs[0].keyword, 'multipleOf');
  });
});

// ─── items ────────────────────────────────────────────────────────────────────
describe('validate — array items', () => {
  it('passes valid items', () => {
    assert.deepEqual(validate({ type: 'array', items: { type: 'number' } }, [1, 2, 3]), []);
  });
  it('fails invalid item', () => {
    const errs = validate({ items: { type: 'number' } }, [1, 'two', 3]);
    assert.equal(errs.length, 1);
    assert.equal(errs[0].path, '/1');
  });
  it('minItems fails', () => {
    const errs = validate({ minItems: 3 }, [1, 2]);
    assert.equal(errs[0].keyword, 'minItems');
  });
  it('maxItems fails', () => {
    const errs = validate({ maxItems: 2 }, [1, 2, 3]);
    assert.equal(errs[0].keyword, 'maxItems');
  });
  it('uniqueItems fails on duplicate', () => {
    const errs = validate({ uniqueItems: true }, [1, 2, 1]);
    assert.equal(errs[0].keyword, 'uniqueItems');
  });
  it('uniqueItems passes distinct', () => {
    assert.deepEqual(validate({ uniqueItems: true }, [1, 2, 3]), []);
  });
});

// ─── enum ────────────────────────────────────────────────────────────────────
describe('validate — enum', () => {
  it('passes value in enum', () => {
    assert.deepEqual(validate({ enum: ['a', 'b', 'c'] }, 'b'), []);
  });
  it('fails value not in enum', () => {
    const errs = validate({ enum: ['a', 'b'] }, 'c');
    assert.equal(errs[0].keyword, 'enum');
  });
});

// ─── const ───────────────────────────────────────────────────────────────────
describe('validate — const', () => {
  it('passes matching const', () => {
    assert.deepEqual(validate({ const: 42 }, 42), []);
  });
  it('fails non-matching const', () => {
    const errs = validate({ const: 42 }, 43);
    assert.equal(errs[0].keyword, 'const');
  });
  it('const works with objects', () => {
    assert.deepEqual(validate({ const: { a: 1 } }, { a: 1 }), []);
  });
});

// ─── format ──────────────────────────────────────────────────────────────────
describe('isValidFormat — email', () => {
  it('valid email', () => assert.ok(isValidFormat('user@example.com', 'email')));
  it('invalid email', () => assert.ok(!isValidFormat('not-an-email', 'email')));
});

describe('isValidFormat — uri', () => {
  it('valid uri', () => assert.ok(isValidFormat('https://example.com', 'uri')));
  it('invalid uri', () => assert.ok(!isValidFormat('not a uri', 'uri')));
});

describe('isValidFormat — date', () => {
  it('valid date', () => assert.ok(isValidFormat('2026-04-13', 'date')));
  it('invalid date month', () => assert.ok(!isValidFormat('2026-13-01', 'date')));
  it('invalid date day', () => assert.ok(!isValidFormat('2026-02-30', 'date')));
});

describe('isValidFormat — uuid', () => {
  it('valid uuid', () => assert.ok(isValidFormat('550e8400-e29b-41d4-a716-446655440000', 'uuid')));
  it('invalid uuid', () => assert.ok(!isValidFormat('not-a-uuid', 'uuid')));
});

describe('isValidFormat — ipv4', () => {
  it('valid ipv4', () => assert.ok(isValidFormat('192.168.1.1', 'ipv4')));
  it('invalid ipv4', () => assert.ok(!isValidFormat('999.168.1.1', 'ipv4')));
});

describe('validate — format integration', () => {
  it('fails invalid email format', () => {
    const errs = validate({ type: 'string', format: 'email' }, 'not-an-email');
    assert.equal(errs[0].keyword, 'format');
  });
  it('passes valid email format', () => {
    assert.deepEqual(validate({ type: 'string', format: 'email' }, 'user@example.com'), []);
  });
});

// ─── allOf ───────────────────────────────────────────────────────────────────
describe('validate — allOf', () => {
  it('passes when all subschemas valid', () => {
    const schema = { allOf: [{ minimum: 0 }, { maximum: 100 }] };
    assert.deepEqual(validate(schema, 50), []);
  });
  it('fails when one subschema fails', () => {
    const schema = { allOf: [{ minimum: 0 }, { maximum: 10 }] };
    const errs = validate(schema, 50);
    assert.ok(errs.length > 0);
  });
});

// ─── anyOf ───────────────────────────────────────────────────────────────────
describe('validate — anyOf', () => {
  it('passes when one subschema valid', () => {
    const schema = { anyOf: [{ type: 'string' }, { type: 'number' }] };
    assert.deepEqual(validate(schema, 42), []);
    assert.deepEqual(validate(schema, 'hi'), []);
  });
  it('fails when no subschema valid', () => {
    const schema = { anyOf: [{ type: 'string' }, { type: 'number' }] };
    const errs = validate(schema, null);
    assert.equal(errs[0].keyword, 'anyOf');
  });
});

// ─── oneOf ───────────────────────────────────────────────────────────────────
describe('validate — oneOf', () => {
  it('passes when exactly one matches', () => {
    const schema = { oneOf: [{ type: 'string' }, { type: 'number' }] };
    assert.deepEqual(validate(schema, 'hi'), []);
  });
  it('fails when zero match', () => {
    const schema = { oneOf: [{ type: 'string' }, { type: 'number' }] };
    const errs = validate(schema, null);
    assert.equal(errs[0].keyword, 'oneOf');
  });
  it('fails when two match', () => {
    const schema = { oneOf: [{ minimum: 0 }, { maximum: 100 }] };
    const errs = validate(schema, 50);
    assert.equal(errs[0].keyword, 'oneOf');
  });
});

// ─── not ────────────────────────────────────────────────────────────────────
describe('validate — not', () => {
  it('passes when not schema fails', () => {
    assert.deepEqual(validate({ not: { type: 'string' } }, 42), []);
  });
  it('fails when not schema passes', () => {
    const errs = validate({ not: { type: 'string' } }, 'hi');
    assert.equal(errs[0].keyword, 'not');
  });
});

// ─── Nested path preservation ─────────────────────────────────────────────────
describe('nested error paths', () => {
  it('preserves deep path for required', () => {
    const schema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          required: ['email']
        }
      }
    };
    const errs = validate(schema, { user: {} });
    assert.equal(errs[0].path, '/user/email');
  });
  it('preserves array index path', () => {
    const schema = {
      type: 'array',
      items: {
        type: 'object',
        required: ['id']
      }
    };
    const errs = validate(schema, [{id: 1}, {}]);
    assert.equal(errs[0].path, '/1/id');
  });
});

// ─── minProperties / maxProperties ───────────────────────────────────────────
describe('validate — minProperties / maxProperties', () => {
  it('minProperties fails', () => {
    const errs = validate({ minProperties: 2 }, { a: 1 });
    assert.equal(errs[0].keyword, 'minProperties');
  });
  it('maxProperties fails', () => {
    const errs = validate({ maxProperties: 1 }, { a: 1, b: 2 });
    assert.equal(errs[0].keyword, 'maxProperties');
  });
});

// ─── additionalProperties ─────────────────────────────────────────────────────
describe('validate — additionalProperties', () => {
  it('rejects extra props when false', () => {
    const schema = {
      type: 'object',
      properties: { a: { type: 'string' } },
      additionalProperties: false
    };
    const errs = validate(schema, { a: 'x', b: 'y' });
    assert.equal(errs[0].keyword, 'additionalProperties');
    assert.ok(errs[0].path.endsWith('/b'));
  });
  it('allows extra props when not specified', () => {
    const schema = {
      type: 'object',
      properties: { a: { type: 'string' } }
    };
    assert.deepEqual(validate(schema, { a: 'x', b: 'y' }), []);
  });
});
