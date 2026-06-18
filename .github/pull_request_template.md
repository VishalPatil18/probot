## Summary

<!-- 1-3 bullets. What changed and why. Reviewer should be able to skim this and know the shape. -->

-
-

## Linked issue

<!-- Use "Closes #123" so GitHub auto-links and auto-closes on merge. -->

Closes #

## Test plan

<!-- Checklist of how you verified this. Be specific. -->

- [ ] `npm test` passes (260+ specs)
- [ ] `npm run typecheck` clean
- [ ] `npm run build` succeeds
- [ ] If this changes runtime behavior, at least one test was added or updated
- [ ] If this touches the chat / error / logging path, a canary-key test proves the BYO key value doesn't leak
- [ ] Manually smoke-tested affected user flows in `npm run dev` (register, bot factory, chat)

## Screenshots / recordings

<!-- For any UI change. Before / after side-by-side if applicable. -->

## Notes for reviewer

<!-- Anything non-obvious: tricky trade-offs, follow-ups deferred, areas you want a second opinion on. -->
