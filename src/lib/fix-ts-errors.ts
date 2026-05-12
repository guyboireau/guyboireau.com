import type { HTMLAttributes } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';

// ============================================================================
// Core Type Guards
// ============================================================================

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function hasProperty<K extends string>(
  value: unknown,
  key: K
): value is Record<K, unknown> {
  return isObject(value) && key in value;
}

// ============================================================================
// Supabase Type-Safe Helpers
// ============================================================================

export interface SupabaseResult<T> {
  data: T | null;
  error: PostgrestError | null;
}

export function assertSupabaseData<T>(
  result: SupabaseResult<T>
): asserts result is { data: T; error: null } {
  if (result.error !== null) {
    throw new Error(`Supabase error: ${result.error.message}`);
  }
  if (result.data === null) {
    throw new Error('Supabase returned null data unexpectedly');
  }
}

export function getSupabaseData<T>(result: SupabaseResult<T>): T {
  assertSupabaseData(result);
  return result.data;
}

export function safeSupabaseData<T>(result: SupabaseResult<T>): T | null {
  if (result.error !== null || result.data === null) {
    return null;
  }
  return result.data;
}

// ============================================================================
// React & Astro Props Validation
// ============================================================================

export type StrictProps<P extends Record<string, unknown>> = {
  [K in keyof P]-?: Exclude<P[K], undefined>;
};

export function assertProps<P extends Record<string, unknown>>(
  props: P
): StrictProps<P> {
  const missing = Object.entries(props)
    .filter(([, v]) => v === undefined)
    .map(([k]) => k);

  if (missing.length > 0) {
    throw new Error(`Missing required props: ${missing.join(', ')}`);
  }

  return props as StrictProps<P>;
}

export function mergeClassNames(
  ...classes: readonly (string | undefined | false | null)[]
): string {
  return classes.filter((c): c is string => isString(c)).join(' ');
}

export function filterHTMLAttributes<T extends HTMLAttributes<HTMLElement>>(
  props: Record<string, unknown>
): Partial<T> {
  const htmlAttrs: Partial<Record<string, unknown>> = {};
  
  const validHTMLKeys = new Set([
    'id', 'className', 'style', 'title', 'lang', 'dir', 'draggable', 'hidden',
    'tabIndex', 'role', 'aria-label', 'aria-labelledby', 'aria-describedby',
    'aria-expanded', 'aria-hidden', 'aria-live', 'aria-atomic', 'aria-relevant',
    'aria-busy', 'aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'aria-valuetext',
    'aria-checked', 'aria-selected', 'aria-pressed', 'aria-disabled', 'aria-readonly',
    'aria-required', 'aria-invalid', 'aria-errormessage', 'aria-details', 'aria-keyshortcuts',
    'aria-roledescription', 'aria-haspopup', 'aria-level', 'aria-modal', 'aria-multiline',
    'aria-multiselectable', 'aria-orientation', 'aria-placeholder', 'aria-sort',
    'data-testid', 'data-id', 'data-name'
  ]);

  for (const [key, value] of Object.entries(props)) {
    if (validHTMLKeys.has(key) || key.startsWith('data-') || key.startsWith('aria-')) {
      htmlAttrs[key] = value;
    }
  }

  return htmlAttrs as Partial<T>;
}

// ============================================================================
// Astro Routing & Params
// ============================================================================

export interface AstroPageProps {
  params: Record<string, string | undefined>;
  props: Record<string, unknown>;
}

export function validateAstroParams<T extends Record<string, string>>(
  params: Record<string, string | undefined>,
  requiredKeys: readonly (keyof T)[]
): T {
  const validated: Record<string, string> = {};

  for (const key of requiredKeys) {
    const value = params[key as string];
    if (!isString(value)) {
      throw new Error(`Missing or invalid param: ${String(key)}`);
    }
    validated[key as string] = value;
  }

  return validated as T;
}

// ============================================================================
// Exhaustive Checks & Assertions
// ============================================================================

export function unreachable(value: never): never {
  throw new Error(`Unreachable code reached with value: ${JSON.stringify(value)}`);
}

export function exhaustiveCheck(value: never): never {
  return unreachable(value);
}

export function assertNonNull<T>(value: T | null | undefined, message?: string): T {
  if (value === null || value === undefined) {
    throw new Error(message ?? 'Value is null or undefined');
  }
  return value;
}

// ============================================================================
// Safe Data Transformations
// ============================================================================

export function safeParseJSON(input: string): unknown {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return null;
  }
}

export function coerceToString(value: unknown): string {
  if (isString(value)) return value;
  if (isNumber(value) || isBoolean(value)) return String(value);
  if (value === null || value === undefined) return '';
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: readonly K[]
): Pick<T, K> {
  const entries = keys
    .filter((key) => key in obj)
    .map((key) => [key, obj[key]] as const);

  return Object.fromEntries(entries) as Pick<T, K>;
}

export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: readonly K[]
): Omit<T, K> {
  const keysToOmit = new Set<keyof T>(keys);
  const entries = Object.entries(obj).filter(([key]) => !keysToOmit.has(key as keyof T));
  
  return Object.fromEntries(entries) as Omit<T, K>;
}