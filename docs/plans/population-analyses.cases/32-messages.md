<!-- spec: docs/specs/worker/messages.md -->
<!-- heading: The messages -->
<!-- row: the messages -->
<!-- sections: "How it is verified", the items of stage 5 -->
<!-- file msg: src/worker/messages.test.ts -->

The revision changed no item of "The cases". The messages are those the
page and the calculation worker send each other; `parseToRunner` is the
worker's check of a message of the page, and `parseFromRunner` the
page's check of a message of the worker.

| item | test | note |
|---|---|---|
| Every kind is accepted: a `run` of each of the seven jobs {{@ a `run` of each of the seven jobs}} | {{msg: parseToRunner accepts a run of the LD decay %s}}; {{msg: parseToRunner accepts a run of the distances %s}}; {{msg: parseToRunner accepts a run of the diversity with the draw and the populations of calcPopDiversity}}; {{msg: parseFromRunner accepts a result of the LD decay of two populations and 50 bins}}; {{msg: parseFromRunner accepts a result of the distances with orders %s}}; {{msg: parseFromRunner accepts a result with its spectra, a population not given to calcPopDiversity among them}} | the three jobs stage 5 adds or changes, each with its result; the other four are in the map of stage 4 |
| A diversity job with `numCalledAlleles` 1 is refused {{@ from stage 5, a diversity job with `numCalledAlleles` 1}} | {{msg: a diversity job with numCalledAlleles 1, below popnei's smallest draw, is wrongType, and so are 0 and 2.5}} | |
| one whose `popDiversityPops` names a population not in `pops` {{@ and one whose `popDiversityPops` names a}} | {{msg: a diversity job whose popDiversityPops names a population not in pops is wrongType}} | |
| or two in another order than theirs {{@ or two in another order than theirs}} | {{msg: a diversity job whose popDiversityPops holds two populations in another order than theirs, or one twice, is wrongType}} | |
| a diversity result with `numVarsEveryPop` a number and `numVarsEveryPopInDraw` `null` {{@ diversity result with `numVarsEveryPop` a number and}} | {{msg: a diversity result with numVarsEveryPop a number and numVarsEveryPopInDraw null, or the other way round, is wrongType}} | |
| and one whose `foldedSfs` holds 20 values for a draw of 40 {{@ and one whose `foldedSfs` holds 20}} | {{msg: a diversity result whose foldedSfs holds 20 values for a draw of 40 is wrongLength}} | |
| a result of the distances of three populations with two values of `fst`, `wrongLength` {{@ populations with two values of `fst`, `wrongLength`}} | {{msg: a result of three populations with two values of fst is wrongLength}} | |
| an `order` of the kind `pcoa` of `[0, 0, 2]` {{@ kind `pcoa` of `[0, 0, 2]`}} | {{msg: an order of the kind pcoa of %s is refused}} | run for `[0, 0, 2]` and for `[0, 1, 3]` |
| and a `notPlaced` without its `message` {{@ and a `notPlaced` without its `message`}} | {{msg: an order notPlaced without its message is missingFields}} | |
| a result of the LD decay of two populations and 50 bins with 99 values of `meanR2`, `wrongLength` {{@ a result of the LD decay of two populations and 50 bins with 99 values}} | {{msg: a result of two populations and 50 bins with 99 values of meanR2 is wrongLength}} | |
| The version: a `ready` with `protocol: 3`, stage 4's, and no other field gives `otherProtocol` with 3 from both checks of the page {{@ a `ready` with `protocol: 3`, stage 4's, and no}} | {{msg: a ready of protocol 3, stage 4's, with no other field, from the %s worker, is otherProtocol}}; {{msg: the version of the messages is 4}} | |
| and so does `protocol: 5` with 5 {{@ and so does `protocol: 5` with 5}} | {{msg: PA2 D1 the messages of the LD decay > a ready of protocol 5 with no other field, from the %s worker, is otherProtocol}} | |
| with `protocol: "4"`, `wrongType` {{@ with `protocol: "4"`, `wrongType`}} | {{msg: a ready of protocol "4", from the %s worker, is wrongType}} | |
