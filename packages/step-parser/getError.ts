import { R } from "@mobily/ts-belt";

export const getError = <Err>(err: R.Result<any, Err>): Err => {
  if (R.isError(err)) {
    return err._0;
  }
  throw new Error("Expected Error result but got Ok result");
};
