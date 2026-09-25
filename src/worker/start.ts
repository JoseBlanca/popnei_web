/**
 * The lines that make the two workers of the page, each from the script
 * Vite builds for it (.claude/skills/coding/worker.md, "How Vite builds
 * the workers"). A file of its own, so that the client, which the tests
 * import in node, holds no `?worker`.
 */
import RunnerWorker from "./runnerWorker.ts?worker";
import FilesWorker from "./filesRunner.ts?worker";

/** Starts a calculation worker, which loads popnei at once. */
export const makeRunnerWorker = (): Worker => new RunnerWorker();

/** Starts a light worker, which reads the individuals file. */
export const makeFilesWorker = (): Worker => new FilesWorker();
