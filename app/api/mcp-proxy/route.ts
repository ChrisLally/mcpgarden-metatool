import { NextResponse } from 'next/server';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { mcpServersTable, McpServerStatus, McpServerType } from '@/db/schema';
import { authenticateApiKey } from '../auth';

// Helper function to transform localhost URLs for Docker
function transformUrlForDocker(url: string): string {
  if (
    (process.env.USE_DOCKER_HOST ?? 'true') === 'true' &&
    url.includes('localhost')
  ) {
    return url.replace('localhost', 'host.docker.internal');
  }
  return url;
}

export async function GET(request: Request) {
  try {
    const auth = await authenticateApiKey(request);
    if (auth.error) return auth.error;

    // Get all active MCP servers for the current profile
    const activeMcpServers = await db
      .select()
      .from(mcpServersTable)
      .where(
        and(
          eq(mcpServersTable.status, McpServerStatus.ACTIVE),
          eq(mcpServersTable.profile_uuid, auth.activeProfile.uuid)
        )
      );

    // Aggregate tools from all active servers
    const allTools: any[] = [];

    for (const server of activeMcpServers) {
      try {
        if (server.type === McpServerType.SSE && server.url) {
          // Handle SSE type servers
          const url = transformUrlForDocker(server.url);
          const transport = new SSEClientTransport(new URL(url));
          const client = new Client(
            {
              name: 'metamcp-proxy-client',
              version: '1.0.0',
            },
            {
              capabilities: {
                tools: {},
              },
            }
          );
          await client.connect(transport);
          const { tools } = await client.listTools();
          if (Array.isArray(tools)) {
            allTools.push(...tools);
          }
        } else if (server.type === McpServerType.STDIO && server.command) {
          // Handle STDIO type servers
          // Note: STDIO servers are handled by the MCP client directly
          // We don't need to do anything here as the client will handle the connection
          continue;
        }
      } catch (error) {
        console.error(`Error fetching tools from server ${server.name}:`, error);
        // Continue with other servers even if one fails
        continue;
      }
    }

    return NextResponse.json(allTools);
  } catch (error) {
    console.error('Error in MCP proxy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tools from MCP servers' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateApiKey(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { toolName, parameters, serverUuid } = body;

    // Find the specific server if serverUuid is provided
    const server = serverUuid
      ? await db.query.mcpServersTable.findFirst({
          where: and(
            eq(mcpServersTable.uuid, serverUuid),
            eq(mcpServersTable.profile_uuid, auth.activeProfile.uuid),
            eq(mcpServersTable.status, McpServerStatus.ACTIVE)
          ),
        })
      : null;

    if (serverUuid && !server) {
      return NextResponse.json(
        { error: 'MCP server not found' },
        { status: 404 }
      );
    }

    // Execute the tool on the appropriate server
    if (server?.type === McpServerType.SSE && server.url) {
      const url = transformUrlForDocker(server.url);
      const transport = new SSEClientTransport(new URL(url));
      const client = new Client(
        {
          name: 'metamcp-proxy-client',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );
      await client.connect(transport);
      const result = await client.callTool(toolName, parameters);
      return NextResponse.json(result);
    } else if (server?.type === McpServerType.STDIO) {
      // For STDIO servers, the MCP client will handle the execution
      // We just need to return a success response
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid server type or configuration' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error executing tool:', error);
    return NextResponse.json(
      { error: 'Failed to execute tool' },
      { status: 500 }
    );
  }
} 