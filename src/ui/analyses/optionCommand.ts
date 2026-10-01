/**
 * The command of an option of an analysis, as its panel sends it to the
 * store: `setAnalysisOptions` with the options the project has and the
 * one changed, and the description that ends the notice of the results it
 * removes and names the header's Undo (docs/specs/analyses/pca.md,
 * popDists.md and diversity.md, "What it sends and reads"). Pure, so that
 * a test in node checks the commands of each panel.
 */
import type { JsonObject } from "../../core/keys.ts";
import { setAnalysisOptions } from "../../core/project.ts";
import type { ParsedAnalysis, Project } from "../../core/project.ts";

/** A command of the store, with its description. */
export interface OptionCommand {
  /** The words that end the notice of the results it removes. */
  readonly description: string;
  /** The new project, of the project it is given. */
  readonly command: (p: Project) => Project;
}

/** How the options of one analysis are read from a project and written
    as the JSON object its `parseOptions` reads. */
export interface OptionsOf<O> {
  /** The analysis, as `setAnalysisOptions` takes it. */
  readonly analysis: ParsedAnalysis;
  /** Its options in the project, or its defaults. */
  readonly read: (p: Project) => O;
  /** The options as the JSON object its `parseOptions` reads. */
  readonly json: (options: O) => JsonObject;
}

/** The command that sets the options of `of.analysis` to those `change`
    makes of the options the project has, with `description`. */
export function optionCommand<O>(
  of: OptionsOf<O>,
  description: string,
  change: (options: O) => O,
): OptionCommand {
  return {
    description,
    command: (p) =>
      setAnalysisOptions(p, of.analysis, of.json(change(of.read(p)))),
  };
}
