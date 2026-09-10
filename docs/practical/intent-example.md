# IDD-0001.spec-safe-local-change-viewer

> Illustrative talk specimen. These are proposed demonstration choices, not approved requirements for a deployed product. No implementation or passing verification is implied.

## Intent

Help a developer understand local changes in one Git repository without risking their work or disclosing repository content to a remote service.

## Related Specifications

None for this deliberately bounded demonstration. Repository mutation, remote collaboration, authentication, and settings persistence are outside its scope.

## Behavior

- The developer selects an existing local Git repository and sees its current branch or detached-HEAD state.
- The viewer distinguishes staged changes, unstaged changes, and untracked files. A file with both staged and unstaged edits exposes both states rather than silently dropping one.
- For changed tracked text files, the developer can inspect the relevant staged or unstaged difference. Untracked files are identified as untracked rather than treated as having a committed baseline.
- Ignored files are not included in the default change listing.
- Repository paths and filenames containing spaces are handled correctly.
- An invalid or non-repository location produces an understandable error and does not create a repository.

## Durable Architecture And Constraints

- All supported inspection actions preserve the selected repository's working-tree content, index, refs and configuration. They do not perform commits, checkouts, resets, staging, writes, fetches or pushes.
- Repository content and metadata are not transmitted to remote services. If a local browser-to-backend connection is used, it remains on the same machine and is not a remote upload.
- File contents, filenames, and repository-supplied strings are treated as data, not executable commands or active page content. Inspection must not execute repository-provided hooks or scripts.
- Safety restrictions apply to refresh, error handling and navigation as well as initial loading.
- This version supports the demonstrated local repository case. Unsupported repository layouts or change types must fail clearly or be labelled as unsupported rather than silently producing misleading output.

## Non-Goals

- Editing files, staging changes, committing, resetting, checking out, merging, resolving conflicts, fetching, or pushing.
- Remote hosting integration, cloud synchronization, user accounts, or analytics.
- Full support for every Git repository layout, submodule, large/binary file diff, or enterprise workflow.
- Matching any existing Git client's interface or feature set.

## Acceptance Criteria

1. A controlled repository containing staged, unstaged, untracked, and ignored files displays the first three in their correct categories and omits the ignored file from the default listing.
2. A tracked file with both staged and unstaged edits exposes the distinct differences correctly.
3. Opening, navigating, inspecting differences, refreshing, and handling an invalid location leave the protected repository state unchanged.
4. The exercised scenarios produce no transmission of repository content or metadata to a remote destination.
5. A filename containing spaces is displayed and inspected as one filename, without command interpretation.
6. Invalid and unsupported inputs produce honest, non-destructive feedback.

## Verification

- End-to-end coverage compares the displayed results with known fixture states, including simultaneous staged and unstaged edits.
- Repository-integrity evidence compares working-tree content, index, refs and configuration before and after supported operations and error paths.
- Network-capable code paths are reviewed, and both application/backend and browser communication are observed in the exercised scenarios. Absence of traffic in a finite run is not treated as proof about all possible inputs or future versions.
- At least one intentionally introduced behavioral regression causes its corresponding acceptance check to fail, and restoring the behavior makes the check pass. This validates the usefulness of that check, not the completeness of the specification.
- Verification reports identify the exercised scope and remaining unsupported cases. Successful checks do not replace human review of whether the accepted product intent is itself appropriate.
