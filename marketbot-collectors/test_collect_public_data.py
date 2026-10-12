import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError, URLError


spec = importlib.util.spec_from_file_location('collector', Path(__file__).with_name('collect_public_data.py'))
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)


class Response:
    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def read(self, _):
        return b'{"data": []}'


class RequestRetryTest(unittest.TestCase):
    def test_transient_connection_error_recovers(self):
        with patch.object(collector, 'urlopen', side_effect=[URLError('temporary'), Response()]) as open_url, \
                patch.object(collector.time, 'sleep'):
            self.assertEqual(collector.request('sample', {}), b'{"data": []}')
        self.assertEqual(open_url.call_count, 2)

    def test_authorization_error_is_not_retried(self):
        error = HTTPError('https://apis.data.go.kr/sample', 403, 'Forbidden', {}, None)
        with patch.object(collector, 'urlopen', side_effect=error) as open_url, \
                patch.object(collector.time, 'sleep') as sleep:
            with self.assertRaises(HTTPError):
                collector.request('sample', {})
        self.assertEqual(open_url.call_count, 1)
        sleep.assert_not_called()


if __name__ == '__main__':
    unittest.main()
