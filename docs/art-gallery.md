# Art gallery maintenance

The public gallery lives at `/art`. Its category routes and artwork metadata are driven by `app/art/artwork-catalog.json`.

## Adding artwork

1. Put a `.jpg`, `.jpeg`, `.png`, or `.webp` image in the matching `public/art/<category-slug>/` folder. Use a safe filename containing only letters, numbers, dots, underscores, or hyphens.
2. Run `npm run sync:art-gallery`. The command discovers new files, reads their real pixel dimensions, and appends starter metadata without replacing existing titles, descriptions, alt text, ordering, or featured choices.
3. Edit the generated object in `app/art/artwork-catalog.json` with the title, alt text, description, physical dimensions, and order you want visitors to see.
4. Add `featured: true` to the large-format miscellaneous painting so it leads the `/art` page. The lowest ordered featured artwork is used if more than one is marked.

Only `category` and `src` are required. `id`, `title`, `alt`, `description`, `dimensions`, `width`, `height`, `order`, and `featured` are optional. The site derives safe display values when they are omitted. Use `dimensions` for optional visitor-facing physical dimensions such as `8 × 10 in`. The numeric `width` and `height` values are image pixels used for layout; in normal use, leave those generated values in place because the sync command measures and refreshes them automatically.

Example metadata:

```json
{
  "id": "example-work",
  "category": "miscellaneous",
  "src": "/art/miscellaneous/example-work.jpg",
  "title": "Example title",
  "alt": "Describe what is visibly shown rather than repeating the title.",
  "description": "Optional context about the materials, process, or finished piece.",
  "dimensions": "8 × 10 in",
  "width": 2400,
  "height": 3200,
  "featured": true,
  "order": 1
}
```

Do not add HEIC files, SVG files, remote URLs, or HTML to descriptions. Keep photographs reasonably compressed before committing them.

Run `npm run check:art-gallery` after changing images or metadata. The check rejects invalid metadata, unknown categories, unsupported payload signatures, and image files that were placed in a category folder without a catalog entry.
