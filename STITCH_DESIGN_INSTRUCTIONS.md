# ProcureAI — Stitch Design Instructions & Reference Guide

This document establishes the official visual identity, design tokens, typography rules, component guidelines, and Stitch reference definitions for the **ProcureAI Enterprise Procurement & Vigilance Platform**.

---

## 1. Design System Core Tokens

Derived from the Google Stitch design system (`projects/18067899362796168678` - **ProcureAI Enterprise Redesign**):

### Palette & Color Tokens
- **Base Canvas / Background**: `#0b0f19` (Deep Cold Navy Slate)
- **Card / Surface Tier 1**: `#111827` (Muted Dark Slate)
- **Card / Surface Tier 2**: `#1f2937` (Elevated Panel)
- **Modal / Overlay Tier 3**: `#1e293b`
- **Hairline Borders**: `#1e293b` (Quiet Divider), `#334155` (Emphasized Frame)
- **Primary Brand**: `#6366f1` (Royal Indigo)
- **Primary Hover**: `#4f46e5`
- **Primary Light/Accent**: `#c0c1ff`
- **Verified / Compliant**: `#10b981` (Emerald) | Fill: `rgba(16, 185, 129, 0.12)` | Border: `rgba(16, 185, 129, 0.4)`
- **Warning / Review**: `#f59e0b` (Amber) | Fill: `rgba(245, 158, 11, 0.12)` | Border: `rgba(245, 158, 11, 0.4)`
- **Risk / Flag**: `#ef4444` (Crimson Rose) | Fill: `rgba(239, 68, 68, 0.12)` | Border: `rgba(239, 68, 68, 0.4)`

### Typography Tokens
- **Body & Headings**: `Hanken Grotesk`, `Inter`, sans-serif
- **Tabular & Identifiers (PAN, GSTIN, LEI, Financials, Timestamps)**: `JetBrains Mono`, monospace
- **Text Primary**: `#f8fafc`
- **Text Secondary**: `#94a3b8`
- **Text Muted**: `#64748b`

### Shapes & Border Radius
- **Base Controls (Buttons, Badges, Chips, Inputs)**: `rounded` (`0.25rem` / `4px`)
- **Containers & Cards**: `rounded-md` / `rounded-lg` (`0.375rem` - `0.5rem` / `6px` - `8px`)
- **Avoid**: Large rounded pills (`rounded-full`) for status tags, which erode the enterprise technical feel.

---

## 2. Component Guidelines

### Buttons & Interactive Controls
- **Primary**: Solid `#6366f1` with text `#ffffff`, border radius 4px.
- **Secondary**: Flat `#111827` or transparent with 1px border `#334155` and text `#f8fafc`.
- **Status Badges**: Semi-transparent background (12% opacity) + 1px solid border (40% opacity) + bold monospace text.

### High-Density Data Tables
- **Headers**: Background `#0f172a`, height 36px, `JetBrains Mono` label font (uppercase, tracked 0.04em, `#94a3b8`).
- **Rows**: Border bottom 1px solid `#1e293b`. Hover background: `#1e293b` (50% opacity).

---

## 3. Stitch Screen Mappings

1. **Overview Dashboard** -> `ProcureAI Enterprise Vigilance & Evaluation Center` (`84047bce535a4899bf7324b8c872b915`)
2. **Entity Risk Graph** -> `Entity Network & Collusion Intelligence Graph` (`c003c7c84ecf4bc3b5cb01f4bb44dfdd`)
3. **Vigilance & Risks** -> `Vigilance & Procurement Risk Signals` (`fb424a5b61eb462dbfc7b8da290b31a8`)
4. **Bidder Management** -> `Bidder Management & Registry` (`eb28cfd08a824818bea710c8b1a0730e`)
5. **Requirements Matrix** -> `Tender Requirements Matrix` (`a59dcb959d404566a3a1c8c5bcccc0f2`)

---

## 4. Invariants (DO NOT CHANGE)
- Backend APIs (FastAPI routes)
- SQLite database models & schema
- Extraction, OCR, and AI engine algorithms
- API response interfaces & contracts
