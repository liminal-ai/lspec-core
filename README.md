# lbuild-impl

Implementation runtime for Liminal Build — agentic impl/verify orchestration.

This package provides the SDK and CLI primitives that drive the implementation phase of a Liminal Build spec pack: dispatching story implementors, running verification passes, applying bounded fixes, and recording durable artifacts. It is one piece of the broader Liminal Build platform; the platform itself runs as a separate web application.

## Install

```sh
npm install lbuild-impl
```

## Use as CLI

```sh
npx lbuild-impl inspect --spec-pack-root ./path/to/spec-pack --json
```

## Use as SDK

```ts
import { inspect } from "lbuild-impl/sdk";

const result = await inspect({ specPackRoot: "./path/to/spec-pack" });
```

## Status

Indie open-source pre-release (`0.1.0`). API and CLI surface may evolve as the broader Liminal Build platform stabilizes.
