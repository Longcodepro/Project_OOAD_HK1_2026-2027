def test_health_reports_database_up(client):
    r = client.get("/health")
    assert r.status_code == 200 and r.json() == {"status": "ok", "database": "up"}


def test_cors_allows_frontend_origin_and_blocks_others(client):
    ok = client.options(
        "/auth/login",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST"},
    )
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:3000"
    bad = client.options(
        "/auth/login",
        headers={"Origin": "http://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in bad.headers


def test_swagger_and_openapi_available(client):
    assert client.get("/docs").status_code == 200
    spec = client.get("/openapi.json").json()
    assert spec["info"]["version"] == "1.0.0" and "/auth/login" in spec["paths"]
