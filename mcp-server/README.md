# UnitTCMS MCP Server

Model Context Protocol (MCP) server for **UnitTCMS** (Test Case Management System). Enables AI agents (such as Claude Desktop, Cursor, Antigravity, and VS Code Copilot) to seamlessly manage and automate test suites, test cases, and test runs.

---

## Features

### 🛠️ Tools (16 Tools)
* **Projects**:
  * `unittcms_list_projects`: List all test projects.
  * `unittcms_get_project`: Get details of a project by ID.
  * `unittcms_create_project`: Create a new project.
* **Folders (Suites/Modules)**:
  * `unittcms_list_folders`: List folders/modules in a project.
  * `unittcms_create_folder`: Create a new folder/sub-folder.
* **Test Cases**:
  * `unittcms_list_cases`: List test cases with filters (search, priority, type).
  * `unittcms_get_case`: Retrieve full test case specifications (steps, preconditions, expected results).
  * `unittcms_create_case`: Create a test case.
  * `unittcms_bulk_create_cases`: Create multiple test cases at once (ideal for AI requirements breakdown).
  * `unittcms_update_case`: Update an existing test case.
  * `unittcms_delete_cases`: Delete test cases in bulk.
* **Test Runs & Execution**:
  * `unittcms_list_runs`: List test runs in a project.
  * `unittcms_get_run`: Get test run summary and execution progress.
  * `unittcms_create_run`: Create a new test execution cycle with selected test cases.
  * `unittcms_update_run_case_result`: Update execution result (`passed`, `failed`, `skipped`, `retest`) and attach failure comments.
* **Comments & Audits**:
  * `unittcms_add_comment`: Attach execution notes or bug details to run cases or test cases.

### 📚 Resources
* `unittcms://projects`: Live JSON array of all projects.
* `unittcms://projects/{projectId}`: Details and folder tree of a specific project.
* `unittcms://runs/{runId}`: Execution report and status counts for a test run.

### 💡 Prompts
* `generate_test_cases`: Standardized prompt template to convert PRDs/User Stories into UnitTCMS test suites.
* `analyze_test_run`: Prompt to inspect failed tests and generate quality release readiness analysis.

---

## Configuration

### Cursor (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "unittcms": {
      "command": "node",
      "args": ["C:/Users/zoelt/my_project/unittcms/mcp-server/dist/index.js"],
      "env": {
        "UNITTCMS_BASE_URL": "http://localhost:8001",
        "UNITTCMS_EMAIL": "admin@example.com",
        "UNITTCMS_PASSWORD": "password"
      }
    }
  }
}
```

### Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "unittcms": {
      "command": "node",
      "args": ["C:/Users/zoelt/my_project/unittcms/mcp-server/dist/index.js"],
      "env": {
        "UNITTCMS_BASE_URL": "http://localhost:8001",
        "UNITTCMS_EMAIL": "admin@example.com",
        "UNITTCMS_PASSWORD": "password"
      }
    }
  }
}
```

---

## Testing & Verification

Run the comprehensive 26-test integration suite:

```bash
npm run mcp:test
```
