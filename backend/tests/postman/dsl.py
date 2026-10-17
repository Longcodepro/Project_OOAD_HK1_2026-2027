"""Khung nhỏ để viết collection Postman bằng Python (dễ đọc, dễ thêm ca test).

Cú pháp biến trong chuỗi: @{ten_bien} → {{ten_bien}} (để khỏi lẫn với dấu ngoặc của JSON).
"""

import re


def V(s: str | None) -> str | None:
    return re.sub(r"@\{(\w+)\}", r"{{\1}}", s) if s else s


def st(code: int) -> str:
    return f"pm.test('Mã HTTP là {code}', () => pm.response.to.have.status({code}));"


def setv(name: str, expr: str) -> str:
    return f"pm.collectionVariables.set('{name}', {expr});"


def js(title: str, cond: str) -> str:
    """Một khẳng định: cond là biểu thức JS trả về true/false; có sẵn `j` = JSON phản hồi (nếu có)."""
    return f"pm.test({title!r}, () => pm.expect({cond}).to.be.true);"


PRE_J = "const j = (() => { try { return pm.response.json(); } catch (e) { return {}; } })();"


class Req:
    def __init__(
        self,
        name,
        method,
        path,
        *,
        tok=None,
        body=None,
        tests=(),
        pre="",
        desc="",
        raw_query=None,
        expect=None,
    ):
        self.name, self.method, self.path = name, method, path
        self.tok, self.body, self.tests, self.pre, self.desc = tok, body, list(tests), pre, desc
        self.query = raw_query
        self.expect = expect

    def build(self) -> dict:
        header = [{"key": "Content-Type", "value": "application/json"}]
        if self.tok:
            header.append({"key": "Authorization", "value": "Bearer {{" + self.tok + "}}"})
        url_path = V(self.path)
        item = {
            "name": self.name,
            "request": {
                "method": self.method,
                "header": header,
                "url": {
                    "raw": "{{base_url}}" + url_path,
                    "host": ["{{base_url}}"],
                    "path": [p for p in url_path.lstrip("/").split("?")[0].split("/")],
                },
                "description": self.desc,
            },
            "event": [],
        }
        if "?" in url_path:
            q = url_path.split("?", 1)[1]
            item["request"]["url"]["query"] = [
                dict(zip(("key", "value"), kv.split("=", 1))) for kv in q.split("&")
            ]
        if self.body is not None:
            item["request"]["body"] = {
                "mode": "raw",
                "raw": V(self.body),
                "options": {"raw": {"language": "json"}},
            }
        if self.pre:
            item["event"].append(
                {
                    "listen": "prerequest",
                    "script": {"type": "text/javascript", "exec": self.pre.strip().split("\n")},
                }
            )
        tests = list(self.tests)
        if self.expect is not None:
            tests.insert(0, st(self.expect))
        if tests:
            script = PRE_J + "\n" + "\n".join(tests)
            item["event"].append(
                {
                    "listen": "test",
                    "script": {"type": "text/javascript", "exec": script.split("\n")},
                }
            )
        return item


class Folder:
    def __init__(self, name, desc=""):
        self.name, self.desc, self.items = name, desc, []

    def add(self, *reqs):
        self.items.extend(reqs)
        return self

    def build(self) -> dict:
        return {
            "name": self.name,
            "description": self.desc,
            "item": [r.build() for r in self.items],
        }


def collection(name, desc, folders, variables) -> dict:
    return {
        "info": {
            "name": name,
            "description": desc,
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "item": [f.build() for f in folders],
        "variable": [{"key": k, "value": v} for k, v in variables.items()],
    }
