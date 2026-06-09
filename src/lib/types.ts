/* UI-kit primitive types only. Business/API types live in src/api/types.ts. */

export type Role = 'customer' | 'employee' | 'admin';
export type CapKind = 'trusted' | 'data' | 'parsed' | 'write';
export type DotKind = CapKind | 'ok' | 'wait' | 'off';
export type TagKind = 'q' | 'm' | CapKind;
