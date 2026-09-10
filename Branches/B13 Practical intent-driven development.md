---
tags: [opcode-talk, talk-branch-support]
role: branch
parent_beat: 13
---
# B13 Practical intent-driven development

Supporting data. Attached to 13 Intent is the new working unit.

## The maintained working unit

Intent is the accepted product agreement: the outcome, observable behavior, durable constraints, non-goals, and the evidence that must establish them. It is normative rather than a retrospective description of whatever the code currently happens to do.[1][2]

A chat transcript, task list, tentative architecture, and implementation plan are temporary execution material. Promote a fact only when it becomes an enduring product behavior, constraint, or decision; retain audit and operational evidence where needed without confusing it with current product truth. This is a lifecycle distinction, not “documentation instead of tests.”[1]

The documented IDD package separates the `idd-intent` plugin from `idd-factory`, whose three Factory skills depend on the intent plugin. Factory is optional orchestration for bounded execution; start a small change with the direct workflow unless coordination uncertainty earns the extra machinery.[3]

## A practical, bounded exercise

Use “Build me a Git client” only to expose consequential questions: inspection or mutation, local-only or remote transmission, and what must remain untouched. The proposed answer is a read-only local change viewer that distinguishes staged, unstaged, and untracked changes while preserving the working tree, index, refs, and configuration.

For the presentation, the executable acceptance exercise uses a recorded synthetic Git-status fixture: categorize known staged, unstaged, untracked, and ignored files; then omit the untracked behavior as an intentionally injected regression. The browser check has been exercised through pass → fail → pass, with fixed expectations retained while the implementation changes. This verifies categorization against that fixture only. The full Git viewer remains unbuilt; the exercise does not establish repository immutability, privacy, general Git parsing, or agent productivity.

The distinction to say aloud is: **intent states what must be established; verification policy and checks state how this repository currently establishes it.** A passing check is evidence for the exercised acceptance condition, not proof that the intent was complete or correct.[2][4]

## Where it fits among spec workflows

Böckeler distinguishes spec-first, spec-anchored, and spec-as-source work. The audited IDD workflow is best described as spec-anchored: it keeps accepted meaning current, while plans and execution are derivations rather than the source of truth.[5]

GitHub Spec Kit can use a living `spec.md` with plans and tasks as revisable derivations; Kiro documents a feature-level requirements/design/tasks set; OpenSpec explicitly merges completed change deltas into current specs. The shared practical discipline is to maintain current behavior and constraints, then keep change logistics disposable or historical—not to promise that people never inspect code.[6][7][8]

Use these as workflow comparisons, not as evidence that any named framework improves productivity or correctness.

Sources:
[1] https://github.com/DimonSmart/Intent-Driven-Development/blob/4c40607ac88c65bc4c592961b0da8c297efc2e74/src/canonical/methodology/intent-driven-development.md
[2] https://github.com/DimonSmart/Intent-Driven-Development/blob/4c40607ac88c65bc4c592961b0da8c297efc2e74/src/canonical/project-files/intent/_templates/spec.md
[3] https://github.com/DimonSmart/Intent-Driven-Development/blob/4c40607ac88c65bc4c592961b0da8c297efc2e74/src/canonical/plugins/plugin-manifest.json
[4] https://github.com/DimonSmart/Intent-Driven-Development/blob/4c40607ac88c65bc4c592961b0da8c297efc2e74/src/canonical/methodology/project-verification.md
[5] https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html
[6] https://raw.githubusercontent.com/github/spec-kit/c173bf19a6654e3b05386ec3599349a55282b897/docs/concepts/spec-persistence.md
[7] https://kiro.dev/docs/specs.md
[8] https://raw.githubusercontent.com/Fission-AI/OpenSpec/9d4e5974e5c0d9a09b9c6c1e1eb0975e80ec4461/docs/overview.md
