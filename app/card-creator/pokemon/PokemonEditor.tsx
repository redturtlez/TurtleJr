"use client";
import { useEffect, useRef, useState } from "react";
import { decodeArtwork } from "../../../lib/card-creator/artwork";
import {
  availableStages,
  availableTypes,
  defaults,
  energyCardTypeLabels,
  eraLabels,
  isEvolvedStage,
  isExStage,
  isStandardExStage,
  labels,
  pokemonDownloadFilename,
  pokemonTypes,
  stageLabels,
  supertypeLabels,
  supportsFullArt,
  trainerTypeLabels,
  type PokemonCard,
} from "../../../lib/pokemon-card-creator/model";
import { exportPokemon, pokemonPrintGeometry, renderPokemon, type PokemonBleed } from "../../../lib/pokemon-card-creator/render";
import styles from "./pokemon.module.css";

export default function PokemonEditor() {
  const [card, setCard] = useState<PokemonCard>({ ...defaults });
  const [art, setArt] = useState<ImageBitmap | null>(null);
  const [evolutionArt, setEvolutionArt] = useState<ImageBitmap | null>(null);
  const [bleed, setBleed] = useState<PokemonBleed>(0);
  const [status, setStatus] = useState("Loading card graphics…");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const current = useRef<ImageBitmap | null>(null);
  const evolutionCurrent = useRef<ImageBitmap | null>(null);
  const url = useRef<string | null>(null);
  const geometry = pokemonPrintGeometry(bleed);
  useEffect(
    () => () => {
      current.current?.close();
      evolutionCurrent.current?.close();
      if (url.current) URL.revokeObjectURL(url.current);
    },
    [],
  );
  useEffect(() => {
    if (!canvas.current) return;
    let cancelled = false;
    setStatus("Loading card graphics and fonts…");
    renderPokemon(canvas.current, card, art, evolutionArt)
      .then(() => {
        if (!cancelled) {
          setStatus("Preview is up to date.");
          setError("");
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Preview failed.");
      });
    return () => {
      cancelled = true;
    };
  }, [card, art, evolutionArt]);
  const set = <K extends keyof PokemonCard>(key: K, value: PokemonCard[K]) => setCard((old) => ({ ...old, [key]: value }));
  async function choose(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const bitmap = await decodeArtwork(file);
      current.current?.close();
      current.current = bitmap;
      setArt(bitmap);
      setCard((old) => ({ ...old, artX: 0.5, artY: 0.5, artZoom: 1 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Artwork could not load.");
    } finally {
      setBusy(false);
    }
  }
  async function chooseEvolution(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const bitmap = await decodeArtwork(file);
      evolutionCurrent.current?.close();
      evolutionCurrent.current = bitmap;
      setEvolutionArt(bitmap);
      setCard((old) => ({ ...old, evolutionArtX: 0.5, evolutionArtY: 0.5, evolutionArtZoom: 1 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evolution artwork could not load.");
    } finally {
      setBusy(false);
    }
  }
  function removeEvolution() {
    evolutionCurrent.current?.close();
    evolutionCurrent.current = null;
    setEvolutionArt(null);
  }
  async function download() {
    setBusy(true);
    try {
      const blob = await exportPokemon(card, art, bleed, evolutionArt);
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url.current;
      a.download = pokemonDownloadFilename(card, bleed);
      a.click();
      setStatus("PNG prepared. Check your browser downloads.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }
  const text = (key: keyof PokemonCard, label: string, area = false) => (
    <div className={styles.field}>
      <label htmlFor={`pk-${key}`}>{label}</label>
      {area ? (
        <textarea id={`pk-${key}`} value={String(card[key])} maxLength={180} rows={3} onChange={(e) => set(key, e.target.value as never)} />
      ) : (
        <input id={`pk-${key}`} value={String(card[key])} maxLength={60} onChange={(e) => set(key, e.target.value as never)} />
      )}
    </div>
  );
  return (
    <main className={styles.page}>
      <header>
        <div>
          <p className={styles.eyebrow}>THE CARD WORKSHOP</p>
          <h1>Pokémon Card Creator</h1>
          <p>Create a modern custom card. Artwork remains on your device.</p>
        </div>
        <span>No sign-in needed</span>
      </header>
      <div className={styles.workspace}>
        <section className={styles.controls} aria-label="Pokémon card settings">
          <h2>Card & artwork</h2>
          <div className={styles.field}>
            <label htmlFor="pk-supertype">Card family</label>
            <select id="pk-supertype" value={card.supertype} onChange={(e) => set("supertype", e.target.value as PokemonCard["supertype"])}>
              {(["pokemon", "trainer", "energy"] as const).map((value) => (
                <option key={value} value={value}>
                  {supertypeLabels[value]}
                </option>
              ))}
            </select>
          </div>
          {card.supertype === "pokemon" ? (
            <>
              <div className={styles.field}>
                <label htmlFor="pk-era">Card era</label>
                <select
                  id="pk-era"
                  value={card.era}
                  onChange={(e) => {
                    const era = e.target.value as PokemonCard["era"];
                    setCard((old) => ({ ...old, era, stage: availableStages(era).includes(old.stage) ? old.stage : "basic" }));
                  }}
                >
                  {(["swordAndShield", "scarletAndViolet"] as const).map((value) => (
                    <option key={value} value={value}>
                      {eraLabels[value]}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="pk-type">Energy type</label>
                  <select id="pk-type" value={card.type} onChange={(e) => set("type", e.target.value as PokemonCard["type"])}>
                    {availableTypes(card.stage).map((v) => (
                      <option key={v} value={v}>
                        {labels[v]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="pk-stage">Stage</label>
                  <select
                    id="pk-stage"
                    value={card.stage}
                    onChange={(e) => {
                      const stage = e.target.value as PokemonCard["stage"];
                      setCard((old) => ({ ...old, stage, type: availableTypes(stage).includes(old.type) ? old.type : "colorless" }));
                    }}
                  >
                    {availableStages(card.era).map((v) => (
                      <option key={v} value={v}>
                        {stageLabels[v]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {supportsFullArt(card) && (
                <div className={styles.field}>
                  <label htmlFor="pk-illustration-style">Artwork frame</label>
                  <select id="pk-illustration-style" value={card.illustrationStyle} onChange={(e) => set("illustrationStyle", e.target.value as PokemonCard["illustrationStyle"])}>
                    <option value="standard">Standard</option>
                    <option value="fullArt">Full Art illustration</option>
                  </select>
                </div>
              )}
              {card.stage === "v" && (
                <div className={styles.field}>
                  <label htmlFor="pk-v-style">V frame style</label>
                  <select id="pk-v-style" value={card.vStyle} onChange={(e) => set("vStyle", e.target.value as PokemonCard["vStyle"])}>
                    <option value="fullArt">Full Art</option>
                    <option value="goldenFullArt">Golden Full Art</option>
                  </select>
                </div>
              )}
              {card.stage === "vmax" && (
                <div className={styles.field}>
                  <label htmlFor="pk-vmax-variation">VMAX variation</label>
                  <select id="pk-vmax-variation" value={card.vmaxVariation} onChange={(e) => set("vmaxVariation", e.target.value as PokemonCard["vmaxVariation"])}>
                    <option value="dynamax">Dynamax</option>
                    <option value="gigantamax">Gigantamax</option>
                  </select>
                </div>
              )}
              {isStandardExStage(card.stage) && (
                <div className={styles.field}>
                  <label htmlFor="pk-ex-variation">ex frame style</label>
                  <select
                    id="pk-ex-variation"
                    value={card.exVariation}
                    onChange={(e) => {
                      const exVariation = e.target.value as PokemonCard["exVariation"];
                      setCard((old) => ({ ...old, exVariation, illustrationStyle: exVariation === "tera" ? "standard" : old.illustrationStyle }));
                    }}
                  >
                    <option value="standard">Standard ex</option>
                    <option value="tera">Tera ex</option>
                  </select>
                </div>
              )}
              <div className={styles.row}>
                {text("name", "Pokémon name")}
                {text("hp", "HP")}
              </div>
              <div className={styles.row}>
                {text("subname", "Subname")}
                {text("suffix", "Suffix")}
              </div>
              <fieldset>
                <legend>Name formatting</legend>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label htmlFor="pk-name-color">Color</label>
                    <input id="pk-name-color" type="color" value={card.nameColor} onChange={(e) => set("nameColor", e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="pk-name-size">Size ({card.nameSize}px)</label>
                    <input id="pk-name-size" type="range" min="28" max="58" value={card.nameSize} onChange={(e) => set("nameSize", Number(e.target.value))} />
                  </div>
                </div>
                <div className={styles.checks}>
                  <label>
                    <input type="checkbox" checked={card.nameBold} onChange={(e) => set("nameBold", e.target.checked)} /> Bold
                  </label>
                  <label>
                    <input type="checkbox" checked={card.nameItalic} onChange={(e) => set("nameItalic", e.target.checked)} /> Italic
                  </label>
                </div>
              </fieldset>
              {isEvolvedStage(card.stage) && (
                <>
                  {text("evolvesFrom", "Evolves from")}
                  <EvolutionArtworkControls card={card} art={evolutionArt} set={set} choose={chooseEvolution} remove={removeEvolution} />
                </>
              )}
              <div className={styles.upload}>
                <label htmlFor="pk-art">Choose artwork</label>
                <input
                  id="pk-art"
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => {
                    void choose(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <p>PNG or JPEG · up to 10 MB and 16 megapixels.</p>
                {art && (
                  <>
                    <div className={styles.field}>
                      <label htmlFor="pk-x">Horizontal crop</label>
                      <input id="pk-x" type="range" min="0" max="1" step=".01" value={card.artX} onChange={(e) => set("artX", Number(e.target.value))} />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="pk-y">Vertical crop</label>
                      <input id="pk-y" type="range" min="0" max="1" step=".01" value={card.artY} onChange={(e) => set("artY", Number(e.target.value))} />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="pk-zoom">Zoom</label>
                      <input id="pk-zoom" type="range" min="1" max="4" step=".01" value={card.artZoom} onChange={(e) => set("artZoom", Number(e.target.value))} />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        current.current?.close();
                        current.current = null;
                        setArt(null);
                      }}
                    >
                      Remove artwork
                    </button>
                  </>
                )}
              </div>
              <h2>Ability & attacks</h2>
              {text("abilityName", "Ability name")}
              {text("abilityText", "Ability text", true)}
              <MoveFields number={1} card={card} set={set} />
              <MoveFields number={2} card={card} set={set} />
              <h2>Card details</h2>
              <div className={styles.row}>
                <TypeSelect label="Weakness" value={card.weakness} onChange={(v) => set("weakness", v)} />
                {text("weaknessAmount", "Weakness modifier")}
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="pk-resistance">Resistance</label>
                  <select id="pk-resistance" value={card.resistance} onChange={(e) => set("resistance", e.target.value as PokemonCard["resistance"])}>
                    <option value="none">None</option>
                    {pokemonTypes.map((v) => (
                      <option key={v} value={v}>
                        {labels[v]}
                      </option>
                    ))}
                  </select>
                </div>
                {text("resistanceAmount", "Resistance modifier")}
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="pk-retreat">Retreat cost</label>
                  <select id="pk-retreat" value={card.retreat} onChange={(e) => set("retreat", Number(e.target.value))}>
                    {[0, 1, 2, 3, 4].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
                <TypeSelect label="Retreat energy" value={card.retreatType} onChange={(v) => set("retreatType", v)} />
              </div>
              {card.stage !== "v" && card.stage !== "vmax" && !isExStage(card.stage) && card.illustrationStyle !== "fullArt" && (
                <>
                  <DexFields card={card} set={set} />
                  {text("flavorText", "Flavor text", true)}
                </>
              )}
              <CollectorFields card={card} set={set} />
            </>
          ) : (
            <NonPokemonControls
              card={card}
              set={set}
              art={art}
              choose={choose}
              removeArt={() => {
                current.current?.close();
                current.current = null;
                setArt(null);
              }}
            />
          )}
          <button className={styles.reset} type="button" onClick={() => setCard({ ...defaults })}>
            Reset card
          </button>
        </section>
        <section className={styles.preview}>
          <div className={styles.previewHeader}>
            <h2>Live preview</h2>
            <span>
              {card.supertype === "pokemon"
                ? `${eraLabels[card.era]} · ${labels[card.type]} · ${stageLabels[card.stage]}${isStandardExStage(card.stage) && card.exVariation === "tera" ? " · Tera" : supportsFullArt(card) && card.illustrationStyle === "fullArt" ? " · Full Art" : ""}`
                : card.supertype === "trainer"
                  ? trainerTypeLabels[card.trainerType] + (card.trainerType === "supporter" && card.supporterStyle === "fullArt" ? " · Full Art" : "")
                  : energyCardTypeLabels[card.energyCardType]}
            </span>
          </div>
          <div className={styles.stage}>
            <canvas ref={canvas} width={747} height={1038}>
              Canvas preview unavailable.
            </canvas>
          </div>
          <p role="status">{error || status}</p>
          <div className={styles.field}>
            <label htmlFor="pk-bleed">Print bleed</label>
            <select id="pk-bleed" value={bleed} onChange={(e) => setBleed(Number(e.target.value) as PokemonBleed)}>
              <option value={0}>None — 63.5 × 88.9 mm</option>
              <option value={1}>1 mm per edge — 65.5 × 90.9 mm</option>
              <option value={2}>2 mm per edge — 67.5 × 92.9 mm</option>
            </select>
          </div>
          <button type="button" disabled={busy || !!error} onClick={() => void download()}>
            {busy ? "Working…" : "Download 300 PPI PNG"}
          </button>
          <p className={styles.note}>
            {geometry.width} × {geometry.height} pixels · 300 PPI. Trim size: 63.5 × 88.9 mm.
          </p>
          {bleed > 0 && <p className={styles.note}>Bleed extends only sampled outer-border pixels beneath the unchanged trim card, including its rounded transparent corners.</p>}
          <p className={styles.note}>Includes Pokémon, Trainer, and Energy card families.</p>
          <p className={styles.attribution}>Adapted with permission from Pokécardmaker.net.</p>
        </section>
      </div>
    </main>
  );
}
function CollectorFields({ card, set }: { card: PokemonCard; set: Setter }) {
  return (
    <details>
      <summary>Collector details</summary>
      <div className={styles.field}>
        <label htmlFor="pk-illustrator">Illustrator</label>
        <input id="pk-illustrator" value={card.illustrator} maxLength={60} onChange={(e) => set("illustrator", e.target.value)} />
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="pk-set-code">Set code</label>
          <input id="pk-set-code" value={card.setCode} maxLength={16} onChange={(e) => set("setCode", e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="pk-card-number">Card number</label>
          <input id="pk-card-number" value={card.cardNumber} maxLength={12} onChange={(e) => set("cardNumber", e.target.value)} />
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="pk-set-total">Set total</label>
          <input id="pk-set-total" value={card.setTotal} maxLength={12} onChange={(e) => set("setTotal", e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="pk-regulation-letter">Regulation letter</label>
          <input id="pk-regulation-letter" value={card.regulationLetter} maxLength={1} onChange={(e) => set("regulationLetter", e.target.value)} />
        </div>
      </div>
      <div className={styles.checks}>
        <label>
          <input type="checkbox" checked={card.showRegulation} onChange={(e) => set("showRegulation", e.target.checked)} /> Show regulation mark
        </label>
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="pk-set-mark">Set mark</label>
          <select id="pk-set-mark" value={card.setMark} onChange={(e) => set("setMark", e.target.value as PokemonCard["setMark"])}>
            <option value="none">None</option>
            <option value="era">Era mark</option>
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="pk-rarity">Rarity symbol</label>
          <select id="pk-rarity" value={card.rarity} onChange={(e) => set("rarity", e.target.value as PokemonCard["rarity"])}>
            <option value="none">None</option>
            <option value="common">Common</option>
            <option value="uncommon">Uncommon</option>
            <option value="rare">Rare</option>
          </select>
        </div>
      </div>
      <CopyrightField card={card} set={set} />
    </details>
  );
}
function CopyrightField({ card, set }: { card: PokemonCard; set: Setter }) {
  return (
    <div className={styles.field}>
      <label htmlFor="pk-copyright">Copyright line</label>
      <input id="pk-copyright" value={card.copyrightText} maxLength={120} onChange={(e) => set("copyrightText", e.target.value)} />
      <p className={styles.note}>Leave blank for a clean bottom border.</p>
    </div>
  );
}
function EvolutionArtworkControls({
  card,
  art,
  set,
  choose,
  remove,
}: {
  card: PokemonCard;
  art: ImageBitmap | null;
  set: Setter;
  choose: (file?: File) => Promise<void>;
  remove: () => void;
}) {
  return (
    <div className={styles.upload}>
      <label htmlFor="pk-evolution-art">Pre-evolution artwork (optional)</label>
      <input
        id="pk-evolution-art"
        type="file"
        accept="image/png,image/jpeg"
        onChange={(e) => {
          void choose(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <p>Shown inside the card&apos;s Stage portrait window. The evolution name remains available without an image.</p>
      {art && (
        <>
          <div className={styles.field}>
            <label htmlFor="pk-evolution-x">Horizontal crop</label>
            <input id="pk-evolution-x" type="range" min="0" max="1" step=".01" value={card.evolutionArtX} onChange={(e) => set("evolutionArtX", Number(e.target.value))} />
          </div>
          <div className={styles.field}>
            <label htmlFor="pk-evolution-y">Vertical crop</label>
            <input id="pk-evolution-y" type="range" min="0" max="1" step=".01" value={card.evolutionArtY} onChange={(e) => set("evolutionArtY", Number(e.target.value))} />
          </div>
          <div className={styles.field}>
            <label htmlFor="pk-evolution-zoom">Zoom</label>
            <input id="pk-evolution-zoom" type="range" min="1" max="4" step=".01" value={card.evolutionArtZoom} onChange={(e) => set("evolutionArtZoom", Number(e.target.value))} />
          </div>
          <button type="button" onClick={remove}>
            Remove pre-evolution artwork
          </button>
        </>
      )}
    </div>
  );
}
function NonPokemonControls({
  card,
  set,
  art,
  choose,
  removeArt,
}: {
  card: PokemonCard;
  set: Setter;
  art: ImageBitmap | null;
  choose: (file?: File) => Promise<void>;
  removeArt: () => void;
}) {
  const named = card.supertype === "trainer" || card.energyCardType === "special";
  return (
    <>
      <div className={styles.row}>
        {card.supertype === "trainer" ? (
          <div className={styles.field}>
            <label htmlFor="pk-trainer-type">Trainer type</label>
            <select id="pk-trainer-type" value={card.trainerType} onChange={(e) => set("trainerType", e.target.value as PokemonCard["trainerType"])}>
              {(["item", "tool", "supporter", "stadium"] as const).map((value) => (
                <option key={value} value={value}>
                  {trainerTypeLabels[value]}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className={styles.field}>
            <label htmlFor="pk-energy-card-type">Energy card type</label>
            <select id="pk-energy-card-type" value={card.energyCardType} onChange={(e) => set("energyCardType", e.target.value as PokemonCard["energyCardType"])}>
              {(["base", "special"] as const).map((value) => (
                <option key={value} value={value}>
                  {energyCardTypeLabels[value]}
                </option>
              ))}
            </select>
          </div>
        )}
        {card.supertype === "energy" && <TypeSelect label="Energy symbol" value={card.energySymbol} onChange={(value) => set("energySymbol", value)} />}
      </div>
      {card.supertype === "trainer" && card.trainerType === "supporter" && (
        <div className={styles.field}>
          <label htmlFor="pk-supporter-style">Supporter frame</label>
          <select id="pk-supporter-style" value={card.supporterStyle} onChange={(e) => set("supporterStyle", e.target.value as PokemonCard["supporterStyle"])}>
            <option value="standard">Standard</option>
            <option value="fullArt">Full Art</option>
          </select>
        </div>
      )}
      {card.supertype === "energy" && card.energyCardType === "special" && (
        <div className={styles.field}>
          <label htmlFor="pk-energy-symbol-count">Energy symbols</label>
          <select id="pk-energy-symbol-count" value={card.energySymbolAmount} onChange={(e) => set("energySymbolAmount", Number(e.target.value))}>
            {[1, 2, 3, 4].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      )}
      {named && (
        <>
          <div className={styles.field}>
            <label htmlFor="pk-name">Card name</label>
            <input id="pk-name" value={card.name} maxLength={60} onChange={(e) => set("name", e.target.value)} />
          </div>
          <fieldset>
            <legend>Name formatting</legend>
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="pk-name-color">Color</label>
                <input id="pk-name-color" type="color" value={card.nameColor} onChange={(e) => set("nameColor", e.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="pk-name-size">Size ({card.nameSize}px)</label>
                <input id="pk-name-size" type="range" min="28" max="58" value={card.nameSize} onChange={(e) => set("nameSize", Number(e.target.value))} />
              </div>
            </div>
            <div className={styles.checks}>
              <label>
                <input type="checkbox" checked={card.nameBold} onChange={(e) => set("nameBold", e.target.checked)} /> Bold
              </label>
              <label>
                <input type="checkbox" checked={card.nameItalic} onChange={(e) => set("nameItalic", e.target.checked)} /> Italic
              </label>
            </div>
          </fieldset>
          <div className={styles.field}>
            <label htmlFor="pk-description">Card text</label>
            <textarea id="pk-description" value={card.description} maxLength={520} rows={6} onChange={(e) => set("description", e.target.value)} />
          </div>
        </>
      )}
      <div className={styles.upload}>
        <label htmlFor="pk-art">Choose artwork</label>
        <input
          id="pk-art"
          type="file"
          accept="image/png,image/jpeg"
          onChange={(e) => {
            void choose(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <p>PNG or JPEG · up to 10 MB and 16 megapixels.</p>
        {art && (
          <>
            <div className={styles.field}>
              <label htmlFor="pk-x">Horizontal crop</label>
              <input id="pk-x" type="range" min="0" max="1" step=".01" value={card.artX} onChange={(e) => set("artX", Number(e.target.value))} />
            </div>
            <div className={styles.field}>
              <label htmlFor="pk-y">Vertical crop</label>
              <input id="pk-y" type="range" min="0" max="1" step=".01" value={card.artY} onChange={(e) => set("artY", Number(e.target.value))} />
            </div>
            <div className={styles.field}>
              <label htmlFor="pk-zoom">Zoom</label>
              <input id="pk-zoom" type="range" min="1" max="4" step=".01" value={card.artZoom} onChange={(e) => set("artZoom", Number(e.target.value))} />
            </div>
            <button type="button" onClick={removeArt}>
              Remove artwork
            </button>
          </>
        )}
      </div>
      {card.energyCardType !== "base" || card.supertype === "trainer" ? <CollectorFields card={card} set={set} /> : <CopyrightField card={card} set={set} />}
    </>
  );
}
type Setter = <K extends keyof PokemonCard>(key: K, value: PokemonCard[K]) => void;
function TypeSelect({ label, value, onChange }: { label: string; value: PokemonCard["type"]; onChange: (v: PokemonCard["type"]) => void }) {
  const id = `pk-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as PokemonCard["type"])}>
        {pokemonTypes.map((v) => (
          <option key={v} value={v}>
            {labels[v]}
          </option>
        ))}
      </select>
    </div>
  );
}
function DexFields({ card, set }: { card: PokemonCard; set: Setter }) {
  return (
    <fieldset>
      <legend>Pokédex information</legend>
      <div className={styles.field}>
        <label htmlFor="pk-dex-mode">Units and formatting</label>
        <select id="pk-dex-mode" value={card.dexMode} onChange={(e) => set("dexMode", e.target.value as PokemonCard["dexMode"])}>
          <option value="imperial">Imperial</option>
          <option value="metric">Metric</option>
          <option value="custom">Custom text</option>
        </select>
      </div>
      {card.dexMode === "custom" ? (
        <div className={styles.field}>
          <label htmlFor="pk-dex-custom">Custom Pokédex line</label>
          <input id="pk-dex-custom" value={card.dexStats} maxLength={100} onChange={(e) => set("dexStats", e.target.value)} />
        </div>
      ) : (
        <>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="pk-dex-number">Number</label>
              <input id="pk-dex-number" value={card.dexNumber} maxLength={8} onChange={(e) => set("dexNumber", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="pk-dex-category">Category</label>
              <input id="pk-dex-category" value={card.dexCategory} maxLength={28} onChange={(e) => set("dexCategory", e.target.value)} />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="pk-dex-height">Height ({card.dexMode === "metric" ? "m" : "ft/in"})</label>
              <input id="pk-dex-height" value={card.dexHeight} maxLength={14} onChange={(e) => set("dexHeight", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="pk-dex-weight">Weight ({card.dexMode === "metric" ? "kg" : "lbs."})</label>
              <input id="pk-dex-weight" value={card.dexWeight} maxLength={14} onChange={(e) => set("dexWeight", e.target.value)} />
            </div>
          </div>
        </>
      )}
    </fieldset>
  );
}
function MoveFields({ number, card, set }: { number: 1 | 2; card: PokemonCard; set: Setter }) {
  const prefix = `move${number}` as const,
    energyKey = `${prefix}Energy` as const,
    energy = card[energyKey];
  function setEnergy(index: number, value: string) {
    const next = [...energy];
    if (value === "none") next.splice(index, 1);
    else next[index] = value as PokemonCard["type"];
    set(energyKey, next);
  }
  return (
    <fieldset>
      <legend>Attack {number}</legend>
      <div className={styles.row}>
        <div className={styles.field}>
          <label>Name</label>
          <input value={card[`${prefix}Name`]} onChange={(e) => set(`${prefix}Name`, e.target.value)} />
        </div>
        <div className={styles.field}>
          <label>Damage</label>
          <input value={card[`${prefix}Damage`]} onChange={(e) => set(`${prefix}Damage`, e.target.value)} />
        </div>
      </div>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>Energy cost</span>
        <div className={styles.energySlots}>
          {[0, 1, 2, 3].map((index) => (
            <select
              key={index}
              aria-label={`Attack ${number} energy ${index + 1}`}
              value={energy[index] ?? "none"}
              disabled={index > energy.length}
              onChange={(e) => setEnergy(index, e.target.value)}
            >
              <option value="none">None</option>
              {pokemonTypes.map((v) => (
                <option key={v} value={v}>
                  {labels[v]}
                </option>
              ))}
            </select>
          ))}
        </div>
      </div>
      <div className={styles.field}>
        <label>Description</label>
        <textarea rows={2} value={card[`${prefix}Text`]} onChange={(e) => set(`${prefix}Text`, e.target.value)} />
      </div>
    </fieldset>
  );
}
