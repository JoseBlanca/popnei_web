<!-- spec: docs/specs/core/project.md -->
<!-- heading: The project, what the analyses per population share -->
<!-- row: the project, what the analyses per population share -->
<!-- sections: "How it is verified", the sentences of stage 5 of its item on the populations -->
<!-- file prj: src/core/project.test.ts -->
<!-- file div: src/core/analyses/diversity.test.ts -->

The revision changed no item of "The cases". The four functions are
those of "What the analyses per population share from stage 5": the two
locks the diversity had alone until stage 4, the split of the
populations by the minimum of individuals, and the words of the
populations under it.

| item | test | note |
|---|---|---|
| `populationsWithMinimum` of A of 2, B of 1 and C of 3 individuals at a minimum of 2 gives A and C, and B with 1, in that order {{@ `project.ts`: `populationsWithMinimum` of}} | {{prj: populationsWithMinimum of A of 2, B of 1, C of 3 and D of 1 individuals at a minimum of 2 gives A and C, and B and D with 1, each in that order}} | the test has a fourth population, D of 1, so that the order of those under the minimum is checked too |
| and at 0 every population {{@ and at 0 every population}} | {{prj: populationsWithMinimum at a minimum of 0 gives every population, and none under it}} | |
| `underMinimumText` of one population, the text as a literal {{@ of one, of two, of three and of four populations, the texts above as}} | {{prj: underMinimumText of one population gives its count and the consequence of one}} | with the consequence of the distances and with that of the diversity |
| `underMinimumText` of two and of three populations | {{prj: underMinimumText of two and of three populations gives their counts in their order and the consequence of several}} | |
| `underMinimumText` of four populations, with no counts | {{prj: underMinimumText of four populations names two and how many more, with no counts}} | |
| `populationListsNeeds`, each case of the diversity's tests of stage 3, moved here with them {{@ `populationListsNeeds` and `populationsKeptNeeds` each case of the}} | {{prj: populationListsNeeds of a list to keep i4, who has no population, gives the reason of the lists, …}}; {{prj: the reason of the lists names the file escaped, and a list popnei would refuse is left to the store}}; {{prj: lists that remove every individual leave populationListsNeeds null for the one population, …}}; {{div: needs gives the reason of the lists, that of populationListsNeeds, and keptNeeds that of populationsKeptNeeds}} | the last is the diversity, which gives the reasons of the two functions as its own |
| `populationsKeptNeeds`, each case of the diversity's tests of stage 3 | {{prj: populationsKeptNeeds locks when the individuals kept leave no population, with the words of all left empty}}; {{prj: lists that remove every individual leave populationListsNeeds null for the one population, …}} | |
