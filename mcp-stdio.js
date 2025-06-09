import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
const server = new McpServer({
    name: "mcp-demo",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});
server.tool("toolDemo", "This is a tool demo", async (params) => {
    console.log(params);
    return {
        content: [{
                type: "text",
                text: "Hello, world!",
            }],
    };
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("Server started");
}
main().catch(console.error);
