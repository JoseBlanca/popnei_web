<!-- spec: docs/specs/shell.md -->
<!-- heading: The shell -->
<!-- row: the shell -->
<!-- sections: "How it is checked", the items of stage 5 -->
<!-- file pca: e2e/pca.spec.ts -->
<!-- file pde: e2e/popDists.spec.ts -->
<!-- file lde: e2e/ldDecay.spec.ts -->
<!-- file ti: src/ui/analyses/titles.test.ts -->
<!-- file pdc: src/ui/analyses/popDists/commands.test.ts -->
<!-- file pdui: src/ui/analyses/popDists/panel.test.ts -->

The spec has no section "The cases"; its section of the checks is "How
it is checked". The revision of 30 September 2026 for stage 5 changed
one item of it, the links to the analyses, which now name the two new
panels.

| item | test | note |
|---|---|---|
| The list "Analyses of this step" with "Principal components", "Diversity", "Distances between populations" and "LD decay", in the order of the panels {{@ - The Analyses step has the list "Analyses of this step" with}} | {{pca: stop C 3 one link per analysis in the order of the panels; …}}; {{pde: PA5 D2 the links of the Analyses step name the distances between populations, …}} | in Chromium and WebKit |
| each link, pressed with the mouse and with Enter, puts the focus on the `<h2>` of its panel and leaves the step and the address as they were {{@ each link, pressed with the mouse and with Enter, puts the focus on the}} | {{pca: stop C 3 one link per analysis in the order of the panels; …}}; {{pde: PA5 D2 the links of the Analyses step name the distances between populations, …}}; {{+lde: the link LD decay of the Analyses step, pressed with Enter, puts the focus on the heading of its panel, with the step and the address kept}} | in Chromium and WebKit; the flow of stop C 3 presses every link with the mouse, and Enter on the principal components and the diversity, that of the distances Enter on its own, and the added flow Enter on the LD decay. The added flow is written and not yet run: the browser check runs it |
| at 320 pixels wide the list fits with no sideways scroll {{@ at 320 pixels wide the list fits with no sideways scroll.}} | {{pca: stop C 3 one link per analysis in the order of the panels; …}} | in Chromium and WebKit |

The revision also changed sections that are not of the checks: the
titles of the two panels in the notice and the status region, the first
a plural, "Distances between populations were not run", the second a
singular, "LD decay was not run"; and the announcement of the distance
the heatmap draws. They are checked by
{{ti: the title is Distances between populations, which names several things, in the Analyses step}},
{{ti: the status region says the distances are calculating, and, after the statistics they waited for, that they were not run, with the plural verb}},
{{ti: the title is LD decay, which names one thing, in the Analyses step}},
{{ti: the status region says the LD decay is calculating, and, after the statistics it waited for, that it was not run, with the singular verb}},
{{pdc: done with 200 populations or fewer, the heatmap of the measure}}
and
{{pdui: the measure chosen with an arrow key is one command, announced as the heatmap drawn, with the minimum kept, and the focus stays on the radio buttons}}.
