# Storage and Documents

## Overview

SolaShare needs a dedicated document and file strategy because the product depends on trust and transparency around real-world assets.

The system must support storage for:
- technical passports
- ownership or rights documents
- photos
- meter information
- financial reports
- proof bundles
- investor-facing public evidence

---

## Storage Goals

The storage layer should provide:
- durable file hosting
- stable URIs
- file hashing
- optional public access
- compatibility with immutable proof references

---

## Recommended Approach

Use a hybrid strategy:

### Public and trust-critical references
Use:
- Arweave
- IPFS

For:
- public proof-of-asset bundles
- public proof-of-income bundles
- investor-facing permanent references

### Operational files or drafts
Use:
- S3-compatible storage

For:
- intermediate uploads
- drafts
- internal files
- admin-only materials

---

## Asset Document Types

Supported document types:
- `ownership_doc`
- `right_to_income_doc`
- `technical_passport`
- `photo`
- `meter_info`
- `financial_model`
- `revenue_report`
- `other`

---

## Required Metadata Per File

Every uploaded file should have:
- `storage_provider`
- `storage_uri`
- `content_hash`
- `mime_type`
- `uploader`
- `visibility`
- `asset_id`
- `document_type`
- `created_at`

---

## Hashing

Hashing is essential for auditability.

### Why hash files
- detect tampering
- reference immutable proof
- anchor trust-critical docs in metadata or on-chain references
- support public transparency

### Suggested approach
- compute file hash on upload
- persist hash in DB
- include hash in proof bundle metadata
- optionally include hash in on-chain revenue posting reference

---

## Public vs Private Files

### Public files
May include:
- public asset photos
- public technical summary
- public proof bundle
- public revenue report summary

### Private or restricted files
May include:
- sensitive legal documents
- internal issuer files
- admin review materials
- investor KYC documents

Private files should be stored in S3-compatible object storage with backend-controlled access paths.

---

## Document Lifecycle

### Upload phase
1. file uploaded
2. hash generated
3. storage provider URI created
4. DB row created
5. visibility set
6. optional proof bundle updated

### Consumption phase
1. asset page queries available public docs
2. investor sees proof links
3. issuer sees all owned docs
4. admin sees moderation context

---

## Proof Bundle Design

A proof bundle is a structured list of evidence references for an asset or revenue epoch.

### Asset proof bundle can include
- technical passport URI
- ownership/right-to-income document URI
- asset photos
- meter info
- summary metadata JSON
- bundle hash

### Revenue proof bundle can include
- reporting period
- report URI
- report hash
- source type
- financial summary
- bundle hash

---

## Practical MVP Guidance

For MVP:
- store files off-chain
- store URIs and hashes in DB
- expose selected public files on asset pages
- avoid overengineering encryption unless truly needed
- make public proof links visible in the demo
