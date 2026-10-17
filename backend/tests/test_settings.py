from app.domain.entities.account import Role
from app.infrastructure.db.models import SettingModel
from tests.test_auth import PHONE, login, register


def seed_settings(client):
    with client.session_factory() as db:
        db.add_all(
            SettingModel(name=n, value=v)
            for n, v in [
                ("DANG_NHAP_SAI_TOI_DA", "5"),
                ("OTP_HIEU_LUC_GIAY", "120"),
                ("PHI_HUY_PHAN_TRAM", "15"),
            ]
        )
        db.commit()


def test_admin_lists_and_updates_settings_with_range_check(client, make_user):
    seed_settings(client)
    _, admin = make_user(Role.ADMIN)
    names = {s["name"] for s in client.get("/admin/settings", headers=admin).json()}
    assert {"DANG_NHAP_SAI_TOI_DA", "PHI_HUY_PHAN_TRAM"} <= names
    ok = client.patch("/admin/settings/PHI_HUY_PHAN_TRAM", headers=admin, json={"value": 20})
    assert ok.status_code == 200 and ok.json()["value"] == "20"
    assert (
        client.patch(
            "/admin/settings/PHI_HUY_PHAN_TRAM", headers=admin, json={"value": 101}
        ).status_code
        == 400
    )
    assert (
        client.patch("/admin/settings/KHONG_CO", headers=admin, json={"value": 1}).status_code
        == 404
    )
    _, cust = make_user(Role.CUSTOMER)
    assert client.get("/admin/settings", headers=cust).status_code == 403


def test_login_lock_threshold_comes_from_settings(client, make_user):
    seed_settings(client)
    _, admin = make_user(Role.ADMIN)
    client.patch("/admin/settings/DANG_NHAP_SAI_TOI_DA", headers=admin, json={"value": 2})
    register(client)
    assert login(client, "saimatkhau1").status_code == 401
    assert login(client, "saimatkhau1").status_code == 401  # lần sai thứ 2 → khóa
    assert login(client).status_code == 423


def test_otp_ttl_comes_from_settings(client, make_user):
    seed_settings(client)
    _, admin = make_user(Role.ADMIN)
    client.patch("/admin/settings/OTP_HIEU_LUC_GIAY", headers=admin, json={"value": 45})
    assert (
        client.post("/auth/register/otp", json={"phone": PHONE}).json()["expires_in_seconds"] == 45
    )


def test_setting_change_is_logged(client, make_user):
    seed_settings(client)
    acc, admin = make_user(Role.ADMIN)
    client.patch("/admin/settings/PHI_HUY_PHAN_TRAM", headers=admin, json={"value": 10})
    acts = client.get(f"/admin/users/{acc.id}", headers=admin).json()["activity"]
    assert acts[0]["action"] == "DOI_THAM_SO" and "15 → 10" in acts[0]["detail"]
