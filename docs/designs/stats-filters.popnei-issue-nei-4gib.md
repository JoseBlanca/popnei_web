# The issue for popnei on vars files larger than 4 GiB, not opened

Drafted on 9 October 2026, after work package 8 of `docs/plans/download.md`
found a `.nei` file of 8 GB written in WebKit that pyarrow could not read
by its footer (`docs/specs/analyses/writeVariants.md`, "What was
measured"). The reproduction below was made the same day under node, with
no browser. Not opened: it waits for the owner's approval.

---

**Title:** A vars file larger than 4 GiB written by the wasm package has a footer whose batch offsets wrap at 4 GiB, so it cannot be opened

**What was seen.** A vars file is one Arrow IPC file. Its footer, at the end of the file, lists the offset in bytes at which each batch of variants starts, and a reader that opens the file, popnei's `openVars`, pyarrow's `open_file`, pandas or R, finds each batch there. In a vars file written by popnei's wasm package that is larger than 4 GiB, 4,294,967,296 bytes, every batch that starts past 4 GiB is listed in the footer at an offset exactly 4,294,967,296 bytes below its true one. The batches themselves are written whole and in order, so the file reads correctly as a stream, from its start, but not by its footer.

On popnei js-v0.2.2 under node 26.8.2 on a Mac, `writeVars` of a gzipped VCF of 1,000 diploid individuals, with `onBytes` writing each piece to a file on disk, wrote two files:

| VCF | vars file | batches | the footer | `openVars`, then `iterBlocks` | pyarrow 25.0.1, `open_file` | pyarrow, `open_stream` |
|---|---|---|---|---|---|---|
| 3,850,000 variants, 2.46 GB | 4,239,358,674 bytes, under 4 GiB | 770 | every offset right | all 770 batches, 3,850,000 variants | all 770 batches | all 770 batches |
| 4,200,000 variants, 2.68 GB | 4,624,805,178 bytes, over 4 GiB | 840 | the offsets of batches 782 to 840 are 4,294,967,296 too low | opens; `iterBlocks` throws at batch 782 | fails at batch 782 | all 840 batches, 4,200,000 variants |

Batch 782 is the first that starts past 4 GiB, at byte 4,299,828,864, and the footer lists it at 4,861,568, which is 4,299,828,864 less 4,294,967,296. The lengths of its metadata and of its body in the footer are right. The offsets were compared by parsing the footer by hand against the place of each message read as a stream. `openVars` opens the file, since it reads only the schema and the footer, and the error comes at the first pass:

> the batch 782 of the vars file could not be read, so the file is damaged and has to be fetched or copied again: its message is not one of arrow: Signed offset at position 4129280 has value 16792832 which points out of bounds.

pyarrow's `get_batch(781)` fails with "Message metadata too long by 572 bytes".

The same happened in a browser, in WebKit, Safari's engine, as Playwright ships it, on a Mac on 9 October 2026, in popnei_web, the static web application that runs popnei's wasm package in the tab: a file of 7,270,000 variants, 8,005,214,850 bytes and 1,454 batches, read whole as a stream and failed by its footer at batch 782, with the same error of pyarrow.

**The cause, found in the source.** arrow-ipc 60.0.0, the version in popnei's `Cargo.lock`, keeps the offset of the next batch in a field of `FileWriter` declared `block_offsets: usize` (`src/writer.rs`, line 1602), puts it in the footer's `Block` with `self.block_offsets as i64` (line 1717) and adds each batch's length to it with `+=` (line 1722). `usize` is 32 bits in `wasm32-unknown-unknown`, the target of the wasm package, and popnei's release profile sets `overflow-checks = false`, so the addition wraps past 4,294,967,295 with no error, which is the difference of exactly 2^32 measured above. popnei writes its vars file through that `FileWriter` (`crates/popnei/src/io/vars.rs`, lines 677 and 775).

Inferred and not tried: the builds for 64-bit machines, the command line and the Python wheel, have a 64-bit `usize` and write correct footers; the wheel for pyodide, `wasm32-unknown-emscripten`, has a 32-bit `usize` and would write the same wrong footers. The documentation of arrow-rs's current `FileWriter` (https://arrow.apache.org/rust/arrow_ipc/writer/struct.FileWriter.html, read on 9 October 2026) still shows the field as `usize`; whether an issue or a fix exists upstream was not looked for.

**Why popnei_web needs it.** `popgen2.html`, popnei_web's page for population genetics, offers the variants that pass the user's filters as a `.nei` file to download, written by `writeVars` with `onBytes` in a web worker, a second thread of the tab. With the VCF above, of 1,000 diploid individuals and random genotypes, a variant takes 1,101 bytes of the file, so 4 GiB is passed at about 3.9 million variants, 4,294,967,296 / 1,101; real genotypes compress differently under lz4, and more individuals pass it with fewer variants. The file is saved with no error, and the user learns that it is damaged only when they open it, in the application, in popnei or in pandas, and then only at the batch that starts past 4 GiB.

**What is asked.** That a vars file of any size written by the wasm package has a footer that lists the true offset of every batch, so that every reader opens it. How is popnei's choice; the ways seen from here are:

1. A fix in arrow-rs, the offset kept in a `u64`, and popnei on the release that has it.
2. Until then, arrow-ipc patched in popnei's workspace with that one change.
3. If neither is soon, `writeVars` in the wasm package stops with an `Error` before the file passes 4 GiB, so that a broken file is not saved as if it were whole.

Proposed from popnei_web: option 3 now, since it is small and stops broken files from being saved, and option 1 or 2 when popnei has it, since a user with many variants needs the file. Separately, `openVars` could read the files already written: the batches are in order, so an offset in the footer that is lower than the end of the batch before it is the true one less a multiple of 2^32, and can be corrected. popnei_web does not need this once new files are right; it would keep readable the files written before the fix.

**How to see it again.** Under node, `openVcf` of a `Blob` needs `FileReaderSync`, which node does not have, and a `Uint8Array` of the VCF would have to fit in the memory of wasm, so the script gives popnei a `Blob` over the file on disk and a `FileReaderSync` that reads it with `fs.readSync`. The VCF is written by `writeBigVcf("over.vcf.gz", 4_200_000)` of popnei_web's `e2e/bigVcf.ts`, whose lines are those of popnei's `crates/popnei/benches/make_big_vcf.py`, 1,000 diploid individuals, a variant every 1,000 bp, its genotypes drawn at random, gzipped; any VCF whose vars file passes 4 GiB will do. On the same Mac and node, the VCF took 143 s to write, and the vars file 82 s and 0.32 GB of memory.

```js
// write.mjs: node write.mjs over.vcf.gz over.nei
import { openSync, readSync, writeSync, closeSync, fstatSync } from "node:fs";
import { init, openVcf, openVars, writeVars } from "popnei";

class FileBlob extends Blob {
  constructor(fd, start, end) { super([]); Object.assign(this, { fd, start, end }); }
  static of(path) { const fd = openSync(path, "r"); return new FileBlob(fd, 0, fstatSync(fd).size); }
  get size() { return this.end - this.start; }
  slice(a = 0, b = this.size) {
    const s = Math.min(Math.max(a, 0), this.size), e = Math.min(Math.max(b, s), this.size);
    return new FileBlob(this.fd, this.start + s, this.start + e);
  }
}
globalThis.FileReaderSync = class {
  readAsArrayBuffer(blob) {
    const buf = Buffer.allocUnsafeSlow(blob.size);
    let done = 0;
    while (done < blob.size) {
      const n = readSync(blob.fd, buf, done, blob.size - done, blob.start + done);
      if (n === 0) break;
      done += n;
    }
    return buf.buffer.slice(0, done);
  }
};

await init();
const [vcf, out] = process.argv.slice(2);
const fd = openSync(out, "w");
writeVars(openVcf(FileBlob.of(vcf), { ploidy: 2 }), { onBytes: (p) => writeSync(fd, p) });
closeSync(fd);
const blocks = openVars(FileBlob.of(out)).iterBlocks({ fields: [] });
for (const _ of blocks) {}  // throws at batch 782 for over.nei
console.log(blocks.passStats.numVars);
```

```python
import pyarrow as pa, pyarrow.ipc as ipc
with pa.memory_map("over.nei") as src:
    reader = ipc.open_file(src)
    for k in range(reader.num_record_batches):
        reader.get_batch(k)  # fails at k = 781, the batch 782
# As a stream: the messages start after the magic and its padding, at byte 64.
with pa.memory_map("over.nei") as src:
    src.seek(64)
    print(sum(b.num_rows for b in ipc.open_stream(pa.BufferReader(src.read_buffer()))))  # 4200000
```
