import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@notionhq/client";

// Tell TypeScript to ignore the missing Node types and just accept 'process' as a global variable
declare const process: any;

// 1. Initialize the Notion Client
const notion = new Client({ auth: process.env.NOTION_API_KEY });

// 2. Create the MCP Server
const server = new Server(
  {
    name: "semantic-architect",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 3. Define the Menu
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_notion",
        description: "Search for pages or databases in the connected Notion workspace",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Keyword to search for" },
          },
          required: ["query"],
        },
      },
      {
        name: "read_notion_page",
        description: "Read full text and Block IDs from a specific Notion page",
        inputSchema: {
          type: "object",
          properties: {
            page_id: { type: "string", description: "The unique Notion page ID" },
          },
          required: ["page_id"],
        },
      },
      {
        name: "append_content_to_page",
        description: "Add new blocks to the bottom of a Notion page",
        inputSchema: {
          type: "object",
          properties: {
            page_id: { type: "string", description: "Target page ID" },
            content: { type: "string", description: "Text or code to add" },
            block_type: { type: "string", enum: ["paragraph", "callout", "mermaid"] }
          },
          required: ["page_id", "content", "block_type"],
        },
      },
      {
        name: "query_notion_database",
        description: "Fetch items from a database, including titles and filter properties like checkboxes",
        inputSchema: {
          type: "object",
          properties: {
            database_id: { type: "string", description: "The Notion database ID" },
          },
          required: ["database_id"],
        },
      },
      {
        name: "link_notion_pages",
        description: "Update a Relation property to hard-link pages together",
        inputSchema: {
          type: "object",
          properties: {
            page_id: { type: "string", description: "Page to update" },
            relation_property_name: { type: "string", description: "Name of the Relation property" },
            target_page_ids: { type: "array", items: { type: "string" } },
          },
          required: ["page_id", "relation_property_name", "target_page_ids"],
        },
      },
      {
        name: "update_notion_block",
        description: "Overwrite an existing block using its Block ID",
        inputSchema: {
          type: "object",
          properties: {
            block_id: { type: "string", description: "The ID of the block to update" },
            content: { type: "string", description: "New content" },
            block_type: { type: "string", enum: ["paragraph", "callout", "mermaid"] }
          },
          required: ["block_id", "content", "block_type"],
        },
      },
    ],
  };
});

// 4. Handle Tool Calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "search_notion") {
      const response = await notion.search({ query: String(args?.query || ""), page_size: 5 });
      const results = response.results.map((item: any) => `- ID: ${item.id} \n  URL: ${item.url}`).join('\n\n');
      return { content: [{ type: "text", text: results || "No results found." }] };
    }

    if (name === "read_notion_page") {
      const response = await notion.blocks.children.list({ block_id: String(args?.page_id) });
      const text = response.results.map((block: any) => {
        const type = block.type;
        const content = block[type]?.rich_text?.map((t: any) => t.plain_text).join("") || "(No text)";
        return `[Block ID: ${block.id} | Type: ${type}]\n${content}`;
      }).join("\n\n---\n\n");
      return { content: [{ type: "text", text: text || "Page is empty." }] };
    }

    if (name === "query_notion_database") {
      const databaseId = String(args?.database_id);
      let response: any;
      const notionAny = notion as any;

      if (notionAny.dataSources) {
        response = await notionAny.dataSources.query({ data_source_id: databaseId });
      } else {
        // Changed from notion.databases.query to notionAny.databases.query to bypass TS error
        response = await notionAny.databases.query({ database_id: databaseId });
      }

      const results = response.results.map((item: any) => {
        let title = "Untitled";
        const titleProp = Object.values(item.properties).find((p: any) => p.type === 'title') as any;
        if (titleProp?.title?.length > 0) title = titleProp.title[0].plain_text;

        // NEW: Find any checkbox properties and report them
        const checkboxes = Object.entries(item.properties)
          .filter(([_, p]: any) => p.type === 'checkbox')
          .map(([name, p]: any) => `${name}: ${p.checkbox ? 'Checked' : 'Unchecked'}`)
          .join(", ");

        return `- ID: ${item.id}\n  Title: ${title}\n  Flags: ${checkboxes || "None"}\n  URL: ${item.url}`;
      }).join('\n\n');

      return { content: [{ type: "text", text: results || "Database empty." }] };
    }

    if (name === "append_content_to_page") {
      const { page_id, content, block_type } = args as any;
      let blockObj: any = { object: 'block' };
      if (block_type === "mermaid") {
        blockObj.type = "code";
        blockObj.code = { language: "mermaid", rich_text: [{ type: "text", text: { content } }] };
      } else if (block_type === "callout") {
        blockObj.type = "callout";
        blockObj.callout = { rich_text: [{ type: "text", text: { content } }], icon: { type: "emoji", emoji: "🤖" } };
      } else {
        blockObj.type = "paragraph";
        blockObj.paragraph = { rich_text: [{ type: "text", text: { content } }] };
      }
      await notion.blocks.children.append({ block_id: page_id, children: [blockObj] });
      return { content: [{ type: "text", text: "Successfully added content." }] };
    }

    if (name === "link_notion_pages") {
      const { page_id, relation_property_name, target_page_ids } = args as any;
      await notion.pages.update({
        page_id,
        properties: { [relation_property_name]: { relation: target_page_ids.map((id: string) => ({ id })) } }
      });
      return { content: [{ type: "text", text: `Linked ${target_page_ids.length} pages.` }] };
    }

    if (name === "update_notion_block") {
      const { block_id, content, block_type } = args as any;
      let payload: any = { block_id };
      if (block_type === "mermaid") {
        payload.code = { language: "mermaid", rich_text: [{ type: "text", text: { content } }] };
      } else if (block_type === "callout") {
        payload.callout = { rich_text: [{ type: "text", text: { content } }] };
      } else {
        payload.paragraph = { rich_text: [{ type: "text", text: { content } }] };
      }
      await payload.block_id && notion.blocks.update(payload);
      return { content: [{ type: "text", text: "Block updated." }] };
    }

    throw new Error("Tool not found");
  } catch (error: any) {
    return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🟢 Semantic Architect MCP server is running!");
}

main().catch((err) => {
  console.error("🔴 Server error:", err);
  process.exit(1);
});