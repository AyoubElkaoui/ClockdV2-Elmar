declare module "node-firebird" {
  export type Options = {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    role?: string | null;
    pageSize?: number;
    lowercase_keys?: boolean;
    encoding?: string;
  };

  export interface Database {
    query(sql: string, params: unknown[], callback: (err: Error | null, result: unknown) => void): void;
    detach(callback?: (err: Error | null) => void): void;
  }

  export function attach(
    options: Options,
    callback: (err: Error | null, db: Database) => void,
  ): void;

  export function attachOrCreate(
    options: Options,
    callback: (err: Error | null, db: Database) => void,
  ): void;

  export function create(
    options: Options,
    callback: (err: Error | null, db: Database) => void,
  ): void;
}
