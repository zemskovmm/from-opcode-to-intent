---
tags: [opcode-talk, talk-trunk]
role: entry
language: English
---
FROM OPCODE TO INTENT
Less code. More meaning. More responsibility.

ENRICHED PLAN — PDF STRUCTURE, WITH OUR DISCUSSION ADDED

This English working plan follows the supplied PDF rather than replacing it with a new talk. The PDF's full historical opening and Brooks reveal are restored. Our comments enrich the shared-context explanation, constraints, analytical role, and final intent-driven workflow. Model internals, language design, and agent decomposition remain attached alternatives, not competing main stories.

Format: two co-hosts; informative, informal, entertaining; a little postmodern self-irony. The original thirteen timed beats occupy the twenty-minute slot, including pauses and handoffs. These are maximum section windows, not twenty minutes of dense speech plus a delivery margin. No separate Q&A is included. Rehearse and trim examples if needed.

The first seven minutes appear to be about abstraction. Brooks then reveals the real subject: what becomes difficult when expressing an implementation gets easier.

Historical details are carried forward from the supplied PDF; this is not a complete independent historical fact-check. The Brooks quotation, METR evidence, learning-study figures, and HCI definitions were checked against the sources listed below. Our modern interpretation, proposed Liva process, and research hypotheses are identified as such.

Start the note-graph trunk: [[Trunk/01 One task - five eras|01 — One task, five eras]]

MAIN TALK — FOLLOW THIS TRUNK IN ORDER

01. ONE TASK - FIVE ERAS
00:00–01:10

Open with the PDF's historical montage: wiring, machine instructions, assembly, a high-level loop, SQL, and a natural-language request. Carry one business goal through the representations: identify customers with exactly five orders. The agent-era request adds the feature to the customer page using the existing filter conventions.

The question is not how many lines disappeared. It is which decisions the person no longer has to spell out. The low-level examples are illustrative, not equivalent complete implementations of a modern web feature.

“Throughout the history of programming, we have tried to tell the machine less and get it to do more.”

Added from our discussion:
Keep your notes-app request as a later alternative example of how a small intent expands into a system. Do not replace the PDF's historical opening with a requirements workshop.

Visual cue: One task, progressively less explicit machinery.


02. ENTROPY - A USEFUL WRONG TURN
01:10–02:10

Retain the PDF's self-deprecating detour: we thought we had a grand theory of the entropy of programming; then Shannon spoiled the branding. Call the stage metaphor semantic density: how much context and how many prior decisions a short expression can invoke. Do not introduce a numerical formula or imply a validated unit.

“We had a perfectly good theory until somebody checked the terminology. So we renamed it. This is also how frameworks happen.”

Shannon's separation of information and semantics is background supplied by the PDF; the talk is not a derivation from information theory.

Added from our discussion:
Your discussion uses “entropy” for several different intuitions: compression, information density, and reduced ambiguity. Separate those intuitions rather than pretending they are one measured quantity. A concise tool call can invoke extensive behavior because its implementation and contract already exist.

Visual cue: Entropy crossed out; semantic density, clearly labelled a metaphor.


03. WHEN THE PROGRAM WAS THE MACHINE
02:10–03:30

Return to the PDF's ENIAC image: programming through wiring, switches, and configuration. The visual joke is that the programmer can stand inside the program. Then show punched cards as a physical carrier of instructions.

“The first IDE was demanding. Refactoring sometimes required standing up.”

“Dependency injection was literal.”

Do not say that every early computer started with a stored program on punched cards. Cards are a medium, not themselves an abstraction layer. The point is how much of the physical machine the programmer had to manage.

Added from our discussion:
This preserves your requested historical excursion and the tactile contrast with speaking an intention aloud. Use one card joke, not an entire history of storage media.

Visual cue: ENIAC wiring, then a punched card.


04. MOVE THE WORK INTO THE INTERPRETER
03:30–05:00

Follow the PDF from numeric opcodes to symbolic assembly, then FORTRAN. Symbols remove the need to remember instruction encodings; a compiler can take responsibility for much more of the translation from a mathematical procedure to executable instructions.

The compiler is the accumulated work that lets later programmers write less. Our short expression is possible because somebody built a substantial receiver for it. We repeat this investment with runtimes, libraries, frameworks, database optimizers, and eventually models and agent tooling.

“We did not make programs shorter for free. We built a larger machine for understanding them.”

Keep the detailed FORTRAN development-effort figures in supporting material until independently checked.

Added from our discussion:
This is the foundation of your compression idea: the sender's message gets shorter because the receiver's dictionary gets richer. It is an analogy across different technologies, not a claim that compilers and LLMs interpret identically.

Visual cue: What the human specifies versus what the receiving system supplies.


05. EVERY LAYER BUILDS ANOTHER MACHINE
05:00–06:20

Keep Dijkstra's abstract-machine staircase as the historical explanation, following the PDF's account of layered systems. A layer gives the next layer concepts that the underlying hardware does not directly offer.

A CPU has no Customer, button, transaction, or onboarding journey. Software makes it possible to work as if those were native concepts. Show a staircase from CPU to machine instructions, runtime, language, framework, and coding agent.

“An abstraction is a way of building a computer that does not physically exist.”

This is our stage paraphrase, not a quotation attributed to Dijkstra. The important transition is from machine-level operations to domain-level concepts.

Added from our discussion:
Your domain-oriented agent idea will later attach here conceptually: onboarding and payments can become the working vocabulary. Save the actual decomposition debate for the final intent section's optional branch.

Visual cue: CPU → instructions → runtime → language → framework → intent interpreter.


06. SQL - SAY WHAT AND DELEGATE HOW
06:20–07:30

Use the PDF's familiar query: SELECT customer_id FROM orders GROUP BY customer_id HAVING COUNT(*) = 5. Explain what has disappeared from the user's expression: choosing a physical access path, reading pages, and deciding much of the execution strategy.

SQL matters here because it delegates mechanism, not because it resembles English. It remains a formal language with defined semantics. A natural-language request can also require guessing which product behavior was intended.

“A high-level language is a language in which you have been allowed to stop making certain decisions.”

End the history with a question: if we delegate more of the expression, what remains hard?

Added from our discussion:
Use this as your strongest declarative example. Leave direct LLVM generation and a compact typed language for models on a branch; otherwise the historical ladder turns into a compiler-design debate.

Visual cue: The query stays; execution machinery fades away.


07. BROOKS SPOILS THE ENDING
07:30–09:00

Put only the exact sentence on screen:

“The hard thing about building software is deciding what one wants to say, not saying it.”

Frederick P. Brooks Jr., No Silver Bullet — Essence and Accidents of Software Engineering, September 1986 report, section 4.3, “Artificial Intelligence.” The wording and section have been checked against the primary report.[1]

Pause before revealing that it appeared in the AI section. Introduce his distinction between the difficulty of the conceptual system and the difficulty of expressing it in a programming language.[1]

“Forty years ago, someone published the spoiler.”

Do not claim that Brooks predicted modern LLMs or that his surrounding productivity predictions are experimentally settled today.

Added from our discussion:
This is where your emphasis on analysis and product thinking belongs. When generating an implementation becomes easier, the unresolved question becomes “what and why?” Constraints, scenarios, risks, and omitted requirements are engineering work. This is the PDF's pivot from an abstraction talk to a talk about the developer's role.

Visual cue: Exact Brooks quote, attribution, then the AI-section reveal.


08. THE SHORT PROMPT HAS A LONG CONTEXT
09:00–10:40

Keep the PDF's main reveal. Show “Add a customer-editing form,” then reveal model knowledge, repository conventions, dependencies, nearby screens, tools, and tests around it. These are the infrastructure supporting an interpretation, not literal source code contained inside the sentence.

“We did not compress the whole program into one sentence. We moved much of the work into the interpreter and its context.”

Unlike a compiler, an agent can fill in unstated requirements. That is useful when conventions are shared and dangerous when they only appear to be shared. Several different applications can satisfy the same vague request.

Added from our discussion:
Add your shared-dictionary explanation explicitly. Common sense is part of the informal dictionary, but neither uniform nor guaranteed. “Build a notes app” can unfold into an account-based cloud service or a private offline tool. This is not lossless decompression of a unique hidden program. Meaning lives partly in the words and partly in the receiver's context.

Visual cue: Prompt → reveal model, repository, examples, tools, tests.


09. FREEDOM IS A BUG - CONSTRAINTS NARROW THE OPTIONS
10:40–12:40

Restore the PDF's cone of reasonable solutions. “Build a customer form” leaves many products and implementations open. Add the existing form components, design tokens, no new dependencies, accessibility requirements, and acceptance criteria. The space of acceptable choices narrows.

“A constraint tells the model what it is not allowed to mean.”

Prepare a comparison of unconstrained and constrained requests if you want a demonstration. Actual outputs must be collected; do not present invented screenshots as measured evidence. Constraints can conflict or be wrong, and test suites can miss important behavior.

Added from our discussion:
This is where your analytical questions enter: who is it for, what must happen, what must never happen, and what risks were left unstated? Ask questions that change the product, rather than requesting a preference for every library. A transcript captures the conversation; agreement turns it into a usable specification.

Visual cue: Broad cone of plausible outcomes → narrower acceptable region.


10. REFERENCE BEATS DESCRIPTION
12:40–14:20

Keep the PDF's contrast between a long style description and “Follow CustomerDetails.” An existing component can communicate layout, naming, validation, interaction patterns, and architectural conventions at once.

“Use our design system” invokes work and decisions that have already been made. Short plus shared context can be more useful than either short and vague or long and repetitive. A reference still has to be correct, accessible to the agent, and relevant to this task.

“Common sense is the new standard library. Unfortunately, we have not all installed the same version.”

The joke is metaphorical. Repository-specific rules should not be entrusted to supposed common sense.

Added from our discussion:
Connect this to your high-information-density tools and specifications. Intent documentation can say why a scenario exists and what must stay true, while referencing maintained components, policies, contracts, and executable checks for the details. This is not an argument for deleting technical documentation.

Visual cue: A paragraph of styling instructions versus one concrete repository reference.


11. THE BOTTLENECK MOVED
14:20–16:50

Retain the PDF's productivity interruption. METR's early-2025 randomized study involved 16 experienced open-source developers and 246 tasks in familiar repositories. With the tools available then, AI-allowed tasks took 19% longer, despite participants' expectation of an improvement and a later belief that they had been faster.[2]

“We finally built a benchmark for developer confidence.”

Immediately include the February 2026 update: METR believed newer tools were likely helping more, but selection effects and measurement problems made the new experiment an unreliable estimate of the effect's size.[3] This is a historical study sequence, not a claim about the latest models today.

The takeaway is generation speed is not end-to-end engineering productivity.

Added from our discussion:
Your proposed process should therefore be judged by useful outcomes, missed requirements, regressions, verification effort, and maintainability—not prompt length or generated line count. Better analysis may prevent the wrong implementation; it does not automatically prove a net speedup.

Visual cue: 2025 measured slowdown and mistaken perception; then the mandatory 2026 caveat.


12. UNDERSTANDING IS STILL EXPENSIVE
16:50–18:10

Return to the PDF's execution/evaluation distinction. The gulf of execution concerns taking action toward a goal; the gulf of evaluation concerns understanding the system's state.[5] Our interpretation is that an agent can shorten the path to an artifact while leaving a substantial burden of checking what the artifact means and does.

Briefly retain the learning study: 52 mostly junior engineers learned an unfamiliar Python library; quiz averages were 50% with AI assistance and 67% without, a 17-percentage-point gap. The task-time difference was not statistically significant.[4] This is a narrow immediate-learning result, not proof that all AI use erodes expertise.

“We reduced the effort of producing code. We still need the ability to understand it.”

Added from our discussion:
This keeps your practical responsibility visible: a person needs enough domain and technical understanding to notice forgotten constraints, unsafe defaults, and incorrect acceptance criteria. In the study, explanation-seeking behaviors were associated with better learning; those behavioral comparisons were qualitative, not separate causal experiments.[4]

Visual cue: Execution becomes easier; evaluation still needs judgment.


13. INTENT IS THE NEW WORKING UNIT
18:10–20:00

Finish where the PDF finishes: instruction → statement → function → query → intent. This is a rhetorical progression, not a claim that older units disappear.

Use about one minute to make your Intent Driven Development / Liva proposal tangible: a person describes the goal aloud; AI asks consequential questions; the transcript becomes an agreed intent; the intent is split into coherent scenario areas; agents implement; people and checks verify the result. Keep intentions maintained alongside code, tests, constraints, and important technical decisions.

Then return to Brooks. Expression has become easier to delegate; deciding what should be expressed and checking what was built remain our responsibility.

“Less code. More meaning. More responsibility.”

Added from our discussion:
Present Liva as your proposed workflow, not an established universal standard. Domain-oriented agents, huge-context hypotheses, and a longer notes-app walkthrough are optional branches from this ending. Do not squeeze all three into its closing minutes. The main point is a shift of emphasis toward intent, not the disappearance of programming.

Visual cue: Instruction → statement → function → query → intent; the final responsibility line.

BRANCHES — OPTIONAL DEVIATIONS AND SUPPORTING DATA

These attach to one particular trunk section. They are preparation material unless explicitly selected to replace something inside that section. They do not add time to the talk.

From 01, supporting data: Run of Show. PDF timings, handoffs, and a two-minute recovery cut list.

From 02, supporting data: Parking Lot and Accuracy. Keep the metaphors; correct the mechanisms and the strength of the claims.

From 02, optional deviation: B02 Shannon and units of meaning. Optional intellectual detour: entropy, semantic density, function points.

From 03, supporting data: B03 Historical visuals. ENIAC, punched cards, and where the PDF gets its historical imagery.

From 04, supporting data: B04 FORTRAN and abstract-machine sources. Background sources for the compiler investment and Dijkstra staircase.

From 05, optional deviation: B05 Intentional Programming before LLMs. Simonyi as historical precedent, not the origin story of Liva.

From 06, optional deviation: B06 LLVM and a language for models. Direct low-level generation, compact typed languages, and var versus int.

From 07, supporting data: B07 Brooks exact quote and context. Verified verbatim in the September 1986 report, section 4.3.

From 08, supporting data: Source Ideas. Provenance and how the co-host discussion enriches the PDF.

From 08, optional deviation: B08 Semantic representations. Context-sensitive meaning, autoencoders, and why coordinates are not labels.

From 08, optional deviation: B08 CSharp AST experiment. A research proposal about code representations, with no claimed results.

From 09, supporting data: B09 Constraints comparison and experiment caveats. Prepared screenshot comparison and the limits of a constraints claim.

From 10, supporting data: B10 Context and executable boundaries. References, tool contracts, maintained intent, and test limits.

From 11, supporting data: B11 METR evidence and limits. The 2025 result and February 2026 update must travel together.

From 12, supporting data: B12 Learning and evaluation evidence. 50% versus 67%; short-term learning, not a universal loss of skill.

From 12, optional deviation: B12 Leaky abstractions. A login request as the short route to a long technical fall.

From 13, optional deviation: Agent Hypothesis. Agents by end-to-end scenario rather than technical job title.

From 13, optional deviation: Notes App Demo. Your notes-app example, preserved as an alternative worked scenario.

From 13, supporting data: B13 Liva process and analyst role. The co-host contribution: maintain intent and a checked path to implementation.

REHEARSAL CUTS

If two minutes must be recovered, trim 30 seconds from compiler history, 20 from the abstract-machine explanation, 30 from the reference examples, and 40 from study detail. Keep the exact Brooks quotation, the METR follow-up caveat, and the closing intent/responsibility argument. Do not promote all branches into main-stage content.

SOURCE AND GRAPH NOTES

The original PDF remains unchanged at Sources/Original background.pdf. The native canvas is Talk Map.canvas. The numbered Trunk folder is the actual note-link sequence. Supporting-data branches are green on the canvas; optional deviations are orange. Every branch has exactly one parent and no all-to-all navigation links. Obsidian's force-directed graph may bend the chain; the canvas fixes the reading order spatially. Use backlinks to return from a branch.


Sources:
[1] https://www.cs.unc.edu/techreports/86-020.pdf
[2] https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study
[3] https://metr.org/blog/2026-02-24-uplift-update
[4] https://www.anthropic.com/research/AI-assistance-coding-skills
[5] https://www.nngroup.com/articles/two-ux-gulfs-evaluation-execution
