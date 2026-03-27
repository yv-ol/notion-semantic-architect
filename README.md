
# Semantic Knowledge Architect (Notion MCP)

The **Semantic Knowledge Architect** is a Model Context Protocol (MCP) server that transforms Claude into an active workspace synthesizer. This agent analyzes your Notion pages to find semantic connections and maintains a dynamic visual knowledge graph using Mermaid.js. Because we all deserve Obsidian-style knowledge graphs.

## 🌟 Features
-   **Semantic Mapping:** Automatically identifies relationships between disparate databases (e.g., linking Research to Tasks).
-   **Dynamic Visualization:** Generates and updates Mermaid.js diagrams directly within Notion.
-   **Human-in-the-Loop Controls:** Respects checkbox properties (like "Show in Graph") so you can manually curate your visualization.
-   **Bi-directional Linking:** Programmatically updates Notion "Relation" properties to build a true network of thought.
-   **Block-Level Precision:** Reads and updates specific blocks (paragraphs, callouts, code) using unique Block IDs to avoid page clutter.
    
## 📺 Demo
[Youtube](https://youtu.be/tlwCzlgKWfo)

Sample Notion Pages:
 - [Semantic Graph](https://www.notion.so/Semantic-Graph-33069d17e8088021818bca8c6d8b5152?source=copy_link)
 - [My Projects Database](https://www.notion.so/33069d17e80880609b46db5eb5998dbd?v=33069d17e80880eb84e7000cababd97c&source=copy_link)

## 🛠️ MCP Tools Included
1.  `search_notion`: Find pages or databases by keyword.
2.  `read_notion_page`: Extract full text and Block IDs from any page.
3.  `query_notion_database`: Pull metadata and checkbox flags for all items in a database.
4.  `append_content_to_page`: Add new insights or graphs to the bottom of a page.
5.  `update_notion_block`: Overwrite existing blocks (perfect for updating graphs).
6.  `link_notion_pages`: Update Relation properties between pages.
    

## 🚀 Setup

### 1. Prerequisites
-   Node.js (v18+)
-   A Notion Integration Secret (get one at [developers.notion.com](https://developers.notion.com "null"))

### 2. Installation
```
git clone https://github.com/yv-ol/notion-semantic-architect.git
cd notion-semantic-architect
npm install
npm run build

```
### 3. Configuration

Add the server to your `claude_desktop_config.json`:
```
{
  "mcpServers": {
    "semantic-architect": {
      "command": "node",
      "args": ["/path/to/your/project/build/index.js"],
      "env": {
        "NOTION_API_KEY": "your_ntn_secret_here"
      }
    }
  }
}

```

## 📖 Usage Example

Ask Claude:

> "Architect, query my Inbox database. Update the Mermaid diagram on my 'Semantic Page', but only include items where the 'Show in Graph' checkbox is checked."



