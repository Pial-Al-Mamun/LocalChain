# LocalChain

> **An educational, headless blockchain node built from scratch with NestJS.**

I built this to understand how blockchains actually work under the hood—not just the theory, but the code. No third-party blockchain APIs, no web3 magic. Just raw cryptography, consensus, and distributed systems.

## What I Wanted to Learn

This project was my way of answering three questions:

1. **How does Proof of Work actually work?** (The mining loop, the nonce, the hash)
2. **How do nodes agree on a single state?** (The longest chain rule, forks, synchronization)
3. **How do you build a resilient system?** (Queues, caching, locks, health checks)

I built this to go from I know what a blockchain is to I can build one.

## What It Does

- **Proof of Work Mining** – CPU-based mining loop with adjustable difficulty
- **Wallet System** – Generate public/private keypairs, sign transactions (ECDSA)
- **REST API** – Submit transactions, check balances, mine blocks, view the chain
- **Swagger/OpenAPI Docs** – Interactive API documentation at
- **BullMQ Job Queue** – Offloads mining to background workers (API stays snappy)
- **Redis Caching** – Mempool storage, idempotency keys, mining locks (no double-spends)
- **PostgreSQL** – Persistent storage for the finalized blockchain
- **Health Checks** – endpoint to monitor DB + Redis connectivity

## Tech Stack

| Layer                | Technology                          |
| -------------------- | ----------------------------------- |
| **API**              | NestJS (TypeScript)                 |
| **Database**         | PostgreSQL + Kysely (type-safe SQL) |
| **Cache & Queues**   | Redis + BullMQ                      |
| **Validation**       | Zod                                 |
| **Docs**             | Swagger / OpenAPI                   |
| **Containerization** | Docker Compose                      |
