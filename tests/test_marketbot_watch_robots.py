import importlib.util
from pathlib import Path

import pytest
from urllib.error import HTTPError, URLError


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


def test_timeout_retries_the_same_public_url_once(monkeypatch):
    url = 'https://example.org/robots.txt'
    calls = []
    def timeout(*_args, **_kwargs):
        raise URLError(TimeoutError('timed out'))
    def curl(command, **_kwargs):
        calls.append(command)
        return type('Result', (), {'stdout': b'User-agent: *\nAllow: /\n'})()
    monkeypatch.setattr(watch, 'urlopen', timeout)
    monkeypatch.setattr(watch.subprocess, 'run', curl)
    assert watch.get(url) == b'User-agent: *\nAllow: /\n'
    assert len(calls) == 1 and calls[0][-1] == url


def test_http_denial_is_never_retried(monkeypatch):
    def denied(*_args, **_kwargs):
        raise HTTPError('https://example.org/robots.txt', 403, 'Forbidden', {}, None)
    monkeypatch.setattr(watch, 'urlopen', denied)
    monkeypatch.setattr(watch.subprocess, 'run', lambda *_args, **_kwargs: pytest.fail('unexpected curl retry'))
    with pytest.raises(HTTPError):
        watch.get('https://example.org/robots.txt')
