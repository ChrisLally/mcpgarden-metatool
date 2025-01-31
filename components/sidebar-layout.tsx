'use client';

import { Key, Server, Settings, Wrench } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar';

import { ProfileSwitcher } from './profile-switcher';
import { ProjectSwitcher } from './project-switcher';

export default function SidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className='flex flex-1 h-screen'>
        {/* Main Sidebar */}
        <Sidebar collapsible='none' className='w-64 flex-shrink-0 border-r'>
          <SidebarHeader className='flex flex-col justify-center items-center px-2 py-4'>
            <div className='flex items-center gap-4 mb-2'>
              <Image
                src='/favicon.ico'
                alt='MetaTool Logo'
                width={256}
                height={256}
                className='h-12 w-12'
              />
              <h2 className='text-2xl font-semibold'>MetaTool</h2>
            </div>
            <ProjectSwitcher />
            <ProfileSwitcher />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href='/mcp-servers'>
                        <Server className='mr-2 h-4 w-4' />
                        <span>MCP Servers</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href='/custom-mcp-servers'>
                        <Wrench className='mr-2 h-4 w-4' />
                        <span>Custom MCP Servers</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href='/api-keys'>
                        <Key className='mr-2 h-4 w-4' />
                        <span>API Keys</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href='/settings'>
                        <Settings className='mr-2 h-4 w-4' />
                        <span>Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        {/* Secondary Sidebar */}
        <Sidebar collapsible='none' className='w-64 flex-shrink-0 border-r'>
          <SidebarHeader className='h-16 flex items-center px-4'>
            <h2 className='text-lg font-semibold'>Details</h2>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Server Info</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href='/mcp-servers'>
                        <span>Overview</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href='/mcp-servers/status'>
                        <span>Status</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href='/mcp-servers/logs'>
                        <span>Logs</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        {/* Main Content Area */}
        <SidebarInset className='flex-grow'>
          <main className='h-full overflow-auto'>{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
