---
tags: [opcode-talk, talk-branch-deviation]
role: branch
parent_beat: 12
---
# B12 Leaky abstractions

Optional deviation. Attached to 12 Understanding is still expensive.

The PDF offers the example “Add Google login.” The apparently small request can touch OAuth redirects, cookies, identity mapping, session lifetime, CSRF protection, errors, and deployment configuration.

This illustrates why domain intent does not remove the need to understand relevant technical failure modes. Do not pretend that every listed mechanism is identical or mandatory in every authentication architecture; the correct controls depend on the actual flow.

“The higher the abstraction, the less you see on a good day—and the farther you can fall on a bad one.”

The PDF relates this to Joel Spolsky's Law of Leaky Abstractions. Treat the line above as our stage paraphrase, not an exact quotation.

Optional insertion: 20 seconds in the understanding section, replacing some study detail. Return with: “That is why verifying intent still requires engineering judgment.”
