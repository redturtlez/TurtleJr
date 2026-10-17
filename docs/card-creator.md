# Card creator — Phases 4 and 5

The route has been verified in the real Next.js development runtime and with
`npm run build`. Stop `next dev` before running a production build; both commands
write to `.next`, so running them together can temporarily remove the development
server's generated CSS.

The public `/card-creator/yugioh` page requires no login. `/card-creator` is now the
shared creator chooser. Existing Clerk proxy still protects `/todo`, `/budget`,
and `/health`; no authentication infrastructure was changed.

The page uses the site's shared CSS color variables and is linked from primary
navigation. Navigation switches to its accessible hamburger layout below 1280px.

The Normal Monster editor uses React controls and one Canvas 2D drawing path.
It supports nine text fields, seven attributes, levels 1–12, optional sticker,
local artwork, reset and layout guides. Text shrinks/wraps within inferred regions;
text that cannot fit is omitted with an explicit field error rather than clipped.
Substitute system serif fonts are labelled in the UI. Original-font fidelity,
Photoshop text justification and cross-platform identical glyphs are not claimed.

PNG/JPEG inputs are limited to 10 MiB, 8192 pixels per side and 16 million pixels.
Header signatures/dimensions are checked before decoding and decoded dimensions
are checked again. Artwork is center-cropped. ImageBitmaps are closed on replacement,
removal and unmount; stale asynchronous uploads are discarded. No uploaded images,
drafts or field values are sent to a server or persisted in browser storage.

## Files and verification

- [Page](../app/card-creator/yugioh/page.tsx) and [editor](../app/card-creator/yugioh/CardEditor.tsx).
- [Rendering](../lib/card-creator/render.ts), [text/crop layout](../lib/card-creator/layout.ts),
  [upload validation](../lib/card-creator/artwork.ts) and [model](../lib/card-creator/model.ts).
- [Prepared manifest](../lib/card-creator/normal.json), 63 selected PNGs in
  [public graphics](../public/card-creator/normal/), and five licensed TTFs in
  [public fonts](../public/card-creator/fonts/). No source PSD, source artwork,
  cached dynamic text, parser or Python dependency is deployed with this feature.
- [Preparation script](../scripts/prepare-card-template.cjs) bridges the approved
  Phase 3 output locally and checks hashes; it refuses to overwrite differing assets.

Run from this repository:

```powershell
node scripts/card-creator-check.cjs
node scripts/card-creator-check.cjs --serve
```

The second command serves the actual editor component in a credential-free local
harness at http://127.0.0.1:4173, with only local React and template resources.
It does not exercise Next routing or the shared Clerk layout. Six automated checks
cover public-route configuration, values, asset checksums/order, crop geometry,
wrapping and upload headers. Strict targeted TypeScript and ESLint checks passed.
Browser checks covered overflow reporting, invalid stats, reset, PNG upload,
malformed image rejection, removal and a 390px viewport without horizontal overflow.
Full Next app integration/build was not run because it loads existing environment
configuration; production/runtime route verification remains outstanding.

No deployment or asset publication was performed. Source artwork and all alternative
templates remain private in the independent extractor.

## PNG export and bleed

The Yu-Gi-Oh editor also offers a digital-use export with transparent 1 mm
rounded corners (12 px at 300 PPI). Rounded mode uses the 59 × 86 mm trim canvas
without bleed. Print exports remain square so the printer or physical corner die
can perform the cut.

[Print module](../lib/card-creator/print.ts) uses the same draw path as preview.
At 300 PPI, dimensions are rounded from millimetres using 25.4 mm/inch:

| Bleed per edge | Physical output | PNG pixels |
| --- | --- | --- |
| 0 mm | 59 × 86 mm | 697 × 1016 |
| 1 mm | 61 × 88 mm | 720 × 1039 |
| 2 mm | 63 × 90 mm | 744 × 1063 |

The trim is always 697 × 1016. Source-coordinate rendering (813 × 1185) is mapped
to that rounded trim rectangle with high-quality resampling. The tiny ratio change
is explicit: source and rounded print rectangles are not mathematically identical
ratios. This mapping is constant across all bleed choices. Integer centering may
allocate one more pixel to bottom/right, avoiding fractional-offset resampling of
the trim. Changing bleed never scales internal content.

Bleed repeats the separate outer border asset's edge pixels and corners only.
This is a limited edge-extension fallback, not recovered source material outside
the PSD. It may streak; the UI reports the limitation. An authored extended border
or a print shop's preferred margin treatment remains an alternative.

Preview shows the same export geometry. Download rerenders without guides, refuses
invalid/unfitted text, awaits fonts and embeds pHYs at 11811 pixels/metre (approximately
300 PPI). Print software may ignore this hint: print at the stated physical size,
without fit-to-page. File creation and download stay local; object URLs are released.
Names are fixed safe filenames and do not use user text.

## Supplied TCG fonts

The root archive was inspected and six TTFs were extracted locally with the already
installed UnRAR tool. No system-font changes were made. The original archive remains
unchanged and ignored. It has no accompanying license file and its OS/2 metadata has
restrictive embedding flags. On 2026-10-11, the user explicitly confirmed that their
license permits public web embedding and redistribution of these supplied files.

[Font loader](../lib/card-creator/fonts.ts) now loads five self-hosted TTF assets
automatically from [public fonts](../public/card-creator/fonts/). Matrix Small Caps 2
is used for names, Stone Serif italic for lore, Stone Serif small-caps bold for type,
Matrix Book for effect/card text, and Stone Semibold for editions. FontFaces are
released on unmount. No upload or system-font installation is required. The archive
still lacks the PSD's exact MatrixBoldSmallCaps and Stone Serif Medium faces, so
numeric/footer substitutions remain documented approximations.

Phase 5 checks: eight automated tests, strict targeted TypeScript and lint passed.
Browser loaded all four font roles and decoded exported PNGs at all three sizes.
The trim pixels were identical across bleed choices; preview matched decoded PNG
pixels exactly with guides off. Output was opaque; the download button prepared
the PNG. The integrated browser did not emit a download event, so an on-disk browser
download is not verified. These checks use the credential-free harness, not the full Next runtime.
# Typography and edition adjustments

## Template options (2026-10-11)

Normal, Effect, Fusion, Ritual, Synchro, Xyz and Link Monster, plus Spell and Trap Cards, are available. Switching preserves entered text/artwork
and all finishing options. Effect adds / EFFECT to the rendered type once, uses
upright Matrix Book for description, and has its original PSD frame. The font loads
automatically with the editor. Normal retains its approved
parameters. Export filenames identify the chosen template.

The Effect and Fusion recipes are in ../psd-extractor/recipes/ relative to the
website root; run `node scripts/prepare-card-variants.cjs` to verify/copy their
frames and generate compact manifests. Fusion includes a dedicated materials line
above its effect text and automatically renders / FUSION / EFFECT in the type line.
Ritual uses its blue PSD frame, Matrix Book effect text and automatically renders
/ RITUAL / EFFECT in the type line.
Synchro uses its white PSD frame, Matrix Book text, / SYNCHRO / EFFECT, and a
dedicated Synchro-materials line. Fusion and Synchro share the stored materials
value so switching between them does not discard user input. The Synchro suffix is
an evidence-based inference because the PSD has no dedicated Synchro type specimen.
Xyz uses its black PSD frame and the twelve original Rank symbols, aligned from
left to right. Its control is labelled Rank, it shares the summoning-materials
field, and it renders / XYZ / EFFECT. A default black title becomes white on first
selection for legibility; users can still select any title color.
Link uses its original blue PSD frame, fixed LINK label and all eight original
directional arrow overlays. The user selects arrows directly; Link Rating is the
number selected and cannot drift out of sync. Link has no Level stars or DEF field,
renders ATK/LINK, shares the materials/effect layout, and appends / LINK / EFFECT.
Spell and Trap use their original PSD frames and shared Matrix Book card-text
region. Spell supports Normal, Continuous, Equip, Field, Quick-Play and Ritual;
Trap supports Normal, Continuous and Counter. Non-Normal choices use the original
PSD icons inside the type-line brackets. Their original Spell and Trap attribute
emblems render in the top-right nameplate. Card text scales down from the PSD's
29.46431px 1–5-line specimen when needed. These templates hide monster-only Attribute, Level/Rank, materials,
ATK and DEF controls. Invalid subtype values reset to Normal when switching families.
Existing Normal preparation stays independent. Both scripts reject modified outputs rather than silently replacing.
The template registry in lib/card-creator/model.ts holds the variant mechanics and
geometry. Pendulum remains intentionally deferred at the user’s direction.

## Automatic font loading

The five mapped TTFs are self-hosted and loaded through FontFace when the editor
mounts. Preview and export wait while loading; the UI reports success or failure.
The user confirmed public web-embedding and redistribution rights before these
assets were copied into the site. Refreshing now reloads them automatically.

## Positioning and text refinement (2026-10-11)

After upload, horizontal/vertical crop sliders select the visible region; zoom
ranges from 1x to 4x. At minimum zoom, an axis with no spare image area cannot pan.
Reset artwork position restores centered cover; a replacement upload does too.
Crop parameters are validated and shared by preview/export.

This update supersedes the Times stat mapping below: loaded Matrix Small Caps is
used with synthetic bold and up to42px fitting. Exact MatrixBoldSmallCaps remains
missing. Description uses 98% horizontal scale, 1em minimum line advance and
justified lines except paragraph endings, matching the reference layout more
closely. Type letters are 2px lower relative to brackets; field bounds are unchanged.

## PSD typography audit (2026-10-10)

The unchanged source hash matches the cached full inventory. Treat that inventory
as this template's authority, not a universal specification for every printing era.

| Field | PSD evidence | Browser mapping |
| --- | --- | --- |
| Name | MatrixRegularSmallCaps | Supplied Matrix Small Caps |
| Type | StoneSerifITCPro-Bold; initial 48.54531 vs caps 40.96011 | Supplied Stone Small Caps Bold, uppercase runs with PSD size ratio |
| Normal lore | StoneSerifITCPro-MediumItalic; transformed size about 27.6px | Supplied Stone Serif LT Italic, 28px maximum |
| ATK/DEF | MatrixBoldSmallCaps | Times New Roman Bold substitute |
| Serial/set/credit | StoneSerifITCPro-Medium | Times New Roman Regular substitute; credit uppercase |
| Edition | Stone Serif Semibold plus Bold st | Supplied Stone Semibold with smaller raised st |

Font loading remains local to the browser session. Select all supplied TTFs together;
loading another selection replaces the previous selection. Missing description/type
faces are now named in the status message. Register italic/bold faces with matching
FontFace descriptors; do not apply synthetic italic to an already italic face.

Research: the [publisher's Medium Italic listing](https://www.myfonts.com/products/pro-medium-italic-stone-serif-363597)
confirms the face; [Stone's specimen](https://stonetypefoundry.com/Resources/ITC%20Stone%20Specimen%20Book.pdf)
documents the family. These do not certify the archive's modified TTFs as exact
matches to the PSD or establish a universal official Yu-Gi-Oh font specification.

Sticker choices are None, Silver (existing Holo Sticker 3), Gold (visually reviewed
hidden Holo Sticker 4, raw layer 95b63bee4e0f02838c20a5f2). No recoloring. Credit's
right edge is 732 with a sticker and 785 without; guides and export share bounds.
The bridge verifies all 26 assets, including the pinned gold PNG checksum.

Load the supplied local TTFs after refreshing. Matrix Small Caps supplies the name;
Stone Serif Semibold supplies edition, registered at weight 600. Regular Times New
Roman supplies serial, set and credit; bold Times supplies stat numerals, calibrated
against the supplied Dolly examples. The archive has no regular Stone or exact
bold Matrix face; system-serif substitutions remain platform-dependent.

Edition presets: None, 1st Edition (smaller raised st), Limited Edition, Duel
Terminal. Title colors have eight named presets and a custom color picker. Silver
and gold are flat colors, not foil effects. All positions remain unchanged.

Credit automatically receives one copyright symbol when nonempty. Under Edition &
finishing details, choose bottom placement or the set-ID line below artwork.
The alternate region is inferred editor geometry. Preview, guides and PNG export
share the selected placement; the source PSD and raw manifest are unchanged.

## Pokémon eras

The Pokémon editor supports Sword & Shield and Scarlet & Violet as explicit eras.
Sword & Shield retains Basic, Stage 1, Stage 2, V, and VMAX plus the existing
Trainer and Energy families. Scarlet & Violet currently supports the standard
Basic, Stage 1, and Stage 2 Pokémon templates for all eleven selectable types.

Scarlet & Violet uses its native 745 × 1040 frame sources and dedicated layout
coordinates. Its attack, weakness, resistance, and retreat symbols use the local
Scarlet & Violet icon set. Export still scales the composed trim card to the shared
63.5 × 88.9 mm, 300 PPI output before optional bleed is added.

Only the 33 frames and 11 type icons required by these templates are deployed.
The complete authorized source mirror remains a local inventory and must not be
copied wholesale into the application's public assets.

### Scarlet & Violet Pokémon ex

Scarlet & Violet also supports Pokémon ex, Stage 1 ex, and Stage 2 ex for all
eleven selectable types. These templates use full-card artwork beneath transparent
745 × 1040 overlays, the local Scarlet & Violet ex name symbol, their dedicated
attack geometry, and the printed two-Prize rule panel. Pokédex statistics and flavor
text are omitted because these frames do not provide those regions.

Only 33 ex frames and the one ex name symbol were copied from the authorized local
inventory. Mega ex, Stellar Tera, Ancient/Future, and full-art ex variants remain separate
future templates because they require different overlays and layout recipes.

Standard Tera ex is now available as an ex-frame style for Basic ex, Stage 1 ex,
and Stage 2 ex across all eleven types. The 33 selected Tera overlays add the crystal
border and printed Tera rule while sharing the verified standard ex typography and
attack geometry. Stellar Tera and Tera full-art/golden variants remain deferred.

The ex overlays make their attack panel partially transparent. The renderer places
the matching type-specific Scarlet & Violet paper texture beneath that panel before
drawing the ex overlay, so Standard and Tera ex retain visible grain even when no
artwork is uploaded. Full-card artwork remains visible outside the textured panel.

Mega ex is available as Basic Mega ex, Stage 1 Mega ex, and Stage 2 Mega ex across
all eleven types. These 33 overlays share the textured ex attack layout and add the
three-Prize Mega Evolution rule. The renderer supplies the yellow outlined “Mega”
name treatment, the dedicated Mega ex symbol, and the top-right Mega-Evolved-form
banner. The Standard/Tera selector is intentionally unavailable on Mega stages.

Standard Pokémon, Pokémon ex, and Mega ex also offer Full Art illustration frames
for Basic, Stage 1, and Stage 2 across all eleven types (99 selected overlays). Full
Art extends uploaded artwork across the entire card and uses outlined dynamic text
for readability. It omits Pokédex/flavor controls and the ex paper-panel texture.
Tera Full Art, golden rarities, and other specialty treatments are not included.

Scarlet & Violet cards use the recovered ability badge and dedicated attack geometry.
The renderer automatically reflows one or two attacks around the optional ability:
two-attack layouts use a divider and shorter description limits so text stays above
the weakness, resistance, and retreat bar. Standard and Full Art cards share this
layout behavior, with outlined text enabled where the artwork treatment requires it.

Canvas rendering explicitly waits for every bundled Pokémon font family it uses.
The first preview therefore uses the same typography as later edits and downloaded
exports instead of briefly drawing and retaining browser fallback fonts.

Stage 1 and Stage 2 cards, including their supported ex and Mega variants, accept an
optional pre-evolution portrait. The portrait has independent horizontal, vertical,
and zoom controls and is clipped to the native Stage window for its era. Omitting the
portrait preserves the source placeholder and the text-only “Evolves from” fallback.

Collector details support optional common, uncommon, and rare symbols plus an optional
era mark. Pokémon cards use the selected Sword & Shield or Scarlet & Violet mark;
Trainer and Energy templates use the Sword & Shield mark that matches their current
frame family. Both symbol controls include a None choice, and all images are bundled
locally with the editor.

The copyright line is editable for every supported card family. Before drawing the
replacement, the renderer reconstructs the affected border pixels from the surrounding
frame; leaving the field blank produces a clean border. Scarlet & Violet uses a wider
repair region to remove the additional pale imprint embedded beside the source text.
This processing happens before collector fields are drawn, so set and regulation data
remain intact.

Scarlet & Violet ex and Full Art artwork is clipped beneath the opaque rounded frame,
preventing fallback or uploaded artwork from showing through its antialiased outer
corners. For bleed output, semitransparent frame-edge pixels inherit the nearest opaque
silver tone, preserving their smooth alpha edge without creating a light or colored
halo against the grayscale extension. The extension samples just inside the opaque
frame so local light and dark silver gradients continue naturally. Bleed exports use a
second copyright-free render only for their edge extension; the centered trim card
retains the user's copyright line without repeating it through the bottom bleed.

Collector and flavor placement follows separate source-derived recipes rather than one
shared footer. Sword & Shield places its set mark at the start of the collector row;
Scarlet & Violet standard places the regulation mark before the set mark, while ex
places the set mark before regulation. The custom set code and bundled era mark share
the native set-icon slot, preventing either from displacing the anchored card numerals.
Regulation marks use the source 26 px height and era-specific shape. Standard Pokemon flavor text is vertically
centered in the era-specific lower-right text box; ex, Mega, and Full Art frames omit it.
