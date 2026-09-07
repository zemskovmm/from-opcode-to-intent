---
tags: [opcode-talk, talk-trunk]
role: trunk
order: 6
slot: "06:20–07:30"
---
# 06 SQL - say what and delegate how

06:20–07:30 · Main talk · PDF beat 6

## On stage

Use the PDF's familiar query: SELECT customer_id FROM orders GROUP BY customer_id HAVING COUNT(*) = 5. Explain what has disappeared from the user's expression: choosing a physical access path, reading pages, and deciding much of the execution strategy.

SQL matters here because it delegates mechanism, not because it resembles English. It remains a formal language with defined semantics. A natural-language request can also require guessing which product behavior was intended.

“A high-level language is a language in which you have been allowed to stop making certain decisions.”

End the history with a question: if we delegate more of the expression, what remains hard?

## Added from our discussion

Use this as your strongest declarative example. Leave direct LLVM generation and a compact typed language for models on a branch; otherwise the historical ladder turns into a compiler-design debate.

## Visual cue

The query stays; execution machinery fades away.

## Continue down the trunk

[[Trunk/07 Brooks spoils the ending|07 Brooks spoils the ending]]

## Branches from this section

- Optional deviation: [[Branches/B06 LLVM and a language for models|B06 LLVM and a language for models]] — Direct low-level generation, compact typed languages, and var versus int.
