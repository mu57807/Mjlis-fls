"""Registry of all known source connectors.

This is the single place that knows which connectors exist. The brain's
tools, the admin re-index script, and the WhatsApp "sources" command all
read this instead of importing individual connectors, so adding a source
means adding it here (and nowhere else).
"""

from __future__ import annotations

from app.connectors.base import Collection, SourceConnector
from app.connectors.company import CompanyLfiConnector

_connectors: list[SourceConnector] | None = None


def _build_connectors() -> list[SourceConnector]:
    connectors: list[SourceConnector] = []

    # Phase 2 will add IOGPConnector here.
    # Phase 5+ will add CSB/BSEE/PHMSA/IOGP-alerts/etc connectors here.

    connectors.append(CompanyLfiConnector())

    return connectors


def get_connectors(enabled_only: bool = True) -> list[SourceConnector]:
    """Return connectors, highest priority first.

    The company connector (priority higher than everything else) sorts
    first once it's enabled, which is what makes it the primary source
    that gets searched first per the design requirement.
    """
    global _connectors
    if _connectors is None:
        _connectors = _build_connectors()

    connectors = _connectors
    if enabled_only:
        connectors = [c for c in connectors if c.enabled]
    return sorted(connectors, key=lambda c: c.priority, reverse=True)


def get_connectors_by_collection(collection: Collection, enabled_only: bool = True) -> list[SourceConnector]:
    return [c for c in get_connectors(enabled_only=enabled_only) if c.collection == collection]


def get_connector(key: str) -> SourceConnector | None:
    for c in get_connectors(enabled_only=False):
        if c.key == key:
            return c
    return None
