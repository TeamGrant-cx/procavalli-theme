# Integrating `pc-gates` into the Pro Cavalli theme

This guide explains how the Pro Cavalli owner-developed storefront gate is woven into the Shopify theme. The gate is **load-bearing**: every gated section depends on `snippets/pc-gates.liquid` being present and intact. If the snippet is deleted or tampered with, every gated section stops rendering — on the server (empty HTML) and in the browser (hidden by default CSS).

When the status endpoint explicitly returns `active: false`, elements marked with `data-pc-gate` are hidden. If the endpoint cannot be reached or returns an invalid response, the page remains in its current rendered state (fail-open for the active/inactive decision; **not** fail-open for the snippet's own presence).

## Architecture

The gate is implemented in two layers that work together:

### Layer 1 — Liquid dependency (server-side)

Every gated section wraps its content in a check against `pc-gates.liquid`:

```liquid
{%- capture __pc_check -%}{%- render 'pc-gates', section_check: true -%}{%- endcapture -%}
{%- if __pc_check contains 'pc-ok' -%}
  …gated content…
{%- endif -%}
```

When `pc-gates.liquid` is rendered with `section_check: true` it returns the sentinel string `pc-ok`. If the file is missing or its sentinel branch has been removed, the capture is empty, the check fails, and the section renders nothing. No HTML reaches the browser at all.

### Layer 2 — CSS inversion (client-side)

`[data-pc-gate]` is `display: none` by default. The script in `pc-gates.liquid` adds `pc-verified` to `<html>` when it runs, which reveals gated elements:

```css
[data-pc-gate]                            { display: none !important; }
html.pc-verified [data-pc-gate]           { display: revert !important; }
html.pc-verified.pc-off [data-pc-gate]    { display: none !important; }
html.pc-verified.pc-off [data-pc-gate-stub] { display: block !important; }
```

If somebody strips the Liquid wrapper from a section file but leaves `data-pc-gate` on the element, the element still stays hidden because `pc-verified` is never added without the snippet.

### What each tampering scenario produces

| Scenario | Result |
|---|---|
| `pc-gates.liquid` deleted | Layer 1 kills all gated sections — zero HTML output |
| `pc-gates.liquid` modified (sentinel branch removed) | Capture doesn't contain `pc-ok` → same result |
| Liquid wrapper removed from a section but `data-pc-gate` kept | Layer 2 hides it (no `pc-verified` without the snippet) |
| Snippet intact, gate active | Both layers pass → sections visible |
| Snippet intact, gate inactive | `pc-verified` + `pc-off` → sections hidden, stubs shown |

## 1. The snippet

`snippets/pc-gates.liquid` is dual-mode:

- `{% render 'pc-gates' %}` — default call from `layout/theme.liquid`. Outputs the styles + script.
- `{% render 'pc-gates', section_check: true %}` — returns the sentinel string `pc-ok`. Used by section wrappers to prove the snippet exists.

The snippet is referenced once from `<head>` in `layout/theme.liquid`:

```liquid
<head>
  …
  {% render 'pc-gates' %}
  …
</head>
```

The status endpoint is `https://procavalli-license.vercel.app/status`.

## 2. Gating a section

To make a section gated, do both of the following:

1. Add the capture-and-check wrapper around the section's rendered content.
2. Add `data-pc-gate` to the root element inside the wrapper.

Example for a new homepage section:

```liquid
{%- capture __pc_check -%}{%- render 'pc-gates', section_check: true -%}{%- endcapture -%}
{%- if __pc_check contains 'pc-ok' -%}
<section data-pc-gate class="pc-homepage-hero">
  …section content…
</section>
{%- endif -%}
```

The capture should be placed once near the top of the file. For a section that already has a `{%- liquid -%}` block or a `{% capture children %}` block, place the capture just after those so the `__pc_check` variable is in scope for every gated block below it.

### Variant — loop-based items

If gated items live inside a loop (as in `sections/main-collection-product-grid-banner-adv.liquid`), extend the existing `{% if %}` condition rather than wrapping each `<li>` separately:

```liquid
{% if forloop.index == banner_position_1 and section.settings.show_banner_1 and __pc_check contains 'pc-ok' %}
  <li class="…" data-pc-gate …>…</li>
{% endif %}
```

### Variant — inside a `{% capture %}`

If the gated element is produced inside a `{% capture children %}` or similar, put the capture **outside** the enclosing capture, and gate the inner content with the check:

```liquid
{%- capture __pc_check -%}{%- render 'pc-gates', section_check: true -%}{%- endcapture -%}
{% capture children %}
  {%- if __pc_check contains 'pc-ok' -%}
  <div data-pc-gate style="display:contents">
    …content…
  </div>
  {%- endif -%}
{% endcapture %}
```

### Variant — menu snippets captured and echoed

The two menu captures in `sections/header.liquid` emit the gate wrapper via `echo`. Wrap each in an `if` on the check:

```liquid
capture menu
  if __pc_check contains 'pc-ok'
    echo '<div data-pc-gate class="pc-menu-gate" style="display:contents">'
    render 'header-menu-snippet', …
    echo '</div>'
  endif
endcapture
```

### Variant — `<main>` in the layout

`layout/theme.liquid` keeps `<main>` present under all conditions (so the page skeleton never collapses) but suppresses `content_for_layout` on gated pages when the snippet is missing:

```liquid
{%- capture __pc_check -%}{%- render 'pc-gates', section_check: true -%}{%- endcapture -%}
{%- assign __pc_ok = false -%}
{%- if __pc_check contains 'pc-ok' -%}{%- assign __pc_ok = true -%}{%- endif -%}
<main
  id="MainContent"
  …
  {% if pc_gate_main and __pc_ok %}data-pc-gate{% endif %}
>
  {%- if pc_gate_main and __pc_ok == false -%}
    {%- comment -%} pc-gates snippet missing — gated page content suppressed {%- endcomment -%}
  {%- else -%}
    {{ content_for_layout }}
  {%- endif -%}
</main>
```

## 3. Where the gate is currently applied

| Area | File |
|---|---|
| Homepage, cart, About, Contact — main content | `layout/theme.liquid` |
| Header navigation (menu and mobile menu) | `sections/header.liquid` |
| Footer | `sections/footer.liquid` |
| Collection cards | `snippets/collection-card.liquid` |
| Product cards (both branches) | `snippets/card-product.liquid` |
| Collection filters | `snippets/facets.liquid` |
| Collection banner | `sections/main-collection-banner.liquid` |
| In-grid collection banners | `sections/main-collection-product-grid-banner-adv.liquid` |
| Media gallery | `sections/media-gallery.liquid` |
| Product bundle | `sections/pc-bundle.liquid` |

Product pages and checkout are unaffected unless their elements are explicitly integrated with the gate.

### Optional placeholder

To show a placeholder when a gated section is hidden by the gate being OFF (not when the snippet is missing — then nothing renders at all), add a sibling with `data-pc-gate-stub`:

```liquid
{%- if __pc_check contains 'pc-ok' -%}
<section data-pc-gate>…your section content…</section>
<div data-pc-gate-stub style="padding:60px 20px;text-align:center;color:#777">
  This area is temporarily unavailable.
</div>
{%- endif -%}
```

Leave the placeholder out if the section should simply collapse.

## 4. Deploying theme changes

Commit `snippets/pc-gates.liquid`, the `layout/theme.liquid` render, and the capture-and-check wrappers on each gated section. Confirm the target branch and storefront deployment before merging.

## 5. Operating the gate (Pro Cavalli owner)

Use the owner key configured for the endpoint. Keep the key secure; do not place the real value in the theme or repository.

Check status:

```bash
curl https://procavalli-license.vercel.app/admin \
  -H "Authorization: Bearer <OWNER_KEY>"
```

Deactivate:

```bash
curl -X POST https://procavalli-license.vercel.app/admin \
  -H "Authorization: Bearer <OWNER_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"action":"deactivate","message":"Storefront temporarily unavailable"}'
```

Reactivate:

```bash
curl -X POST https://procavalli-license.vercel.app/admin \
  -H "Authorization: Bearer <OWNER_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"action":"activate"}'
```

The browser caches the last valid status in `sessionStorage` for up to 10 minutes. The endpoint's own caching and deployment behavior may add further delay before an open storefront reflects a change.

## Behavior and limitations

- **Owner-operated.** The Pro Cavalli owner manages the gate state and the credentials used to change it.
- **Fail-open for the active/inactive decision.** Network failures, non-success responses, invalid JSON, and responses without a boolean `active` value leave gated elements visible.
- **Not fail-open for the snippet.** The snippet's own presence is the gate itself. If the file is removed, every gated section is suppressed (server-side) and defaults to hidden (client-side). This is the load-bearing property.
- **No shopper identifiers.** The status request does not intentionally send shopper identifiers or credentials.
- **Theme-level control.** Someone with full theme-editor access can strip the capture-and-check wrapper and the `data-pc-gate` attribute from every section file to defeat the gate. That requires editing every gated file — not just deleting one snippet.
- **Display behavior.** The snippet and wrappers hide marked elements and suppress their markup; they do not change Shopify's checkout or core commerce behavior.

## Current deployment names

The theme snippet and render reference use `pc-gates`. The existing status/admin endpoint and hosting project use the name `procavalli-license`.
