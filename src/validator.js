/**
 * JSON Schema Draft 7 validator (subset).
 * Supported keywords: type, required, properties, items, minLength, maxLength,
 * pattern, minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf,
 * minItems, maxItems, uniqueItems, minProperties, maxProperties,
 * enum, const, format, oneOf, anyOf, allOf, not, additionalProperties
 */

import { isValidFormat } from './formats.js';

/**
 * @typedef {{ path: string, message: string, keyword: string, value?: unknown }} ValidationError
 */

/**
 * @param {unknown} value
 * @returns {string} JSON Schema type string
 */
export function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value; // 'string' | 'number' | 'boolean' | 'object'
}

/**
 * @param {unknown} value
 * @param {string|string[]} type
 * @returns {boolean}
 */
export function validateType(value, type) {
  const types = Array.isArray(type) ? type : [type];
  const actual = typeOf(value);
  return types.some(t => {
    if (t === 'integer') return actual === 'number' && Number.isInteger(value);
    return actual === t;
  });
}

/**
 * Deep equality for enum/const checking.
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
export function deepEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(k => deepEqual(a[k], b[k]));
}

function hasUniqueItems(arr) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (deepEqual(arr[i], arr[j])) return false;
    }
  }
  return true;
}

/**
 * Validate data against a JSON Schema Draft 7 subset.
 * @param {unknown} schema
 * @param {unknown} data
 * @param {string} [path]
 * @returns {ValidationError[]}
 */
export function validate(schema, data, path = '') {
  if (typeof schema !== 'object' || schema === null) return [];
  if (schema === true) return [];
  if (schema === false) return [{ path, message: 'false schema rejects everything', keyword: 'false', value: data }];

  const errors = [];

  // --- $ref (basic inlining not supported, skip) ---

  // --- type ---
  if (schema.type !== undefined) {
    if (!validateType(data, schema.type)) {
      const expected = Array.isArray(schema.type) ? schema.type.join(' | ') : schema.type;
      errors.push({
        path,
        message: `expected ${expected}, got ${typeOf(data)}`,
        keyword: 'type',
        value: data
      });
      // Type failure: still check compound keywords below but skip type-specific keywords
    }
  }

  // --- const ---
  if ('const' in schema && !deepEqual(data, schema.const)) {
    errors.push({
      path,
      message: `must be equal to const value`,
      keyword: 'const',
      value: data
    });
  }

  // --- enum ---
  if (schema.enum !== undefined) {
    if (!schema.enum.some(v => deepEqual(data, v))) {
      errors.push({
        path,
        message: `must be one of: ${JSON.stringify(schema.enum)}`,
        keyword: 'enum',
        value: data
      });
    }
  }

  // --- String keywords ---
  if (typeof data === 'string') {
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push({
        path,
        message: `must be at least ${schema.minLength} characters (got ${data.length})`,
        keyword: 'minLength',
        value: data
      });
    }
    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      errors.push({
        path,
        message: `must be at most ${schema.maxLength} characters (got ${data.length})`,
        keyword: 'maxLength',
        value: data
      });
    }
    if (schema.pattern !== undefined) {
      try {
        if (!new RegExp(schema.pattern).test(data)) {
          errors.push({
            path,
            message: `must match pattern: ${schema.pattern}`,
            keyword: 'pattern',
            value: data
          });
        }
      } catch {
        // Invalid regex in schema — skip
      }
    }
    if (schema.format !== undefined && !isValidFormat(data, schema.format)) {
      errors.push({
        path,
        message: `must be a valid ${schema.format}`,
        keyword: 'format',
        value: data
      });
    }
  }

  // --- Number keywords ---
  if (typeof data === 'number') {
    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push({
        path,
        message: `must be >= ${schema.minimum} (got ${data})`,
        keyword: 'minimum',
        value: data
      });
    }
    if (schema.maximum !== undefined && data > schema.maximum) {
      errors.push({
        path,
        message: `must be <= ${schema.maximum} (got ${data})`,
        keyword: 'maximum',
        value: data
      });
    }
    if (schema.exclusiveMinimum !== undefined) {
      if (typeof schema.exclusiveMinimum === 'boolean') {
        // Draft 4 style
        if (schema.exclusiveMinimum && schema.minimum !== undefined && data <= schema.minimum) {
          errors.push({
            path,
            message: `must be > ${schema.minimum} (got ${data})`,
            keyword: 'exclusiveMinimum',
            value: data
          });
        }
      } else if (data <= schema.exclusiveMinimum) {
        errors.push({
          path,
          message: `must be > ${schema.exclusiveMinimum} (got ${data})`,
          keyword: 'exclusiveMinimum',
          value: data
        });
      }
    }
    if (schema.exclusiveMaximum !== undefined) {
      if (typeof schema.exclusiveMaximum === 'boolean') {
        if (schema.exclusiveMaximum && schema.maximum !== undefined && data >= schema.maximum) {
          errors.push({
            path,
            message: `must be < ${schema.maximum} (got ${data})`,
            keyword: 'exclusiveMaximum',
            value: data
          });
        }
      } else if (data >= schema.exclusiveMaximum) {
        errors.push({
          path,
          message: `must be < ${schema.exclusiveMaximum} (got ${data})`,
          keyword: 'exclusiveMaximum',
          value: data
        });
      }
    }
    if (schema.multipleOf !== undefined && schema.multipleOf !== 0) {
      // Use modulo with epsilon to handle floating point
      const remainder = Math.abs(data % schema.multipleOf);
      const eps = 1e-10;
      if (remainder > eps && Math.abs(remainder - schema.multipleOf) > eps) {
        errors.push({
          path,
          message: `must be a multiple of ${schema.multipleOf} (got ${data})`,
          keyword: 'multipleOf',
          value: data
        });
      }
    }
  }

  // --- Array keywords ---
  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push({
        path,
        message: `must have at least ${schema.minItems} items (got ${data.length})`,
        keyword: 'minItems',
        value: data
      });
    }
    if (schema.maxItems !== undefined && data.length > schema.maxItems) {
      errors.push({
        path,
        message: `must have at most ${schema.maxItems} items (got ${data.length})`,
        keyword: 'maxItems',
        value: data
      });
    }
    if (schema.uniqueItems === true && !hasUniqueItems(data)) {
      errors.push({
        path,
        message: 'items must be unique',
        keyword: 'uniqueItems',
        value: data
      });
    }
    if (schema.items !== undefined) {
      if (Array.isArray(schema.items)) {
        // Tuple validation
        schema.items.forEach((itemSchema, i) => {
          if (i < data.length) {
            errors.push(...validate(itemSchema, data[i], `${path}/${i}`));
          }
        });
        if (schema.additionalItems === false) {
          for (let i = schema.items.length; i < data.length; i++) {
            errors.push({
              path: `${path}/${i}`,
              message: 'additional items not allowed',
              keyword: 'additionalItems',
              value: data[i]
            });
          }
        } else if (typeof schema.additionalItems === 'object' && schema.additionalItems !== null) {
          for (let i = schema.items.length; i < data.length; i++) {
            errors.push(...validate(schema.additionalItems, data[i], `${path}/${i}`));
          }
        }
      } else {
        data.forEach((item, i) => {
          errors.push(...validate(schema.items, item, `${path}/${i}`));
        });
      }
    }
    if (schema.contains !== undefined) {
      const anyValid = data.some(item => validate(schema.contains, item, '').length === 0);
      if (!anyValid) {
        errors.push({
          path,
          message: 'array must contain at least one matching item',
          keyword: 'contains',
          value: data
        });
      }
    }
  }

  // --- Object keywords ---
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const keys = Object.keys(data);

    if (schema.minProperties !== undefined && keys.length < schema.minProperties) {
      errors.push({
        path,
        message: `must have at least ${schema.minProperties} properties (got ${keys.length})`,
        keyword: 'minProperties',
        value: data
      });
    }
    if (schema.maxProperties !== undefined && keys.length > schema.maxProperties) {
      errors.push({
        path,
        message: `must have at most ${schema.maxProperties} properties (got ${keys.length})`,
        keyword: 'maxProperties',
        value: data
      });
    }

    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in data)) {
          errors.push({
            path: `${path}/${key}`,
            message: `is required`,
            keyword: 'required',
            value: undefined
          });
        }
      }
    }

    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in data) {
          errors.push(...validate(propSchema, data[key], `${path}/${key}`));
        }
      }
    }

    if (schema.patternProperties) {
      for (const [pattern, propSchema] of Object.entries(schema.patternProperties)) {
        let re;
        try { re = new RegExp(pattern); } catch { continue; }
        for (const key of keys) {
          if (re.test(key)) {
            errors.push(...validate(propSchema, data[key], `${path}/${key}`));
          }
        }
      }
    }

    if (schema.additionalProperties !== undefined) {
      const definedKeys = new Set([
        ...Object.keys(schema.properties || {}),
        ...Object.keys(schema.patternProperties || {}).reduce((acc, pat) => {
          let re;
          try { re = new RegExp(pat); } catch { return acc; }
          return [...acc, ...keys.filter(k => re.test(k))];
        }, [])
      ]);
      const additionalKeys = keys.filter(k => !definedKeys.has(k));
      if (schema.additionalProperties === false) {
        for (const key of additionalKeys) {
          errors.push({
            path: `${path}/${key}`,
            message: `additional property '${key}' not allowed`,
            keyword: 'additionalProperties',
            value: data[key]
          });
        }
      } else if (typeof schema.additionalProperties === 'object' && schema.additionalProperties !== null) {
        for (const key of additionalKeys) {
          errors.push(...validate(schema.additionalProperties, data[key], `${path}/${key}`));
        }
      }
    }

    if (schema.dependencies) {
      for (const [key, dep] of Object.entries(schema.dependencies)) {
        if (key in data) {
          if (Array.isArray(dep)) {
            for (const depKey of dep) {
              if (!(depKey in data)) {
                errors.push({
                  path: `${path}/${depKey}`,
                  message: `is required when '${key}' is present`,
                  keyword: 'dependencies',
                  value: undefined
                });
              }
            }
          } else {
            errors.push(...validate(dep, data, path));
          }
        }
      }
    }
  }

  // --- Compound keywords ---

  if (schema.allOf) {
    for (const sub of schema.allOf) {
      errors.push(...validate(sub, data, path));
    }
  }

  if (schema.anyOf) {
    const passed = schema.anyOf.some(sub => validate(sub, data, path).length === 0);
    if (!passed) {
      errors.push({
        path,
        message: `must match at least one of the anyOf schemas`,
        keyword: 'anyOf',
        value: data
      });
    }
  }

  if (schema.oneOf) {
    const passingCount = schema.oneOf.filter(sub => validate(sub, data, path).length === 0).length;
    if (passingCount !== 1) {
      errors.push({
        path,
        message: `must match exactly one of the oneOf schemas (matched ${passingCount})`,
        keyword: 'oneOf',
        value: data
      });
    }
  }

  if (schema.not !== undefined) {
    const notErrors = validate(schema.not, data, path);
    if (notErrors.length === 0) {
      errors.push({
        path,
        message: `must not match the "not" schema`,
        keyword: 'not',
        value: data
      });
    }
  }

  if (schema.if !== undefined) {
    const ifErrors = validate(schema.if, data, path);
    if (ifErrors.length === 0) {
      if (schema.then !== undefined) {
        errors.push(...validate(schema.then, data, path));
      }
    } else {
      if (schema.else !== undefined) {
        errors.push(...validate(schema.else, data, path));
      }
    }
  }

  return errors;
}
