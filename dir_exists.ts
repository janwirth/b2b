import { readdir } from "fs/promises";

export const dir_exists = async (path: string) => {
  try {
    await readdir(path);
    return true;
  } catch (err) {
    return false;
  }
};
