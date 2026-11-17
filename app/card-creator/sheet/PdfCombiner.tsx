"use client";
import { useRef, useState } from "react";
import { DEFAULT_SHADOW_LEVEL, SHADOW_LEVELS, shadowLevelLabel, type ShadowLevel } from "../../../lib/card-sheet/shadow";
import { liftJpegBytes } from "../../../lib/card-sheet/shadow-image";
import { MERGE_LIMITS, inspectPdf, mergePdfs, type PdfPageInfo } from "../../../lib/card-sheet/merge";
import styles from "./sheet.module.css";

type Item = { id: number; name: string; bytes: Uint8Array; pages: PdfPageInfo[] };

function sizeSummary(pages: PdfPageInfo[]) {
  const labels = [...new Set(pages.map((page) => page.label))];
  return `${pages.length} page${pages.length === 1 ? "" : "s"} · ${labels.join(", ")}`;
}

/** Joins card sheet PDFs (for example several downloaded from this page) into one multi-page file. Runs locally. */
export default function PdfCombiner() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lift, setLift] = useState<ShadowLevel>(DEFAULT_SHADOW_LEVEL);
  const nextId = useRef(1);
  const input = useRef<HTMLInputElement>(null);
  const totalPages = items.reduce((sum, item) => sum + item.pages.length, 0);

  async function addFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setBusy(true);
    setError("");
    const problems: string[] = [];
    const added: Item[] = [];
    let room = MERGE_LIMITS.maxFiles - items.length,
      pagesLeft = MERGE_LIMITS.maxTotalPages - totalPages;
    for (const file of Array.from(files)) {
      const name = file.name.slice(0, 80);
      if (room <= 0) {
        problems.push(`Only ${MERGE_LIMITS.maxFiles} PDFs can be combined at once.`);
        break;
      }
      try {
        if (file.size > MERGE_LIMITS.maxFileBytes) throw new Error(`${name} is larger than ${MERGE_LIMITS.maxFileBytes / 1024 / 1024} MB.`);
        const bytes = new Uint8Array(await file.arrayBuffer());
        const info = await inspectPdf(name, bytes);
        if (info.pageCount > pagesLeft) throw new Error(`${name} would take the total past ${MERGE_LIMITS.maxTotalPages} pages.`);
        added.push({ id: nextId.current++, name, bytes, pages: info.pages });
        room--;
        pagesLeft -= info.pageCount;
      } catch (e) {
        problems.push(e instanceof Error ? e.message : `${name} could not be read.`);
      }
    }
    if (added.length) setItems((old) => [...old, ...added]);
    setStatus(added.length ? `Added ${added.length} PDF${added.length === 1 ? "" : "s"}.` : "");
    setError([...new Set(problems)].join(" "));
    setBusy(false);
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    setItems((old) => {
      if (target < 0 || target >= old.length) return old;
      const next = [...old];
      [next[index], next[target]] = [next[target] as Item, next[index] as Item];
      return next;
    });
  }

  async function combine() {
    setBusy(true);
    setError("");
    try {
      const result = await mergePdfs(
        items.map((item) => ({ name: item.name, bytes: item.bytes })),
        { shadowLevel: lift, liftJpeg: liftJpegBytes },
      );
      const buffer = new ArrayBuffer(result.bytes.byteLength);
      new Uint8Array(buffer).set(result.bytes);
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "card-sheets-combined.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setStatus(`Downloaded card-sheets-combined.pdf with ${result.pageCount} page${result.pageCount === 1 ? "" : "s"}${lift ? `; shadow lift level ${lift} applied to ${result.liftedImages} image${result.liftedImages === 1 ? "" : "s"}${result.skippedImages ? `, ${result.skippedImages} other image${result.skippedImages === 1 ? "" : "s"} left unchanged` : ""}` : ""}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The PDFs could not be combined.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.combiner} aria-labelledby="combine-heading">
      <h2 id="combine-heading">Combine sheet PDFs</h2>
      <p className={styles.note}>
        Add several card sheet PDFs, such as ones downloaded above, to print them from one file. Pages keep their own size and quality, so Letter and A4 sheets can be mixed; nothing is uploaded. Up to {MERGE_LIMITS.maxFiles} files, {MERGE_LIMITS.maxFileBytes / 1024 / 1024} MB each, {MERGE_LIMITS.maxTotalPages} pages in total.
      </p>
      <div className={styles.actions}>
        <button type="button" onClick={() => input.current?.click()} disabled={busy || items.length >= MERGE_LIMITS.maxFiles}>
          Add PDFs
        </button>
        <button
          type="button"
          onClick={() => {
            setItems([]);
            setStatus("Cleared the list.");
            setError("");
          }}
          disabled={busy || !items.length}
        >
          Clear list
        </button>
      </div>
      <input
        ref={input}
        className={styles.hidden}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        aria-label="Add sheet PDFs to combine"
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {items.length > 0 && (
        <ol className={styles.pdfList}>
          {items.map((item, index) => (
            <li key={item.id}>
              <span className={styles.slotNumber}>{index + 1}</span>
              <span className={styles.pdfName} title={item.name}>
                {item.name}
              </span>
              <small>{sizeSummary(item.pages)}</small>
              <span className={styles.slotActions}>
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${item.name} earlier`}>
                  ↑
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label={`Move ${item.name} later`}>
                  ↓
                </button>
                <button type="button" onClick={() => setItems((old) => old.filter((value) => value.id !== item.id))} aria-label={`Remove ${item.name}`}>
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}
      <div className={styles.field}>
        <label htmlFor="combine-lift">Clear sticker shadow lift</label>
        <select id="combine-lift" value={lift} onChange={(e) => setLift(Number(e.target.value) as ShadowLevel)} disabled={busy}>
          {SHADOW_LEVELS.map((value) => (
            <option key={value} value={value}>
              {shadowLevelLabel(value)}
            </option>
          ))}
        </select>
      </div>
      {lift > 0 && <p className={styles.note}>Lightens only the darkest tones of every JPEG image in the combined file; midtones and bright areas are unchanged. Use PDFs made without a shadow lift; sheets already lifted would be lightened twice. Pages keep their size.</p>}
      <button type="button" className={styles.download} onClick={() => void combine()} disabled={busy || items.length === 0}>
        {busy ? "Working…" : `Combine into one PDF (${totalPages} page${totalPages === 1 ? "" : "s"})`}
      </button>
      <p className={styles.status} role="status" aria-live="polite">
        {status}
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
