from fastapi.testclient import TestClient
from app.core.config import settings

def test_create_peer_group(client: TestClient):
    response = client.post(
        f"{settings.API_V1_STR}/peer-groups/",
        json={"name": "Test Group", "description": "A test group"},
    )
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == "Test Group"
    assert "id" in content

def test_read_peer_groups(client: TestClient):
    response = client.get(f"{settings.API_V1_STR}/peer-groups/")
    assert response.status_code == 200
    content = response.json()
    assert isinstance(content, list)
    assert len(content) > 0

def test_join_peer_group(client: TestClient):
    # First create a group
    create_res = client.post(
        f"{settings.API_V1_STR}/peer-groups/",
        json={"name": "Joinable Group", "description": "For joining"},
    )
    group_id = create_res.json()["id"]
    
    # Try to join (should fail because creator is auto-joined)
    response = client.post(f"{settings.API_V1_STR}/peer-groups/{group_id}/join")
    assert response.status_code == 400 # Already a member
    
    # TODO: To test successful join, we need a second user. 
    # For now, verifying the endpoint exists and returns 400 for existing member is good.
