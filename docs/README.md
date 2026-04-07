# SolaShare Documentation Index

This directory is the primary technical documentation set for the SolaShare repository.

Use it in two ways:

- as an architecture reference for the backend, data model, and Solana integration
- as a navigation layer for understanding how the repository is split across backend, frontend,
  on-chain, research, and operational materials

## Recommended Reading Order

If you are new to the project, read in this order:

1. [../README.md](/home/const/solashare/README.md)
2. [01-architecture-overview.md](/home/const/solashare/docs/01-architecture-overview.md)
3. [11-repository-map.md](/home/const/solashare/docs/11-repository-map.md)
4. [12-modules-reference.md](/home/const/solashare/docs/12-modules-reference.md)
5. [13-dependencies-and-runtime.md](/home/const/solashare/docs/13-dependencies-and-runtime.md)
6. [14-onchain-workspace.md](/home/const/solashare/docs/14-onchain-workspace.md) if your task
   touches Solana program behavior
7. the domain-specific documents relevant to your task

## Core Documents

- [01-architecture-overview.md](/home/const/solashare/docs/01-architecture-overview.md)
  High-level system architecture, trust split, service boundaries, and design principles.

- [02-domain-model.md](/home/const/solashare/docs/02-domain-model.md)
  Core entities, ownership and lifecycle concepts, and business-level relationships.

- [03-database-schema.md](/home/const/solashare/docs/03-database-schema.md)
  PostgreSQL and Drizzle schema design, normalized records, and read-model responsibilities.

- [04-api-spec.md](/home/const/solashare/docs/04-api-spec.md)
  Human-readable REST API contract, access matrix, conventions, and endpoint behavior.

- [05-onchain-design.md](/home/const/solashare/docs/05-onchain-design.md)
  Solana account model, transaction responsibilities, and on-chain boundaries.

- [06-sync-indexer.md](/home/const/solashare/docs/06-sync-indexer.md)
  Sync strategy for chain events, webhook ingestion, polling, and idempotent reconciliation.

- [07-core-flows.md](/home/const/solashare/docs/07-core-flows.md)
  End-to-end product flows for issuance, investment, revenue, and claims.

- [08-storage-and-documents.md](/home/const/solashare/docs/08-storage-and-documents.md)
  Document storage model, file metadata, proof organization, and object storage expectations.

- [09-security-and-operational-risks.md](/home/const/solashare/docs/09-security-and-operational-risks.md)
  Security posture, operational risks, and hardening considerations.

- [10-deployment-and-roadmap.md](/home/const/solashare/docs/10-deployment-and-roadmap.md)
  Deployment notes, phased rollout thinking, and roadmap direction.

## Repository Guides

- [11-repository-map.md](/home/const/solashare/docs/11-repository-map.md)
  Directory-by-directory guide to the repository, including backend source layout, scripts,
  frontend, on-chain workspace, research, and supporting materials.

- [12-modules-reference.md](/home/const/solashare/docs/12-modules-reference.md)
  Reference for all backend submodules, shared libraries, Elysia plugins, tests, scripts, and
  sibling subprojects.

- [13-dependencies-and-runtime.md](/home/const/solashare/docs/13-dependencies-and-runtime.md)
  Dependency inventory, local infrastructure, environment variables, commands, and quickstart
  operations.

- [14-onchain-workspace.md](/home/const/solashare/docs/14-onchain-workspace.md)
  Dedicated reference for `solashare_program/`, including real dependencies, instructions,
  accounts, PDA strategy, and backend integration points.

## Working Documents

- [TODO.md](/home/const/solashare/docs/TODO.md)
  Active implementation backlog and follow-up items not yet folded into the main architecture set.

## Related Repository Materials

- [../TESTING_GUIDE.md](/home/const/solashare/TESTING_GUIDE.md)
  Testing workflows and validation guidance.

- [../DEPLOYMENT_COMPLETE.md](/home/const/solashare/DEPLOYMENT_COMPLETE.md)
  Additional deployment notes.

- [../research/research.pdf](/home/const/solashare/research/research.pdf)
  Research artifact snapshot.

- [../research/research.typ](/home/const/solashare/research/research.typ)
  Typst source for the research artifact.

## How To Use This Docs Set

For common tasks:

- implementing backend behavior: start with
  [01-architecture-overview.md](/home/const/solashare/docs/01-architecture-overview.md),
  [03-database-schema.md](/home/const/solashare/docs/03-database-schema.md),
  [04-api-spec.md](/home/const/solashare/docs/04-api-spec.md), and
  [12-modules-reference.md](/home/const/solashare/docs/12-modules-reference.md)
- changing Solana behavior: start with
  [05-onchain-design.md](/home/const/solashare/docs/05-onchain-design.md),
  [06-sync-indexer.md](/home/const/solashare/docs/06-sync-indexer.md), and the
  dedicated workspace reference
  [14-onchain-workspace.md](/home/const/solashare/docs/14-onchain-workspace.md)
- booting the project locally: start with
  [../README.md](/home/const/solashare/README.md) and
  [13-dependencies-and-runtime.md](/home/const/solashare/docs/13-dependencies-and-runtime.md)
- understanding the repo as a whole: start with
  [11-repository-map.md](/home/const/solashare/docs/11-repository-map.md)

## Notes On Accuracy

The repository is under active development. When documentation and implementation diverge:

- treat the source code as the current runtime truth
- update the relevant docs in the same change where practical
- explicitly call out temporary mismatches in pull requests or task summaries
