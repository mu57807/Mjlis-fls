"""The pluggable source connector interface.

Every place content enters the system — the IOGP library, each external
regulator/alert source, and eventually the company LFI feed — implements
`SourceConnector`. Storage, ingestion, the brain's tools, and the WhatsApp
layer only ever talk to this interface (and the `registry` module below),
never to a specific source. Adding a new source means writing one new
connector class and registering it; nothing else in the system changes.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
from typing import Iterator, Optional


class Collection(str, Enum):
    """The three vector-store collections. See storage/vectorstore.py."""

    IOGP = "iogp"
    EXTERNAL = "external"
    COMPANY = "company"


@dataclass
class SourceDocument:
    """One normalized unit of content, produced by a connector's `sync()`.

    A downstream ingestion pipeline chunks `text`, embeds each chunk, and
    stores it in the vector collection plus the SQLite structured table.
    Fields that don't apply to a given source (e.g. `report_number` for a
    CSB investigation report) are left None.
    """

    # Identity
    external_id: str  # stable id within the source, e.g. "IOGP-815" or "CSB-2021-01"
    source_key: str  # machine name of the connector, e.g. "iogp", "csb", "company_lfi"
    collection: Collection

    # Content
    title: str
    text: str  # full document/record text; chunked downstream
    url: Optional[str] = None

    # Provenance / dates
    regulator_or_country: Optional[str] = None
    publication_date: Optional[date] = None
    incident_date: Optional[date] = None

    # Classification
    facility_type: Optional[str] = None
    incident_type: Optional[str] = None
    segment: Optional[str] = None  # upstream | midstream | downstream | drilling | offshore
    root_causes: Optional[str] = None
    learnings: Optional[str] = None

    # IOGP-specific (report/standard metadata)
    report_number: Optional[str] = None
    version_or_edition: Optional[str] = None
    is_outdated_edition: bool = False
    section_headings: list[str] = field(default_factory=list)
    page_number: Optional[int] = None

    # Catch-all for source-specific fields we don't want to model explicitly yet
    extra_metadata: dict = field(default_factory=dict)


class SourceConnector(ABC):
    """Base class every source (IOGP, each external site, company LFI) implements."""

    #: Unique machine name, e.g. "iogp", "csb", "bsee", "company_lfi".
    key: str

    #: Human-readable name shown in the WhatsApp "sources" command.
    display_name: str

    #: Which vector collection this connector's documents belong to.
    collection: Collection

    #: Whether this connector is active. The reserved company connector
    #: starts disabled; external connectors are enabled as they're built.
    enabled: bool = True

    #: Search/answer priority. Higher is searched/cited first. The company
    #: source is given the highest priority so it becomes primary once enabled.
    priority: int = 0

    @abstractmethod
    def sync(self, since: Optional[datetime] = None) -> Iterator[SourceDocument]:
        """Yield documents that are new or changed since `since`.

        Pass `since=None` for a full sync. Connectors backed by a local
        folder (IOGP PDFs) or a bulk feed may ignore `since` and rely on
        content hashing downstream to skip unchanged documents.
        """
        raise NotImplementedError

    def deleted_external_ids(self, since: Optional[datetime] = None) -> Iterator[str]:
        """Yield external_ids that should be removed from storage.

        Default: no deletions. Override for sources that can detect removed
        content (e.g. a PDF deleted from ./sources/iogp/).
        """
        return iter(())

    def last_sync_info(self) -> Optional[str]:
        """Optional human-readable status for the WhatsApp "sources" command,
        e.g. "142 documents, last synced 2026-09-16". Storage layer fills the
        real answer in; connectors may override if they track this themselves.
        """
        return None
