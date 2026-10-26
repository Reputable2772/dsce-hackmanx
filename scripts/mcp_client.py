#!/usr/bin/env python3
"""
Lightweight CLI / Python client for Agent Bridge MCP server over Streamable HTTP (/mcp).
Supports agent naming 'C' (backend) and peer 'P' (frontend) with backward compatibility
for legacy names 'antigravity' and 'antigravity-1'.
"""
import sys
import os
import json
import requests

SERVER_URL = os.environ.get("AGENT_BRIDGE_URL", "http://localhost:3721/mcp")

# Primary and legacy callsign constants
CALLSIGN_SELF = "C"
CALLSIGN_SELF_LEGACY = "antigravity"
CALLSIGN_PEER = "P"
CALLSIGN_PEER_LEGACY = "antigravity-1"

ALIAS_MAP = {
    CALLSIGN_SELF: [CALLSIGN_SELF, CALLSIGN_SELF_LEGACY],
    CALLSIGN_SELF_LEGACY: [CALLSIGN_SELF, CALLSIGN_SELF_LEGACY],
    CALLSIGN_PEER: [CALLSIGN_PEER, CALLSIGN_PEER_LEGACY],
    CALLSIGN_PEER_LEGACY: [CALLSIGN_PEER, CALLSIGN_PEER_LEGACY],
}


class MCPClient:
    def __init__(self, agent_name=CALLSIGN_SELF, session_label="C (antigravity)"):
        self.agent_name = agent_name
        self.session_label = session_label
        self.session_file = f"/tmp/agent_bridge_session_{self.agent_name}.json"
        self.session_id = None
        self._load_or_init()

    def _load_or_init(self):
        if os.path.exists(self.session_file):
            try:
                with open(self.session_file) as f:
                    data = json.load(f)
                    self.session_id = data.get("session_id")
            except Exception:
                pass
        if not self.session_id:
            self._init_session()

    def _init_session(self):
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        }
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": self.agent_name, "version": "1.0"},
            },
        }
        res = requests.post(SERVER_URL, json=payload, headers=headers)
        self.session_id = res.headers.get("mcp-session-id")
        if not self.session_id:
            raise RuntimeError(f"Failed to obtain mcp-session-id: {res.status_code} {res.text}")
        with open(self.session_file, "w") as f:
            json.dump({"session_id": self.session_id}, f)
        # Identify
        self._raw_call_tool("identify", {"agent_name": self.agent_name, "session_label": self.session_label})

    def _raw_call_tool(self, tool_name, arguments=None):
        if arguments is None:
            arguments = {}
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            "mcp-session-id": self.session_id,
        }
        payload = {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {"name": tool_name, "arguments": arguments},
        }
        res = requests.post(SERVER_URL, json=payload, headers=headers)
        if res.status_code != 200:
            # Maybe session expired, re-init
            self._init_session()
            headers["mcp-session-id"] = self.session_id
            res = requests.post(SERVER_URL, json=payload, headers=headers)

        lines = res.text.strip().split("\n")
        data_line = next((l for l in lines if l.startswith("data:")), None)
        if not data_line:
            return {"raw": res.text}
        resp_json = json.loads(data_line[5:].strip())
        content = resp_json.get("result", {}).get("content", [])
        if content and content[0].get("type") == "text":
            try:
                return json.loads(content[0]["text"])
            except Exception:
                return content[0]["text"]
        return resp_json.get("result", resp_json)

    def call_tool(self, tool_name, arguments=None):
        if arguments is None:
            arguments = {}

        # Handle send_message with dual delivery to target and legacy alias for backward compatibility
        if tool_name == "send_message":
            target = arguments.get("to", "")
            targets = ALIAS_MAP.get(target, [target])
            results = []
            for t in targets:
                args_copy = dict(arguments)
                args_copy["to"] = t
                res = self._raw_call_tool(tool_name, args_copy)
                results.append(res)
            return results[0] if len(results) == 1 else {"status": "sent", "targets": targets, "results": results}

        # Handle read_messages with legacy alias aggregation
        if tool_name == "read_messages":
            primary_res = self._raw_call_tool(tool_name, arguments)
            all_messages = []
            seen_ids = set()
            if isinstance(primary_res, dict) and "messages" in primary_res:
                for m in primary_res["messages"]:
                    mid = m.get("id")
                    if mid not in seen_ids:
                        seen_ids.add(mid)
                        all_messages.append(m)

            # If this is the primary agent C, also check legacy antigravity mailbox
            if self.agent_name == CALLSIGN_SELF:
                try:
                    legacy_client = MCPClient(agent_name=CALLSIGN_SELF_LEGACY, session_label=f"{CALLSIGN_SELF_LEGACY}-legacy")
                    legacy_res = legacy_client._raw_call_tool(tool_name, arguments)
                    if isinstance(legacy_res, dict) and "messages" in legacy_res:
                        for m in legacy_res["messages"]:
                            mid = m.get("id")
                            if mid not in seen_ids:
                                seen_ids.add(mid)
                                all_messages.append(m)
                except Exception:
                    pass

            if isinstance(primary_res, dict):
                primary_res["messages"] = all_messages
                primary_res["total"] = len(all_messages)
                return primary_res
            return primary_res

        return self._raw_call_tool(tool_name, arguments)


def main():
    if len(sys.argv) < 2:
        print("Usage: mcp_client.py <tool_name> [args_json_or_key_val...]")
        sys.exit(1)

    tool = sys.argv[1]
    client = MCPClient()

    args = {}
    if len(sys.argv) == 3 and sys.argv[2].startswith("{"):
        args = json.loads(sys.argv[2])
    elif len(sys.argv) > 2:
        for item in sys.argv[2:]:
            if "=" in item:
                k, v = item.split("=", 1)
                args[k] = v

    result = client.call_tool(tool, args)
    print(json.dumps(result, indent=2) if isinstance(result, (dict, list)) else result)


if __name__ == "__main__":
    main()

