from app.connectors.base import Collection, SourceConnector, SourceDocument
from app.connectors.company import CompanyLfiConnector
from app.connectors.registry import get_connector, get_connectors, get_connectors_by_collection


def test_company_connector_is_disabled_by_default():
    conn = CompanyLfiConnector()
    assert conn.enabled is False
    assert conn.collection == Collection.COMPANY


def test_company_connector_raises_when_synced_while_disabled():
    conn = CompanyLfiConnector()
    try:
        next(conn.sync())
    except RuntimeError as exc:
        assert "disabled" in str(exc)
    else:
        raise AssertionError("expected RuntimeError")


def test_registry_excludes_disabled_connectors_by_default():
    connectors = get_connectors()
    assert all(c.enabled for c in connectors)
    assert "company_lfi" not in [c.key for c in connectors]


def test_registry_can_include_disabled_connectors():
    connectors = get_connectors(enabled_only=False)
    assert "company_lfi" in [c.key for c in connectors]


def test_registry_sorts_by_priority_descending():
    connectors = get_connectors(enabled_only=False)
    priorities = [c.priority for c in connectors]
    assert priorities == sorted(priorities, reverse=True)


def test_get_connector_by_key():
    conn = get_connector("company_lfi")
    assert isinstance(conn, SourceConnector)
    assert conn.key == "company_lfi"
    assert get_connector("does_not_exist") is None


def test_get_connectors_by_collection():
    company_connectors = get_connectors_by_collection(Collection.COMPANY, enabled_only=False)
    assert all(c.collection == Collection.COMPANY for c in company_connectors)


def test_source_document_defaults():
    doc = SourceDocument(
        external_id="x1",
        source_key="test",
        collection=Collection.EXTERNAL,
        title="Test doc",
        text="body text",
    )
    assert doc.section_headings == []
    assert doc.extra_metadata == {}
    assert doc.is_outdated_edition is False
