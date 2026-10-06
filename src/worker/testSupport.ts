/**
 * What the tests of the worker and the tests in a browser share: the
 * version of popnei that `package.json` installs, as popnei's `version()`
 * gives it. It changes with the release named there, and a test that
 * finds another version has run a popnei other than the one installed,
 * such as an old build left in `node_modules`. Imported by tests alone.
 */
export const INSTALLED_POPNEI_VERSION = "0.2.1";
