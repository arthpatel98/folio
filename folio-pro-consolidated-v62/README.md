# Folio Pro Consolidated v46

Changes in v46:
- Holdings portfolio switcher order: Robinhood, Fidelity Roth IRA, Fidelity 401(k), All Portfolios.
- Refined Holdings action controls (Refresh Prices, download, edit/add) with UI-only styling changes.
- Realized Returns and Quarterly Data are now scoped to the selected portfolio.
- Fidelity Roth IRA no longer inherits Robinhood realized-return/chart data.
- Added the supplied Fidelity Roth IRA realized-return summary positions totaling $7,658.02.
- Fidelity Roth IRA monthly bar charts remain zero/empty until dated Roth realized transactions are available; live dated Roth transactions will populate their corresponding months automatically.
- Manually entered dividend and interest transactions now flow into the bar charts by transaction date for the selected portfolio, including live Robinhood entries such as the Aug 2026 MSTU dividend when present in the transaction ledger.

Changes in v53:
- Restored existing historical Profit Position labels so v52 does not retroactively rename prior data.
- New Profit transactions added going forward are stamped with a creation timestamp; only those new transactions use company names for stocks and full option details for options in the bar-chart Profit Position column.
- Negative bar value labels render outside, below the end of negative bars, with additional chart padding to keep them clear of month/year labels.
