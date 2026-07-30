About

- [Overview](https://developer.productboard.com/v2.0.0/reference/introduction)
- [Gettting started](https://developer.productboard.com/v2.0.0/reference/gettting-started)
- [Feedback & Help](https://developer.productboard.com/v2.0.0/reference/feedback-help)
- [Glossary](https://developer.productboard.com/v2.0.0/reference/glossary)
- [Known issues](https://developer.productboard.com/v2.0.0/reference/known-issues)

Using the API

- [Authentication](https://developer.productboard.com/v2.0.0/reference/authentication)
- [Rate limits](https://developer.productboard.com/v2.0.0/reference/rate-limits)
- [Pagination](https://developer.productboard.com/v2.0.0/reference/pagination)
- [Using Configuration Endpoints](https://developer.productboard.com/v2.0.0/reference/configuration-endpoint)
- [Field Value Types](https://developer.productboard.com/v2.0.0/reference/field-value-types)
- [Richtext](https://developer.productboard.com/v2.0.0/reference/richtext)
- [Entity IDs in-app](https://developer.productboard.com/v2.0.0/reference/entity-ids-in-app)

Notes

- [List note configurationsget](https://developer.productboard.com/v2.0.0/reference/listnoteconfigurations)
- [Get configurationget](https://developer.productboard.com/v2.0.0/reference/getnoteconfiguration)
- [Create notepost](https://developer.productboard.com/v2.0.0/reference/createnote)
- [List notesget](https://developer.productboard.com/v2.0.0/reference/listnotes)
- [Retrieve noteget](https://developer.productboard.com/v2.0.0/reference/getnotebyid)
- [Update notepatch](https://developer.productboard.com/v2.0.0/reference/updatenote)
- [Delete notedel](https://developer.productboard.com/v2.0.0/reference/deletenotebyid)
- [Retrieve relationshipsget](https://developer.productboard.com/v2.0.0/reference/getnoterelationships)
- [Create relationshippost](https://developer.productboard.com/v2.0.0/reference/setnoterelationship)
- [Set customer relationshipput](https://developer.productboard.com/v2.0.0/reference/patchnotecustomerrelationship)
- [Delete relationshipdel](https://developer.productboard.com/v2.0.0/reference/delete-note-relationship)

Entities

- [List entity configurationsget](https://developer.productboard.com/v2.0.0/reference/listentityconfigurations)
- [Get configurationget](https://developer.productboard.com/v2.0.0/reference/getentityconfiguration)
- [Create entitypost](https://developer.productboard.com/v2.0.0/reference/createentity)
- [List entitiesget](https://developer.productboard.com/v2.0.0/reference/listentities)
- [Retrieve entityget](https://developer.productboard.com/v2.0.0/reference/getentitybyid)
- [Update entitypatch](https://developer.productboard.com/v2.0.0/reference/updateentitybyid)
- [Delete entitydel](https://developer.productboard.com/v2.0.0/reference/deleteentitybyid)
- [Search entitiespost](https://developer.productboard.com/v2.0.0/reference/searchentities)
- [Retrieve relationshipsget](https://developer.productboard.com/v2.0.0/reference/getentityrelationships)
- [Create relationshippost](https://developer.productboard.com/v2.0.0/reference/createentityrelationship)
- [Set parent relationshipput](https://developer.productboard.com/v2.0.0/reference/replaceentityrelationships)
- [Delete relationshipdel](https://developer.productboard.com/v2.0.0/reference/deleteentityrelationship)

Jira Integrations

Verified live 2026-07-30 by direct curl against a real workspace (antimatter) — not
guessed. Note the doc-site slugs 404 intermittently (some need a `.md` suffix, some
don't, and `getjiraintegrations-1`/`getjiraintegrationconnections` 404'd outright even
with `.md`); the endpoint paths and shapes below are the source of truth, confirmed
against live responses, not the doc pages.

- List integrations: `GET /jira-integrations` — returns `data[]` of
  `{ id, type: "jiraIntegration", createdAt, fields: { name, integrationStatus }, links: { self, connections, html } }`.
  A workspace can have more than one (e.g. an old pre-migration integration alongside
  a current one) — always enumerate, don't assume a single integration.
- List connections for one integration: `GET /jira-integrations/{integrationId}/connections`
  — returns `data[]` of `{ id, type: "jiraIntegrationConnection", fields: { issueKey, issueId }, links: { self } }`,
  paginated (`links.next`, same cursor style as `/entities`). **`data[].id` is the
  Productboard feature/entity UUID** — that's how a connection maps back to a PB
  entity; there is no separate connection ID in the response. Confirmed via
  [reference/getjiraintegrationconnection.md](https://developer.productboard.com/reference/getjiraintegrationconnection.md),
  which documents the single-connection GET as `/jira-integrations/{integrationId}/connections/{entityId}`.
- Get one connection: `GET /jira-integrations/{integrationId}/connections/{entityId}` —
  same `fields: { issueKey, issueId }` shape as above, singular.
- Auth: same Bearer token as all v2 endpoints; doc mentions a `jira-integrations:read`
  scope but no scope error was observed against the live token used for verification.