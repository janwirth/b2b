import { type Result } from "../result/result";

export const getError = <Err>(err: Result<any, Err>): Err => {
  if (err._tag === "Failure") {
    return err.error;
  }
  throw new Error("Expected Error result but got Ok result");
};
