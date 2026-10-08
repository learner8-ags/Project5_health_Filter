from fastapi.testclient import TestClient
from app.main import app
client=TestClient(app)
def test_server_count():
    body=client.get('/api/servers').json(); assert len(body)==4; assert {x['health'] for x in body}=={'OK','Warning','Critical'}
