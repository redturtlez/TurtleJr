# Art gallery maintenance

The public gallery lives at `/art`. Its category routes and artwork metadata are driven by `app/art/artwork-catalog.json`.

## Adding artwork

1. Put a `.jpg`, `.jpeg`, `.png`, or `.webp` image in the matching `public/art/<category-slug>/` folder.
2. Add an object to the `artworks` array in `app/art/artwork-catalog.json`.
3. Supply a stable unique `id`, the category slug, the public image path, title, useful alt text, original pixel width and height, and a positive integer `order`.
4. Add `description` only when the work benefits from context.
5. Add `featured: true` to the large-format miscellaneous painting so it leads the `/art` page. The lowest ordered featured artwork is used if more than one is marked.

Example metadata:

```json
{
  "id": "example-work",
  "category": "miscellaneous",
  "src": "/art/miscellaneous/example-work.jpg",
  "title": "Example title",
  "alt": "Describe what is visibly shown rather than repeating the title.",
  "description": "Optional context about the materials, process, or finished piece.",
  "width": 2400,
  "height": 3200,
  "featured": true,
  "order": 1
}
```

Do not add HEIC files, SVG files, remote URLs, or HTML to descriptions. Keep photographs reasonably compressed before committing them; the source image dimensions still belong in the catalog even though the UI displays responsive versions.

Run `npm run check:art-gallery` after changing images or metadata. The check rejects missing metadata, unknown categories, unsupported payload signatures, and image files that were placed in a category folder without a catalog entry.
