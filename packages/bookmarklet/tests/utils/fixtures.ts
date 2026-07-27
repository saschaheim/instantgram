import { readFileSync } from "fs";
import { join } from "path";
import { InstagramMediaInfoResponse } from "../../src/helpers/instagramTypes";

const fixturesDir = join(__dirname, "..", "fixtures");

export const loadFixture = <T = InstagramMediaInfoResponse>(name: string): T =>
    JSON.parse(readFileSync(join(fixturesDir, `${name}.json`), "utf8")) as T;
