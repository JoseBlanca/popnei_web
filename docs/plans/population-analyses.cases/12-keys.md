<!-- spec: docs/specs/core/keys.md -->
<!-- heading: The keys -->
<!-- row: the keys -->
<!-- sections: "The cases" and "How it is verified" -->
<!-- file keys: src/core/keys.test.ts -->

The revision of stage 5 changed no item of the two sections, and nothing
of `keys.ts`: it says, in "What it does", that the LD decay reads every
filter of the variants but the LD pruning through the inputs of its own
key, and that the measure the heatmap of the distances draws is in no
key. Both are rules of the two analyses, and are mapped with
`docs/specs/analyses/ldDecay.md` and `popDists.md`. What `keys.ts` asks
of every analysis, the two new ones among them, is checked by
{{keys: keyInputs of %s gives a value for the empty project and for a project whose reads are pending, without reading p.variants}},
which runs once for each analysis of the application.
