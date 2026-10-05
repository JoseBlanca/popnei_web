<!-- spec: docs/specs/worker/client.md -->
<!-- heading: The client -->
<!-- row: the client -->
<!-- sections: "How it is verified", the items of stage 5 -->
<!-- file cl: src/worker/client.test.ts -->

The revision changed no item of "The cases". The client is the code of
the page that starts the two workers and sends them the requests; from
stage 5 it ends the calculation worker after every LD decay and starts
another, which gives back the memory the LD decay took. Its tests give
it workers made by the test, whose messages the test sends.

| item | test | note |
|---|---|---|
| The restart after an LD decay: a `result` of an `ldDecay` job of 2 individuals, with a run k6 waiting: the outcome is `done` before the worker is ended, then a new worker, the `open` of A, then k6 {{@ - **The restart after an LD decay**, from stage 5}} | {{cl: a result of an LD decay of 2 individuals, a run waiting: the LD decay is done, the worker ended, and a new one opens A again, then runs k6}}; {{cl: the outcome of an LD decay after %s is given before the restart: …}} | the second shows the outcome comes first: when no new worker can be made, the LD decay is still done |
| a `refused` of such a job restarts it too {{@ then k6; a `refused` of such a job restarts it too, and so does a}} | {{cl: an LD decay that popnei refused fails with its message, and the worker is started again}} | |
| and so does a `crashed` that starts "popnei_web defect: " {{@ and so does a `crashed` that starts "popnei_web defect: "}} | {{cl: an LD decay ended by a crashed that starts "popnei_web defect: " fails as a defect, and the worker is started again}} | |
| and a `reopenFailed` does not {{@ `crashed` that starts "popnei_web defect: ", and a `reopenFailed` does not}} | {{cl: an LD decay that ends reopenFailed fails with it, and the worker is not ended}} | |
| a result of a diversity ends no worker {{@ a result of a diversity ends no worker}} | {{cl: a result of a diversity ends no worker, and k6 is sent to it}}; {{cl: the worker is ended after a write larger than WRITE_RESTART_BYTES or refused, and after an LD decay done or refused, and not after a smaller write, a diversity or a reopenFailed}} | the second is a property, checked over sequences of requests drawn at random |
| A `ready` of protocol 3, another than `PROTOCOL_VERSION`, which is 4 from stage 5: every request fails with `protocolMismatch`, and no other worker is made {{@ `ready` of protocol 3, another than `PROTOCOL_VERSION`, which is 4}} | {{cl: a ready of protocol 3, stage 4's, fails every request with protocolMismatch, and no other worker is made}}; {{cl: a ready of protocol 3, stage 4's, fails every read with protocolMismatch, and no other light worker is made}}; {{cl: a ready of protocol 3, stage 4's, of the worker started again after a large write fails every request with protocolMismatch, and no other worker is made}} | |
