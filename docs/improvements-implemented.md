# ProductBoard MCP Improvements - Implemented

**Date:** 2 February 2026
**Based on:** `productboard-skill-improvements-report.md`

---

## MCP Changes (Implemented)

### 1. Field Name → UUID Auto-Translation (✅ Fixed)

**File:** `src/tools/entities.ts`

**What changed:**
- `pb_entity_create` now calls `transformFieldsForUpdate()` to auto-translate display names to UUIDs
- Previously only `pb_entity_update` had this capability

**Before:**
```javascript
// Required UUIDs
{"d4ea8854-c960-458a-bf5d-05fda4b22a24": 500}  // Reach
```

**After:**
```javascript
// Both work
{"Reach": 500}
{"d4ea8854-c960-458a-bf5d-05fda4b22a24": 500}
```

### 2. Flexible Teams Format (✅ Fixed)

**File:** `src/tools/entities.ts`

**What changed:**
- Added `normalizeTeamsField()` helper function
- Applied to both `pb_entity_create` and `pb_entity_update`

**Now accepts:**
```javascript
{teams: "H4C Frontend"}                           // String
{teams: ["H4C Frontend", "H4C Central"]}          // Array of strings
{teams: [{name: "H4C Frontend"}]}                 // Array of objects (original)
```

### 3. Improved Tool Descriptions (✅ Fixed)

**File:** `src/tools/entities.ts`

Both `pb_entity_create` and `pb_entity_update` now document:
- Custom field name auto-translation
- Flexible teams formats
- Supported HTML tags for descriptions
- Timeframe API limitation

### 4. HTML Validation (Already Good)

**File:** `src/utils/richtext.ts`

Already had:
- Clear error messages listing supported tags
- Suggestions for replacements (`<strong>` → `<b>`)
- Auto-wrapping plain text in `<p>` tags

---

## Skill Changes (Implemented)

### pb-tools-expert/SKILL.md (✅ Updated)

Location: `skills/pb-tools-expert/SKILL.md`

**Added:**
1. Supported HTML tags list in Description section
2. Custom Field Names section explaining auto-translation
3. Teams Field Format section showing flexible formats
4. Timeframe limitation in API Limitations table
5. Note about validation warnings

---

## Skill Changes (Manual - Read-Only Folder)

The main `productboard` skill is in a read-only folder (`/mnt/.skills/skills/productboard`).

**Recommended updates for that skill:**

### Add to SKILL.md - Common Pitfalls section:

```markdown
## Common Pitfalls

### Field Names vs IDs
- Custom fields accept display names (e.g., "Reach") which auto-translate to UUIDs
- Both formats work: `{"Reach": 500}` or `{"d4ea8854-...": 500}`
- See `references/field-mappings.md` for workspace-specific field IDs

### HTML Descriptions
- **Supported:** `h1`, `h2`, `p`, `b`, `i`, `u`, `s`, `code`, `pre`, `blockquote`, `ul`, `ol`, `li`, `a`, `hr`, `br`, `img`
- **NOT supported:** `h3-h6`, `table`, `div`, `span`
- Use `<b>` instead of `<strong>`, `<i>` instead of `<em>`

**Note:** The original report incorrectly stated h1-h6 and ul/ol/li were not supported. Official docs confirm they ARE supported.

### Teams Format
- Accepts: `"Team Name"`, `["Team A", "Team B"]`, or `[{name: "Team"}]`
- Validation warnings may appear but update succeeds - verify with `pb_entity_get`

### Timeframes
Use the `TimeframeFieldValue` format:
```javascript
{
  timeframe: {
    startDate: "2026-07-01",
    endDate: "2026-09-30",
    granularity: "quarter"  // "month" | "quarter" | "year"
  }
}
```
```

---

## Summary of Impact

| Issue from Report | Resolution | Location |
|-------------------|------------|----------|
| Field IDs vs Names | MCP auto-translates | `entities.ts` |
| HTML Tags | Already documented | `richtext.ts`, skill |
| Teams Format | MCP normalizes | `entities.ts` |
| Timeframe Field | **Report was wrong** - IS settable with correct format | Tool descriptions, skill |
| Validation Warnings | Documented | Skill |
| Parent Requirement | Already documented | Existing skill content |
| Entity types | Added `initiative` and `keyResult` per OpenAPI | `types.ts`, `inputs.ts`, skill |

---

## OpenAPI Validation (2 February 2026)

Validated against official OpenAPI spec at `https://developer.productboard.com/v2/openapi/pm-entities.yaml`

**Entity Types Correction:**
- Previous docs claimed `initiative` NOT supported - **INCORRECT**
- OpenAPI EntityType enum: `product`, `component`, `feature`, `subfeature`, `initiative`, `objective`, `keyResult`, `release`, `releaseGroup`
- Added `initiative` and `keyResult` to all schemas and type definitions
- `company` and `user` are separate API endpoints (not in pm-entities.yaml)

**Confirmed Correct:**
- TimeframeFieldValue: `{startDate, endDate, granularity}` ✓
- Granularity enum: `year`, `quarter`, `month`, `day` ✓
- TeamsFieldAssign: array of `{id}` or `{name}` objects ✓
- RichTextFieldValue: HTML string ✓

**Timeframe correction:** The report stated timeframe "cannot be set via API" but this was incorrect. The correct format is:
```json
{
  "timeframe": {
    "startDate": "2026-07-01",
    "endDate": "2026-09-30",
    "granularity": "quarter"
  }
}
```
Granularity options: `day`, `month`, `quarter`, `year`

---

## Testing Recommendations

1. **Create feature with display names:**
   ```javascript
   pb_entity_create({
     entityType: "feature",
     fields: {
       name: "Test Feature",
       description: "Plain text auto-wrapped",
       teams: "H4C Frontend",
       "Reach": 500,
       "Impact": 2
     }
   })
   ```

2. **Update with flexible teams:**
   ```javascript
   pb_entity_update({
     id: "feature-uuid",
     fields: {
       teams: ["H4C Frontend", "H4C Central"]
     }
   })
   ```

3. **Verify with `pb_entity_get`** to confirm values were set correctly.
