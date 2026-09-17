"""Reserved connector for the company incident source (PDO LFI alerts).

Not implemented yet — access hasn't been approved. This class exists so
the "company" collection, the `search_company` tool, and the *Company
LFI:* answer section all have something to plug into from day one, and so
turning the source on later is a config change plus filling in `sync()`,
not a redesign.

See README.md -> "Adding the company source" for the steps to enable this
once PDO LFI access is granted.
"""

from __future__ import annotations

from datetime import datetime
from typing import Iterator, Optional

from app.config import get_settings
from app.connectors.base import Collection, SourceConnector, SourceDocument


class CompanyLfiConnector(SourceConnector):
    key = "company_lfi"
    collection = Collection.COMPANY

    #: Given the highest priority so that, once enabled, this becomes the
    #: primary source searched first on every question (per design requirement).
    priority = 100

    def __init__(self) -> None:
        settings = get_settings()
        self.display_name = settings.company_source_name
        self.enabled = settings.company_source_enabled

    def sync(self, since: Optional[datetime] = None) -> Iterator[SourceDocument]:
        if not self.enabled:
            raise RuntimeError(
                "CompanyLfiConnector is disabled. Set COMPANY_SOURCE_ENABLED=true "
                "and implement sync() once PDO LFI access is approved."
            )
        # TODO (future work, once access is approved): fetch LFI alerts from
        # COMPANY_SOURCE_API_URL (or read from COMPANY_SOURCE_SYNC_DIR for a
        # file-drop integration) and yield one SourceDocument per alert with
        # collection=Collection.COMPANY, source_key="company_lfi".
        yield from ()

    def last_sync_info(self) -> Optional[str]:
        if not self.enabled:
            return "not connected yet"
        return None
