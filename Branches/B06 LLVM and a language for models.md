---
tags: [opcode-talk, talk-branch-deviation]
role: branch
parent_beat: 6
---
# B06 LLVM and a language for models

Optional deviation. Attached to 06 SQL - say what and delegate how.

Your discussion questions whether models should emit LLVM or assembly directly. Keep it as an open design question. Assembly is verbose and architecture-specific; LLVM IR is not identical to target assembly and can support a portable optimization/code-generation pipeline, although target details can still matter.

A more modest proposal is a compact, strictly typed language with a small set of constructs, suitable for models and for compilation through LLVM. No evidence supplied here establishes that such a language will win.

For C#, compare var and an explicit type on real code-change tasks. Both are statically typed. A visible type can reduce the reader's need to inspect elsewhere; var can reduce repetition and make some type changes easier. The initializer may already determine exactly the same information.

Proposed experiment, not a result: keep tasks, model, repository context, and budget comparable; measure correct changes, maintainability, regressions, and effort. Do not use token count as the sole objective.

Optional insertion: at most 30 seconds after SQL, replacing part of its explanation. Return with: “Even the best representation cannot decide the business goal for us.”
