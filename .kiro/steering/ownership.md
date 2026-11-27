# Ownership

Three people build TombsPad. Each owns specific paths. The map:

#[[file:.kiro/ownership.json]]

## How to read the map
- The owner of a path is the entry in `paths` or `shared` with the longest match. Entries ending in `/` are folders; other entries are exact files.
- Paths that match no entry belong to `defaultOwner`.
- Entries in `shared` may be edited by anyone, but only on a feature branch merged through a pull request.

## Who the current user is
- Use the user's personal steering (in `~/.kiro/steering/`) if it names them.
- Otherwise run `git config user.name` and match it against `gitNames` in `members`.
- If you still can't tell, ask before editing any file in this repo.

## Rules
- Only create, edit, move, or delete files that the current user owns, or files in `shared`.
- If a task needs a change in a path owned by someone else, don't make it. Tell the user which file and which owner, and write the proposed change in the chat so the user can pass it on.
- When you change a `shared` file, say so, so the user can announce it to the team.
- These rules also cover shell commands that write, move, or delete files (generators, formatters, `npm install`, `Remove-Item`). The scope-guard hook only sees Kiro's file tools, not shell commands. Deletes usually go through the shell, so check ownership before deleting anything.
- A spec's tasks must only touch paths its owner owns. Anything needed from another part goes in a "Needs from other parts" section of the design.
- When the work split changes, `nabotz` updates `.kiro/ownership.json`. Other members ask `nabotz` instead of editing it.
