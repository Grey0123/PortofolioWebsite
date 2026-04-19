# Travel photos

Drop your scenery photos here (JPG/PNG). Then edit `components/Travel.tsx`:
find the `PLACES` array and update each entry's `src`, `place`, and `caption`,
and remove the `placeholder: true` line.

Example:

```ts
{
  place: "Raja Ampat",
  caption: "Sunrise from the lookout at Piaynemo.",
  src: "/images/travel/raja-ampat.jpg",
  span: "md:col-span-2 md:row-span-2",
},
```

**Tips for nice images:**
- Aim for ~1600px wide, under 400KB per file.
- Use [squoosh.app](https://squoosh.app) to compress without losing quality.
- `span` controls the tile size — `md:col-span-2 md:row-span-2` = hero tile,
  omit it for a standard-size tile.
