# Gate 4 · Idea → Publication campaign-key audit · build 2.3.101

## READ

- `g4SmmPublicationFromIdeaV299` writes only a publication to
  `state.gate4SmmContentV299.publications`. It never writes to
  `state.gate4Production.campaigns`.
- The conversion click handler then calls `renderGate()`.
- Gate 4 rendering calls `g4EnsureLaunchCampaigns()`.
- That function had two campaign-writing passes:
  1. the original campaign initializer;
  2. the later product-id initializer (`__g4ProductPickPrevEnsureLaunchCampaigns`).
- The second pass iterated raw `g4LaunchChannels()` again. Consequently a
  derived descriptor containing the same complete name in both `channel` and
  `platform` bypassed any protection in the first pass. `g4LaunchChannelKey`
  joined both fields and produced keys such as:
  - `smm_instagram_reels_stories_smm_instagram_reels_stories_15`;
  - `smm_youtube_shorts_pre_roll_smm_youtube_shorts_pre_roll_16`.

The locally available export `/Users/vl/Downloads/gate-4.json` was exported at
`2026-09-08T10:07:04.081Z` and contains 120 campaigns (15 × 8), zero current
SMM ideas and zero current SMM publications. Its duplicate-cleanup run is dated
`2026-09-06T14:45:36.431Z`; therefore that entry is historical evidence of the
same writer class, not evidence that the current export contains a surviving
Idea → Publication duplicate.

## WRITE

- Added one pre-write canonicalization function,
  `g4CampaignWritableChannelsV301`.
- It collapses an exact repeated descriptor token sequence, groups descriptors
  by semantic channel identity, and selects the least-redundant stable row.
- Both campaign-writing passes now consume that same canonical channel list.
- `_gate4DuplicateCleanupLogV283` and `gate4DuplicateCleanupV283` were not
  removed or weakened.

## VERIFY

Browser smoke: `scripts/gate4-smm-campaign-key-guard-smoke.mjs`.

- Historical cleanup was replaced by a no-op during the primary test.
- The exact two malformed descriptors above were injected into the writer.
- Three products were tested.
- For every product an idea was converted through the visible Stage 5 button,
  then `Instagram Reels` and `YouTube Shorts` were selected in the publication.
- Result before restoring the cleanup:
  - campaigns: 45 = 15 × 3;
  - duplicate campaign keys: 0;
  - malformed keys persisted: 0;
  - publications: 3, both selected platforms preserved in each.
- The 15 existing canonical channel keys stayed byte-for-byte stable, and a
  pre-filled canonical campaign retained its objective and targeting data.
- Cleanup log stayed byte-for-byte unchanged while cleanup was disabled.
- After restoring and running the insurance once:
  - `changed: false`;
  - `removed: 0`;
  - `preserved: 0`;
  - cleanup log still unchanged.

Additional passing browser regressions:

- `scripts/gate4-smm-content-system-smoke.mjs`;
- `scripts/gate4-smm-strategy-smoke.mjs`.

`scripts/gate4-funnel-readiness-smoke.mjs` could not start because its external
fixture `/Users/vl/Downloads/guru-project-korichnoe-yabloko-all.json` is absent.
No application assertion ran in that test.
