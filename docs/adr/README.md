# Architecture Decision Records

This directory holds the ADRs that describe **why** the BMO codebase
looks the way it does, not just **what** it does. ADRs are immutable;
if a decision is reversed, write a new ADR that supersedes the old one.

| # | Decision                                                   | Status   |
| - | ---------------------------------------------------------- | -------- |
| 0001 | [On-device-first AI inference](0001-on-device-first.md)  | Accepted |
| 0002 | [Rényi DP for federated training](0002-renyi-dp.md)       | Accepted |
| 0003 | [Paillier for secure aggregation](0003-paillier-secure-aggregation.md) | Accepted |
| 0004 | [Com-B over standard DT for evaluation](0004-com-b-over-sdt.md) | Accepted |
| 0005 | [PWA with Workbox for install + offline](0005-pwa-with-workbox.md) | Accepted |

## Format

Each ADR follows the Context → Decision → Consequences pattern. The
template is intentionally minimal (≤ 200 lines) so they stay readable
in a PR review.

## When to write a new ADR

- We chose between two or more substantive alternatives.
- The decision is unlikely to be revisited often, but needs to be
  *explained* often (to a new contributor, an ISEF judge, etc.).
- The choice affects external behaviour, performance, privacy, or
  distribution — not internal style.

When in doubt, write one. It's easier to delete than reconstruct.