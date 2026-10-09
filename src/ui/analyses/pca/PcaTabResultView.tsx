/**
 * The result of the PCA tab of popgen2.html once its code is there: the
 * parts of the old panel that draw a result, given the definition the
 * store of this page runs, `pcaOnPopgen2`. A module of its own, which
 * `PcaTabResults.tsx` alone imports with `import()`, so that the bundler
 * makes it a file of its own with its exports under their names: the
 * parts of the old panel are in a file popgen.html shares, whose exports
 * the bundler renames, and a retry at another address, which Chromium
 * needs after a failure (src/ui/codeDownload.ts), finds this file's
 * export by its name.
 */
import { pcaOnPopgen2 } from "../../../core/analyses/pca.ts";
import type { ResultsProps } from "../panels.ts";
import { PcaResults } from "./PcaResults.tsx";

/** The result of the PCA of the definition the store of popgen2.html
    runs. */
export function PcaTabResultView(props: ResultsProps): React.JSX.Element {
  return <PcaResults {...props} analysis={pcaOnPopgen2} />;
}
