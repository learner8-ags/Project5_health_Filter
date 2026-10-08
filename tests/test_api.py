from fastapi.testclient import TestClient
from app.main import app
client=TestClient(app)
def test_server_count():
    body=client.get('/api/servers').json(); assert len(body)==4; assert {x['health'] for x in body}=={'OK','Warning','Critical'}

def test_servers_contract_unchanged():
    body = client.get('/api/servers').json()
    assert body == [
        {'name': 'edge-01', 'model': 'DL360 Gen11', 'health': 'OK'},
        {'name': 'edge-02', 'model': 'DL380 Gen11', 'health': 'Warning'},
        {'name': 'db-01', 'model': 'DL360 Gen11', 'health': 'Critical'},
        {'name': 'api-01', 'model': 'DL380 Gen11', 'health': 'OK'},
    ]
