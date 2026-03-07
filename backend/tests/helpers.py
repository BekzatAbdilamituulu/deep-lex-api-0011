def set_default_pair(client, token: str, src_id: int, tgt_id: int) -> int:
    # set defaults
    r = client.put(
        "/api/v1/users/me/languages",
        json={
            "default_source_language_id": src_id,
            "default_target_language_id": tgt_id,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text

    # fetch pairs and return default pair id
    r = client.get(
        "/api/v1/users/me/learning-pairs",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text
    pairs = r.json()
    for p in pairs:
        if p["is_default"]:
            return p["id"]
    raise AssertionError("Default pair not found")


