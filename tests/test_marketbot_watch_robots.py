import importlib.util
from pathlib import Path

import pytest


spec = importlib.util.spec_from_file_location(
    'watch_sources', Path(__file__).resolve().parents[1] / 'marketbot-collectors' / 'watch_sources.py'
)
watch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(watch)


def test_html_error_page_cannot_grant_robots_permission():
    with pytest.raises(ValueError, match='HTML'):
        watch.parse_robots('https://example.org', '<!DOCTYPE html><html>maintenance</html>')


def test_missing_directives_cannot_grant_robots_permission():
    with pytest.raises(ValueError, match='User-agent'):
        watch.parse_robots('https://example.org', 'Service temporarily unavailable')


def test_valid_rules_keep_disallowed_paths_blocked():
    parser = watch.parse_robots('https://example.org', 'User-agent: *\nDisallow: /private\nAllow: /public\n')
    assert parser.can_fetch(watch.USER_AGENT, 'https://example.org/public')
    assert not parser.can_fetch(watch.USER_AGENT, 'https://example.org/private')
