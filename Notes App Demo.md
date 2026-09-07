---
tags: [opcode-talk, talk-branch-deviation]
role: branch
parent_beat: 13
---
# Notes App Demo

Optional deviation. Attached to 13 Intent is the new working unit.

“Build a notes app” can mean a cloud service with accounts or a private offline tool. Neither follows uniquely from the request.

Illustrative agreed intent: I want to capture personal notes on one device, including offline. I do not need an account or sync. Note text must not be sent to a server. I need to recover an accidentally deleted note.

Clarify consequential gaps: supported environment, storage durability, retention after deletion, and whether manual permanent deletion is allowed. Do not silently choose those policies for the user.

Possible intent areas are capture-and-retain and delete-and-recover. Offline behavior and privacy constrain both; they are not an isolated feature owned by nobody.

Proposed evidence: create without a network; restart and compare saved content; delete and restore; inspect relevant code and instrument network behavior for unintended transmission. A quiet trace alone does not prove all possible privacy behavior.

This is a proposed demonstration, not a built or tested app. It enriches the concluding Liva process without replacing the customer-form and customer-query examples used by the PDF's trunk. A full walkthrough needs time borrowed from another section or belongs after the talk.
