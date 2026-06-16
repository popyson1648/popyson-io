+++
title = "Type-Driven CLI Design"
date = "2026-05-21"
reading = 8
tags = ["CLI", "型", "DX"]
kana = "かたでみちびくしーえるあい"
summary = "When subcommands and arguments are expressed as types, help, completion and validation all grow from one place. Notes on deleting hand-written branches."
+++

Hand-written argument parsing feels good for the first few lines. The trouble comes after. Every new flag adds a branch, and help text drifts from implementation. Here I trace a design that treats types as the source of truth and derives the rest.

## What was wrong

In the old CLI we wrote the same information three times: the argument definition, the help description, and the validation logic. The three drift apart fast.

- Flags that work but aren't in help
- Flags in help that no longer work
- Validation that only fires on some paths

:::warn
"Just add an if" is fast in the short term. But nobody tests that branch, and it always breaks six months later.
:::

## Giving it a shape with types

We declare subcommands as an algebraic data type. Exhaustiveness checking kicks in, and when we add a subcommand the compiler points at every place we forgot to handle it.

```typescript
type Command =
  | { kind: "build"; target: string; release: boolean }
  | { kind: "watch"; paths: string[] }
  | { kind: "clean" };

function run(cmd: Command) {
  switch (cmd.kind) {
    case "build": return build(cmd.target, cmd.release);
    case "watch": return watch(cmd.paths);
    case "clean": return clean();
  }
}
```

## Deriving help, completion, validation

With one type in hand, the rest follows as functions. The order looks like this.

1. Generate a schema from the type
2. Assemble help text from the schema
3. Emit shell completion from the schema
4. Validate input against the schema, then map into the type

:::info
The payoff is that help and implementation cannot structurally drift. Both grow from the same type.
:::

## The result

The hand-written branches are gone and the code is less than half its size. More importantly, adding a flag stopped being scary because the compiler walks with you.
