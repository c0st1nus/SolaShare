# SolaShare Documentation Index

This directory is the main reference for architecture, repository layout, runtime setup, and
operational workflows.

## Recommended Reading Order

1. [../README.md](/home/const/solashare/README.md)
2. [11-repository-map.md](/home/const/solashare/docs/11-repository-map.md)
3. [13-dependencies-and-runtime.md](/home/const/solashare/docs/13-dependencies-and-runtime.md)
4. [15-monorepo-operations.md](/home/const/solashare/docs/15-monorepo-operations.md)
5. [01-architecture-overview.md](/home/const/solashare/docs/01-architecture-overview.md)
6. [12-modules-reference.md](/home/const/solashare/docs/12-modules-reference.md)
7. [14-onchain-workspace.md](/home/const/solashare/docs/14-onchain-workspace.md) when the task
   touches Solana program behavior

## Core Documents

- [01-architecture-overview.md](/home/const/solashare/docs/01-architecture-overview.md)
- [02-domain-model.md](/home/const/solashare/docs/02-domain-model.md)
- [03-database-schema.md](/home/const/solashare/docs/03-database-schema.md)
- [04-api-spec.md](/home/const/solashare/docs/04-api-spec.md)
- [05-onchain-design.md](/home/const/solashare/docs/05-onchain-design.md)
- [06-sync-indexer.md](/home/const/solashare/docs/06-sync-indexer.md)
- [07-core-flows.md](/home/const/solashare/docs/07-core-flows.md)
- [08-storage-and-documents.md](/home/const/solashare/docs/08-storage-and-documents.md)
- [09-security-and-operational-risks.md](/home/const/solashare/docs/09-security-and-operational-risks.md)
- [10-deployment-and-roadmap.md](/home/const/solashare/docs/10-deployment-and-roadmap.md)

## Repository Guides

- [11-repository-map.md](/home/const/solashare/docs/11-repository-map.md)
  Directory-by-directory map of the monorepo.
- [12-modules-reference.md](/home/const/solashare/docs/12-modules-reference.md)
  Backend module and shared-library reference.
- [13-dependencies-and-runtime.md](/home/const/solashare/docs/13-dependencies-and-runtime.md)
  Dependencies, env, quickstart, and operational commands.
- [14-onchain-workspace.md](/home/const/solashare/docs/14-onchain-workspace.md)
  Anchor workspace, program layout, and Solana-specific setup.
- [15-monorepo-operations.md](/home/const/solashare/docs/15-monorepo-operations.md)
  Monorepo conventions, root scripts, and PM2 usage.

## Related Materials

- [../research/research.pdf](/home/const/solashare/research/research.pdf)

## Accuracy Rule

If implementation and docs diverge:

- treat code as current runtime truth
- update the relevant docs in the same change when practical
- call out temporary mismatches explicitly
