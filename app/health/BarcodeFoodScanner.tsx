"use client";

import { Camera, ImageUp, ScanBarcode, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "react-toastify";
import { hasValidGtinCheckDigit, selectBarcodeServing, type BarcodeFoodDraft } from "./barcodeData";
import { lookupFoodBarcode, saveScannedFood } from "./nutritionActions";
import styles from "./health.module.css";

type ScannerControls = { stop: () => void };
type NativeDetector = { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>> };
type NativeDetectorConstructor = new (options?: { formats?: string[] }) => NativeDetector;

const editableNutrients = [
  ["calories", "Calories"], ["protein", "Protein (g)"], ["carbs", "Carbs (g)"], ["fat", "Fat (g)"], ["fiber", "Fiber (g)"], ["water", "Water (g)"],
  ["calcium", "Calcium (mg)"], ["potassium", "Potassium (mg)"], ["magnesium", "Magnesium (mg)"], ["iron", "Iron (mg)"], ["vitaminD", "Vitamin D (mcg)"], ["vitaminB12", "Vitamin B12 (mcg)"], ["omega3", "Omega-3 (mg)"],
] as const;

const nullableNumber = (value: FormDataEntryValue | null): number | null => String(value ?? "").trim() ? Number(value) : null;
const inputNumber = (value: number | null): number | "" => value === null ? "" : Number(value.toFixed(3));
const subscribeToHydration = (): (() => void) => () => {};
const getClientSnapshot = (): true => true;
const getServerSnapshot = (): false => false;

export default function BarcodeFoodScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<ScannerControls | null>(null);
  const animationRef = useRef<number | null>(null);
  const handledRef = useRef(false);
  const candidateRef = useRef<{ value: string; count: number }>({ value: "", count: 0 });
  const [active, setActive] = useState(false);
  const [code, setCode] = useState("");
  const [draft, setDraft] = useState<BarcodeFoodDraft | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const hydrated = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot);

  const stopCamera = useCallback(() => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    animationRef.current = null; controlsRef.current?.stop(); controlsRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const findFood = useCallback((barcode: string, scanned = false) => {
    const digits = barcode.replace(/\D/g, ""); stopCamera(); setCode(digits);
    if (scanned && !hasValidGtinCheckDigit(digits)) { setDraft(null); setCameraError("The camera read a barcode with an invalid check digit. Check the printed digits and enter them manually."); return; }
    setCameraError(null);
    startTransition(async () => {
      try { const result = await lookupFoodBarcode(digits); setDraft(result.draft); setCameraError(result.error); if (result.error) toast.error(result.error); }
      catch { setDraft(null); setCameraError("This barcode could not be looked up. Check the digits and enter it manually."); }
    });
  }, [stopCamera]);

  const startCamera = async (): Promise<void> => {
    stopCamera(); handledRef.current = false; candidateRef.current = { value: "", count: 0 }; setCameraError(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { setCameraError("Camera scanning requires HTTPS and a browser with camera support. Use photo upload or enter the barcode instead."); return; }
    const video = videoRef.current; if (!video) return;
    const acceptDetection = (match: string): void => {
      const digits = match.replace(/\D/g, "");
      candidateRef.current = candidateRef.current.value === digits ? { value: digits, count: candidateRef.current.count + 1 } : { value: digits, count: 1 };
      if (candidateRef.current.count >= 2 && !handledRef.current) { handledRef.current = true; findFood(digits, true); }
    };
    try {
      setActive(true);
      const Detector = (window as unknown as { BarcodeDetector?: NativeDetectorConstructor }).BarcodeDetector;
      if (Detector) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        streamRef.current = stream; video.srcObject = stream; await video.play();
        const detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
        const scan = async (): Promise<void> => {
          if (!streamRef.current || handledRef.current) return;
          try { const match = (await detector.detect(video))[0]?.rawValue; if (match) acceptDetection(match); if (handledRef.current) return; } catch { /* Keep scanning transient frames. */ }
          animationRef.current = requestAnimationFrame(() => void scan());
        };
        animationRef.current = requestAnimationFrame(() => void scan());
      } else {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        controlsRef.current = await reader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" } }, audio: false }, video, (result) => {
          if (result && !handledRef.current) acceptDetection(result.getText());
        });
      }
    } catch (error) {
      stopCamera();
      const name = error instanceof DOMException ? error.name : "";
      setCameraError(name === "NotAllowedError" ? "Camera permission was denied. Allow camera access in browser settings, upload a photo, or enter the barcode manually." : "The camera could not be started. Upload a photo or enter the barcode manually.");
    }
  };

  const scanPhoto = async (file: File): Promise<void> => {
    setCameraError(null); const url = URL.createObjectURL(file);
    try { const { BrowserMultiFormatReader } = await import("@zxing/browser"); const result = await new BrowserMultiFormatReader().decodeFromImageUrl(url); findFood(result.getText(), true); }
    catch { setCameraError("No supported barcode was found in that photo. Try a sharper, well-lit image or enter the digits manually."); }
    finally { URL.revokeObjectURL(url); }
  };

  return <details className={styles.nutritionCard}><summary><ScanBarcode /> Scan a food barcode</summary><div className={styles.barcodeScanner}>
    <p>Camera images stay on this device. Only the detected barcode is sent for lookup. The serving description is the package portion (such as 1 packet); its serving weight is used to calculate nutrition.</p>
    <div className={styles.scannerActions}><button type="button" disabled={pending || !hydrated} onClick={() => void startCamera()}><Camera />Use camera</button>{active ? <button type="button" onClick={stopCamera}><Square />Stop camera</button> : null}<label><ImageUp />Upload photo<input type="file" accept="image/*" capture="environment" onChange={(event) => { const file = event.target.files?.[0]; if (file) void scanPhoto(file); event.target.value = ""; }} /></label></div>
    {hydrated ? <video ref={videoRef} className={active ? styles.scannerVideo : styles.scannerVideoHidden} playsInline muted aria-label="Barcode camera preview" /> : null}
    {cameraError ? <p className={styles.scanError} role="alert">{cameraError}</p> : null}
    <form className={styles.manualBarcode} action={(form) => findFood(String(form.get("barcode") ?? ""))}><label><span>Barcode digits</span><input name="barcode" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 14))} inputMode="numeric" pattern="[0-9]{6,14}" minLength={6} maxLength={14} required /></label><button disabled={pending}>Look up</button></form>
    {pending ? <p aria-live="polite">Looking up barcode…</p> : null}
    {draft ? <form key={`${draft.externalId}-${draft.servingLabel}-${draft.servingGrams}`} className={styles.scannedFoodForm} action={(form) => startTransition(async () => { try { await saveScannedFood({ barcode: draft.barcode, source: draft.source, externalId: draft.externalId, name: String(form.get("name")), brand: String(form.get("brand") ?? "") || null, servingLabel: String(form.get("servingLabel")), servingGrams: nullableNumber(form.get("servingGrams")), ...Object.fromEntries(editableNutrients.map(([name]) => [name, nullableNumber(form.get(name))])) }); toast.success("Scanned food saved"); setDraft(null); } catch (error) { toast.error(error instanceof Error ? error.message : "Food could not be saved"); } })}>
      <div className={styles.scanSource}><b>{draft.sourceLabel}</b><span>{draft.barcode}</span><small>{draft.nutritionBasis === "PER_SERVING" ? "Values per serving" : "Values per 100 g"}</small></div>
      {draft.warnings.map((warning) => <p className={styles.scanWarning} key={warning}>{warning}</p>)}
      {draft.servingOptions.length > 1 ? <label><span>Choose nutrition portion</span><select value={draft.servingOptions.findIndex((option) => option.label === draft.servingLabel && option.grams === draft.servingGrams)} onChange={(event) => { const option = draft.servingOptions[Number(event.target.value)]; if (option) setDraft(selectBarcodeServing(draft, option)); }}>{draft.servingOptions.map((option, index) => <option key={`${option.label}-${option.grams}`} value={index}>{option.label} ({option.grams} g){option.basis === "PER_100_GRAMS" ? " — fallback" : ""}</option>)}</select></label> : null}
      <label><span>Food name</span><input name="name" defaultValue={draft.name} required /></label><label><span>Brand</span><input name="brand" defaultValue={draft.brand ?? ""} /></label><div className={styles.twoColumns}><label><span>Serving description</span><input name="servingLabel" defaultValue={draft.servingLabel} placeholder="Example: 1 packet" required /></label><label><span>Weight of one serving (g)</span><input name="servingGrams" type="number" min="0.01" step="0.01" defaultValue={inputNumber(draft.servingGrams)} /></label>{editableNutrients.map(([name, label]) => <label key={name}><span>{label}</span><input name={name} type="number" min="0" step="0.001" defaultValue={inputNumber(draft[name])} /></label>)}</div>
      <p className={styles.confirmNote}>Review every available value. Blank nutrients are saved as unknown, not zero.</p><div className={styles.scannerActions}><button disabled={pending}>Confirm and save</button><button type="button" onClick={() => setDraft(null)}>Cancel</button></div>
    </form> : null}
  </div></details>;
}
