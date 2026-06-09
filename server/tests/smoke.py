"""In-process end-to-end smoke test (no network server needed).

Exercises the real ASGI app against the real Postgres + real camel-hub LLM.
Run:  uv run python -m tests.smoke
"""
import asyncio

import httpx

from app.main import app


async def main() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t/api/v1", timeout=90) as c:
        h = (await c.get("/health")).json()
        print("health:", h)

        admin = (await c.post("/auth/login", json={"role": "admin"})).json()["token"]
        A = {"Authorization": f"Bearer {admin}"}
        me = (await c.get("/me", headers=A)).json()
        print(f"login admin → role={me['acting_role']} screens={me['allowed_screens']}")

        ops = (await c.get("/operations", headers=A)).json()
        print(f"operations: total={ops['total']} pending={ops['pending_count']}")
        srcs = (await c.get("/sources", headers=A)).json()["items"]
        plugins = (await c.get("/plugins", headers=A)).json()["items"]
        print(f"sources={len(srcs)} plugins={len(plugins)}")

        traces = (await c.get("/traces", headers=A)).json()["items"]
        tid = traces[0]["id"]
        au = (await c.get(f"/traces/{tid}/audit", headers=A)).json()
        fl = (await c.get(f"/traces/{tid}/flow", headers=A)).json()
        print(f"trace '{traces[0]['title']}': audit_events={len(au['events'])} "
              f"verify={au['verification']} flow_nodes={len(fl['nodes'])} edges={len(fl['edges'])}")

        # RBAC: customer must NOT see employee/admin-only ops
        cust = (await c.post("/auth/login", json={"role": "customer"})).json()["token"]
        cops = (await c.get("/operations", headers={"Authorization": f"Bearer {cust}"})).json()
        print("customer sees ops:", [o["op_key"] for o in cops["items"]])

        # real P-LLM plan via employee
        emp = (await c.post("/auth/login", json={"role": "employee"})).json()["token"]
        E = {"Authorization": f"Bearer {emp}"}
        sess = (await c.post("/chat/sessions", headers=E)).json()["id"]
        print("chat: P-LLM planning (real LLM call)...")
        res = (await c.post(f"/chat/sessions/{sess}/messages", headers=E,
                            json={"content": "帮我查张伟的退货订单，把 pending 的退款加急"})).json()
        plan = res["plan"]
        print("  intent:", plan["intent"][:70])
        print("  steps:", [(s["step_no"], s["kind"], s["op_key"], s["capability_out"]) for s in plan["steps"]])
        print(f"  writes={plan['writes']} confirm={plan['required_confirm_level']} status={plan['status']}")
        conf = (await c.post(f"/plans/{plan['id']}/confirm", headers=E)).json()
        print(f"  confirm → status={conf['status']} blocked={conf.get('blocked')}")

        au2 = (await c.get(f"/traces/{plan['trace_id']}/audit", headers=E)).json()
        print(f"  new trace audit: events={len(au2['events'])} verify={au2['verification']}")
    print("SMOKE OK")


if __name__ == "__main__":
    asyncio.run(main())
