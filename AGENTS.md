# AGENTS.md

## Project Overview

This project is a personal financial management application focused on:

- Asset management
- Debt management
- Monthly cash flow forecasting
- Financial risk analysis
- AI-assisted financial insights

The application is intended for personal use and optimized for:

- Fast iteration
- Low operational cost
- Edge-native architecture
- Rust backend development practice
- AI integration readiness

The app is NOT intended to become a banking-grade accounting system.
The focus is simplicity, visibility, and AI-assisted decision support.

---

# Tech Stack

## Frontend

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- Zustand
- Zod
- Recharts

## Backend

- Cloudflare Workers
- Rust
- worker-rs

## Database

- Cloudflare D1 (SQLite)

## Hosting

- Cloudflare Pages

---

# Architecture Principles

## 1. Snapshot-first design

This application is NOT transaction-first.

The core design is based on periodic financial snapshots.

Example:

- Current bank balances
- Current credit card usage
- Current debts
- Current monthly expenses
- Current income forecasts

The system should optimize for:

- Simple manual input
- Fast updates
- AI-readable summaries

NOT:

- Double-entry bookkeeping
- Full accounting systems
- Bank synchronization

---

## 2. AI-first architecture

The system should be designed so that AI can easily analyze the user's financial state.

Important:

- Keep data structures explicit and simple
- Prefer strongly typed domain models
- Generate structured financial summaries
- Make exporting AI-readable JSON easy

Example outputs:

- Net worth
- Debt ratio
- Credit utilization
- Monthly runway
- Estimated month-end balance
- Financial risk score

---

## 3. Edge-native backend

The backend should remain lightweight and stateless where possible.

Workers should mainly handle:

- Validation
- Aggregation
- Financial calculations
- Risk analysis
- JSON generation

Avoid:

- Heavy frameworks
- Large runtime dependencies
- Stateful backend patterns

---

## 4. Simplicity over abstraction

Prefer:

- Explicit code
- Small modules
- Clear domain naming
- Readable SQL

Avoid:

- Premature abstraction
- Enterprise-style layering
- Overengineered architecture

This is a personal product.

---

# Domain Concepts

## Snapshot

Represents the user's financial state at a point in time.

Includes:

- Assets
- Debts
- Credit usage
- Monthly expenses
- Income forecasts

---

## Account Types

Supported account categories:

- Bank
- CreditCard
- CardLoan
- ConsumerLoan
- Investment
- Crypto
- Cash
- Other

---

## Financial Metrics

The application should calculate:

- Total assets
- Total debt
- Net worth
- Credit utilization ratio
- Monthly fixed expenses
- Monthly expected income
- Estimated remaining balance
- Safe spending amount
- Debt dependency ratio

---

# Database Design Principles

Use SQLite-friendly schema design.

Prefer:

- INTEGER for money values
- Store currency in smallest units if needed
- Simple normalized tables
- Explicit foreign keys

Avoid:

- Complex ORM patterns
- Excessive joins
- Dynamic schemas

---

# Rust Backend Guidelines

## General

- Prefer small functions
- Prefer Result-based error handling
- Avoid unwrap in production code
- Use serde for JSON serialization
- Keep handlers thin

## Libraries

Recommended:

- worker
- serde
- serde_json
- chrono
- thiserror

Avoid unnecessary dependencies.

---

# Frontend Guidelines

## UI Philosophy

The UI should feel:

- Fast
- Minimal
- Practical
- Spreadsheet-friendly

The app is a dashboard tool, not a social product.

---

## State Management

Use:

- Zustand for local UI state
- TanStack Query for server state

Avoid:

- Redux unless truly necessary

---

# Security

This app handles highly sensitive financial information.

Requirements:

- Never log sensitive financial data
- Avoid exposing raw database contents
- Validate all inputs
- Sanitize exported JSON
- Keep secrets in Cloudflare environment variables

---

# Future Features

Potential future features:

- AI financial advisor
- Month-end prediction
- Financial danger alerts
- Repayment simulation
- PWA support
- Mobile optimization
- Historical graphs
- AI-generated financial summaries

---

# Non-Goals

This project is NOT trying to become:

- A full accounting platform
- A banking integration platform
- A tax filing system
- A multi-tenant SaaS product

Keep the scope practical and personal-first.
