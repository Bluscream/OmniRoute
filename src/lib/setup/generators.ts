/**
 * Client Setup Generators for OmniRoute Consumers
 */

export interface SetupOptions {
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
  includeMcpHub?: boolean;
}

export function generateZooVscodiumConfig(options: SetupOptions) {
  const settingsPatch = {
    "zed.ai.baseUrl": `${options.baseUrl}/v1`,
    "zed.ai.apiKey": options.apiKey,
    "zed.ai.defaultModel": options.defaultModel || "claude-3-7-sonnet",
  };

  const jsonSnippet = JSON.stringify(settingsPatch, null, 2);

  const linuxBashOneLiner = `
# Apply OmniRoute configuration directly to VSCodium (Linux)
SETTINGS_FILE="$HOME/.config/VSCodium/User/settings.json"
mkdir -p "$(dirname "$SETTINGS_FILE")"
if [ ! -f "$SETTINGS_FILE" ]; then echo "{}" > "$SETTINGS_FILE"; fi
TMP_FILE=$(mktemp)
jq '. + {
  "zed.ai.baseUrl": "${options.baseUrl}/v1",
  "zed.ai.apiKey": "${options.apiKey}",
  "zed.ai.defaultModel": "${options.defaultModel || "claude-3-7-sonnet"}"
}' "$SETTINGS_FILE" > "$TMP_FILE" && mv "$TMP_FILE" "$SETTINGS_FILE"
echo "✅ VSCodium Zoo extension settings configured for OmniRoute!"
`.trim();

  const winPowerShellOneLiner = `
$settingsFile = "$env:APPDATA\\VSCodium\\User\\settings.json"
if (!(Test-Path (Split-Path $settingsFile))) { New-Item -ItemType Directory -Path (Split-Path $settingsFile) -Force }
if (!(Test-Path $settingsFile)) { "{}" | Out-File -FilePath $settingsFile -Encoding utf8 }
$json = Get-Content $settingsFile -Raw | ConvertFrom-Json
$json | Add-Member -Name "zed.ai.baseUrl" -Value "${options.baseUrl}/v1" -MemberType NoteProperty -Force
$json | Add-Member -Name "zed.ai.apiKey" -Value "${options.apiKey}" -MemberType NoteProperty -Force
$json | Add-Member -Name "zed.ai.defaultModel" -Value "${options.defaultModel || "claude-3-7-sonnet"}" -MemberType NoteProperty -Force
$json | ConvertTo-Json -Depth 10 | Out-File -FilePath $settingsFile -Encoding utf8
Write-Host "✅ VSCodium Zoo extension configured for OmniRoute!" -ForegroundColor Green
`.trim();

  return {
    name: "Zoo Extension (VSCodium)",
    category: "IDE Extension",
    jsonSnippet,
    linuxBashOneLiner,
    winPowerShellOneLiner,
  };
}

export function generateClaudeCodeConfig(options: SetupOptions) {
  const envSnippet = `
export ANTHROPIC_BASE_URL="${options.baseUrl}/v1"
export ANTHROPIC_API_KEY="${options.apiKey}"
`.trim();

  const linuxBashOneLiner = `
claude config set --global baseUrl "${options.baseUrl}/v1"
claude config set --global apiKey "${options.apiKey}"
${options.includeMcpHub ? `claude mcp add omniroute-hub "${options.baseUrl}/api/mcp/hub/sse" --header "Authorization: Bearer ${options.apiKey}"` : ""}
echo "✅ Claude Code CLI configured for OmniRoute!"
`.trim();

  return {
    name: "Claude Code CLI",
    category: "CLI Tool",
    envSnippet,
    linuxBashOneLiner,
  };
}

export function generateAntigravityConfig(options: SetupOptions) {
  const mcpConfigSnippet = {
    mcpServers: {
      "omniroute-hub": {
        url: `${options.baseUrl}/api/mcp/hub/sse`,
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
        },
      },
    },
  };

  const linuxBashOneLiner = `
# Add OmniRoute Hub to global Antigravity / Gemini config
CONFIG_FILE="$HOME/.gemini/config/mcp_config.json"
mkdir -p "$(dirname "$CONFIG_FILE")"
if [ ! -f "$CONFIG_FILE" ]; then echo '{"mcpServers":{}}' > "$CONFIG_FILE"; fi
TMP_FILE=$(mktemp)
jq --arg url "${options.baseUrl}/api/mcp/hub/sse" --arg auth "Bearer ${options.apiKey}" \
  '.mcpServers["omniroute-hub"] = {"url": $url, "headers": {"Authorization": $auth}}' \
  "$CONFIG_FILE" > "$TMP_FILE" && mv "$TMP_FILE" "$CONFIG_FILE"
echo "✅ Antigravity IDE configured with OmniRoute MCP Hub!"
`.trim();

  return {
    name: "Antigravity IDE",
    category: "IDE / Assistant",
    jsonSnippet: JSON.stringify(mcpConfigSnippet, null, 2),
    linuxBashOneLiner,
  };
}

export function generateCursorConfig(options: SetupOptions) {
  const jsonSnippet = JSON.stringify(
    {
      "cursor.openAI.baseUrl": `${options.baseUrl}/v1`,
      "cursor.openAI.apiKey": options.apiKey,
      "cursor.openAI.model": options.defaultModel || "claude-3-7-sonnet",
    },
    null,
    2
  );

  return {
    name: "Cursor",
    category: "AI Editor",
    jsonSnippet,
  };
}

export function generateClineConfig(options: SetupOptions) {
  const jsonSnippet = JSON.stringify(
    {
      "cline.apiProvider": "openai-compatible",
      "cline.openAiBaseUrl": `${options.baseUrl}/v1`,
      "cline.openAiApiKey": options.apiKey,
      "cline.openAiModelId": options.defaultModel || "claude-3-7-sonnet",
    },
    null,
    2
  );

  return {
    name: "Cline / RooCode",
    category: "VS Code Extension",
    jsonSnippet,
  };
}
