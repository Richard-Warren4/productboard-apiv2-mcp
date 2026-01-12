# Research: ProductBoard MCP Skills Proof of Concept

**Feature**: 007-pb-skills-poc
**Date**: 2026-01-12

## Research Questions

### 1. Claude Code Skill Format Compatibility

**Question**: Is Claude Code's skill format compatible with the n8n-skills SKILL.md approach?

**Finding**: Based on analysis of the n8n-skills repository (https://github.com/czlonkowski/n8n-skills), Claude Code supports custom skills via:
- SKILL.md files with YAML frontmatter
- Directory-based organization under `skills/`
- Plugin configuration via `.claude-plugin/plugin.json`

**Decision**: Adopt n8n-skills format as reference implementation
**Rationale**: n8n-skills is a production example of Claude Code skills that works, providing a proven pattern to follow
**Alternatives Considered**:
- Custom format: Rejected - no need to reinvent when proven pattern exists
- Inline CLAUDE.md only: Rejected - skills provide better separation and reusability

### 2. Skill Frontmatter Schema

**Question**: What metadata fields are required/supported in SKILL.md frontmatter?

**Finding**: Based on n8n-skills examples, frontmatter includes:
```yaml
---
name: [Skill display name]
description: [Brief description for activation matching]
priority: [highest|high|medium|low - affects activation order]
---
```

**Decision**: Use minimal frontmatter with name, description, and priority
**Rationale**: Matches n8n-skills pattern; additional fields can be added if needed
**Alternatives Considered**:
- Extensive metadata (version, author, tags): Deferred - not needed for POC
- No frontmatter: Rejected - frontmatter enables skill activation and priority

### 3. Evaluation Scenario Format

**Question**: How should evaluation scenarios be structured for skill effectiveness testing?

**Finding**: n8n-skills uses JSON format with:
```json
{
  "id": "unique-identifier",
  "skills": ["skill-names-required"],
  "query": "User question to test",
  "expected_behavior": ["List of expected behaviors"],
  "baseline_without_skill": {
    "likely_response": "What AI would do without skill",
    "expected_quality": "Low/Medium/High"
  },
  "with_skill_expected": {
    "response_quality": "Expected quality",
    "uses_skill_content": true/false,
    "provides_correct_tool": true/false
  }
}
```

**Decision**: Adopt n8n-skills evaluation format
**Rationale**: Structured comparison enables clear before/after assessment
**Alternatives Considered**:
- Prose-based test cases: Rejected - less structured, harder to compare
- Automated assertions: Deferred - manual evaluation sufficient for POC

### 4. Plugin Configuration Structure

**Question**: What should the .claude-plugin/plugin.json contain?

**Finding**: n8n-skills plugin.json includes:
```json
{
  "name": "package-name",
  "version": "1.0.0",
  "description": "Package description",
  "author": { "name": "...", "url": "..." },
  "license": "MIT",
  "keywords": ["..."],
  "repository": "https://github.com/...",
  "homepage": "https://github.com/..."
}
```

**Decision**: Create minimal plugin.json with required fields
**Rationale**: Enables Claude Code plugin discovery and installation
**Alternatives Considered**:
- No plugin config: Rejected - needed for `claude mcp add` integration
- Extended marketplace.json: Deferred - not needed for POC

### 5. Skill Content Structure

**Question**: How should the SKILL.md content be organized for maximum effectiveness?

**Finding**: Effective skills (per n8n-skills patterns) include:
1. **Tool Selection Guide** - Quick reference table mapping goals to tools
2. **Common Mistakes** - Anti-patterns with corrections
3. **Workflow Patterns** - Multi-step operation sequences
4. **Best Practices** - Do/Don't guidance
5. **Performance Notes** - Response time expectations (optional)

**Decision**: Structure pb-tools-expert with all five sections
**Rationale**: Comprehensive coverage addresses all user story priorities (P1-P3)
**Alternatives Considered**:
- Minimal tool table only: Rejected - doesn't address P2 (mistakes) or P3 (patterns)
- Separate files per section: Rejected - single SKILL.md is simpler for POC

## Source Material Verification

The skill content will be derived from these verified sources:

| Source | Content | Verification Status |
|--------|---------|---------------------|
| CLAUDE.md | Tool descriptions, API gotchas, entity types | Verified 2026-01-09 |
| constitution.md | API request formats, error handling | Verified 2025-12-15 |
| specs/mcp-test-checklist.md | Edge cases, known issues | Verified 2025-12-15 |
| ProductBoard API v2 docs | Official reference | URLs in .specify/memory/ |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Claude Code skill format changes | Low | Medium | POC validates current format; update if needed |
| Skill doesn't activate for relevant queries | Medium | High | Test with evaluation scenarios before release |
| Guidance becomes stale as tools evolve | Medium | Medium | Version skill with MCP; update together |
| User has different ProductBoard configuration | Low | Low | Recommend pb_get_config for workspace discovery |

## Conclusion

All research questions resolved. The n8n-skills pattern provides a solid foundation for the pb-tools-expert skill implementation. No blockers identified for proceeding to Phase 1 design.
