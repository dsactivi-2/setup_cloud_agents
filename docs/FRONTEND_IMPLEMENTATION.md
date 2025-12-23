# Frontend-Implementierung - Technische Anleitung

## Empfohlener Tech-Stack

### Framework & Build
```json
{
  "framework": "Next.js 14+ (App Router)",
  "language": "TypeScript 5+",
  "styling": "Tailwind CSS 3.4+",
  "components": "shadcn/ui",
  "state": "Zustand oder TanStack Query",
  "charts": "Recharts oder Tremor",
  "icons": "Lucide React",
  "forms": "React Hook Form + Zod"
}
```

---

## 1. PROJEKT-SETUP

```bash
# Projekt erstellen
npx create-next-app@latest step2job-dashboard --typescript --tailwind --eslint --app

# Abhängigkeiten installieren
npm install @tanstack/react-query zustand recharts lucide-react
npm install react-hook-form zod @hookform/resolvers
npm install date-fns clsx tailwind-merge class-variance-authority

# shadcn/ui initialisieren
npx shadcn-ui@latest init

# Komponenten hinzufügen
npx shadcn-ui@latest add button card badge table dialog
npx shadcn-ui@latest add dropdown-menu tabs tooltip avatar
npx shadcn-ui@latest add input select textarea checkbox
npx shadcn-ui@latest add alert toast sonner skeleton
```

---

## 2. PROJEKT-STRUKTUR

```
/app
├── (dashboard)
│   ├── layout.tsx           # Dashboard-Layout mit Sidebar
│   ├── page.tsx             # Dashboard-Startseite
│   ├── agents/
│   │   ├── page.tsx         # Agent-Liste
│   │   └── [id]/page.tsx    # Agent-Detail
│   ├── alerts/
│   │   └── page.tsx         # Alert-Center
│   ├── reports/
│   │   └── page.tsx         # Reports
│   └── settings/
│       └── page.tsx         # Einstellungen
├── api/
│   ├── agents/route.ts      # API: Agenten
│   ├── alerts/route.ts      # API: Alerts
│   └── scores/route.ts      # API: Scores
├── globals.css
└── layout.tsx

/components
├── ui/                      # shadcn/ui Komponenten
├── dashboard/
│   ├── stat-card.tsx
│   ├── risk-badge.tsx
│   ├── agent-card.tsx
│   ├── alert-item.tsx
│   └── performance-chart.tsx
├── layout/
│   ├── sidebar.tsx
│   ├── header.tsx
│   └── mobile-nav.tsx
└── shared/
    ├── data-table.tsx
    ├── loading.tsx
    └── empty-state.tsx

/lib
├── api.ts                   # API-Client
├── utils.ts                 # Utility-Funktionen
├── types.ts                 # TypeScript-Typen
└── constants.ts             # Konstanten

/hooks
├── use-agents.ts
├── use-alerts.ts
├── use-websocket.ts
└── use-media-query.ts

/stores
├── alert-store.ts
└── ui-store.ts
```

---

## 3. TYPESCRIPT-TYPEN

```typescript
// lib/types.ts

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Agent {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'paused' | 'review';
  supervisor?: string;
  createdAt: string;
}

export interface ScoreResult {
  agent_id: string;
  contact: string | null;
  timestamp: string | null;
  price_claim: boolean;
  price_keywords_found: string[];
  legal_claim: boolean;
  legal_keywords_found: string[];
  stop_triggered: boolean;
  placeholder_used: boolean;
  risk: number;
  risk_level: RiskLevel;
  violations: string[];
}

export interface AgentStatistics {
  agent_id: string;
  total_interactions: number;
  average_risk: number;
  price_claims: number;
  legal_claims: number;
  stops_triggered: number;
  stop_rate: string;
  critical_incidents: number;
  risk_distribution: Record<RiskLevel, number>;
}

export interface Alert {
  id: string;
  agent_id: string;
  risk_level: RiskLevel;
  violations: string[];
  transcript_snippet?: string;
  timestamp: string;
  read: boolean;
  contact_name?: string;
}

export interface DashboardSummary {
  total: number;
  average_risk: number;
  risk_distribution: Record<RiskLevel, number>;
  critical_count: number;
  critical_incidents: Array<{
    agent_id: string;
    risk_level: RiskLevel;
    violations: string[];
  }>;
  agents_analyzed: number;
}

export interface SupervisorDashboard {
  date: string;
  agents_active: number;
  total_interactions: number;
  stopped_calls_today: number;
  potential_issues: Array<{
    agent_id: string;
    issue: string;
    risk: RiskLevel;
    timestamp?: string;
  }>;
  agents_requiring_review: Array<{
    agent_id: string;
    average_risk: number;
    critical_incidents: number;
    recommendation: string;
  }>;
  action_required: boolean;
  supervisor_recommendation: string;
  summary: {
    average_risk: number;
    total_violations: number;
    stop_compliance_rate: string;
  };
}
```

---

## 4. KOMPONENTEN-IMPLEMENTIERUNG

### 4.1 Risk Badge

```tsx
// components/dashboard/risk-badge.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { CheckCircle, AlertTriangle, AlertOctagon, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/lib/types';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase',
  {
    variants: {
      risk: {
        LOW: 'bg-green-100 text-green-800 border border-green-200',
        MEDIUM: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
        HIGH: 'bg-orange-100 text-orange-800 border border-orange-200',
        CRITICAL: 'bg-red-100 text-red-800 border border-red-200 animate-pulse',
      },
    },
    defaultVariants: {
      risk: 'LOW',
    },
  }
);

const icons: Record<RiskLevel, React.ComponentType<{ className?: string }>> = {
  LOW: CheckCircle,
  MEDIUM: AlertTriangle,
  HIGH: AlertOctagon,
  CRITICAL: XCircle,
};

interface RiskBadgeProps extends VariantProps<typeof badgeVariants> {
  level: RiskLevel;
  showIcon?: boolean;
  className?: string;
}

export function RiskBadge({ level, showIcon = true, className }: RiskBadgeProps) {
  const Icon = icons[level];

  return (
    <span
      className={cn(badgeVariants({ risk: level }), className)}
      role="status"
      aria-label={`Risk level: ${level}`}
    >
      {showIcon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {level}
    </span>
  );
}
```

### 4.2 Stat Card

```tsx
// components/dashboard/stat-card.tsx
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({
  title,
  value,
  trend,
  trendLabel,
  icon,
  className,
}: StatCardProps) {
  const getTrendIcon = () => {
    if (!trend) return <Minus className="h-4 w-4 text-gray-400" />;
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getTrendColor = () => {
    if (!trend) return 'text-gray-500';
    return trend > 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <Card className={cn('', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {icon && <div className="text-gray-400">{icon}</div>}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {trend !== undefined && (
            <div className={cn('flex items-center gap-1 text-sm', getTrendColor())}>
              {getTrendIcon()}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        {trendLabel && (
          <p className="mt-1 text-xs text-gray-500">{trendLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}
```

### 4.3 Agent Card

```tsx
// components/dashboard/agent-card.tsx
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RiskBadge } from './risk-badge';
import { Bot, Pause, Eye } from 'lucide-react';
import type { Agent, AgentStatistics } from '@/lib/types';

interface AgentCardProps {
  agent: Agent;
  stats?: AgentStatistics;
  onViewDetails?: () => void;
  onPause?: () => void;
}

export function AgentCard({ agent, stats, onViewDetails, onPause }: AgentCardProps) {
  const getStatusColor = () => {
    switch (agent.status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-gray-400';
      case 'paused': return 'bg-yellow-500';
      case 'review': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const riskLevel = stats?.average_risk
    ? stats.average_risk <= 0 ? 'LOW'
    : stats.average_risk <= 1 ? 'MEDIUM'
    : stats.average_risk <= 2 ? 'HIGH'
    : 'CRITICAL'
    : 'LOW';

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary-100 text-primary-600">
                <Bot className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-gray-900">{agent.id}</h3>
              <p className="text-sm text-gray-500">{agent.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${getStatusColor()}`} />
            <span className="text-sm text-gray-500 capitalize">{agent.status}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {stats && (
          <>
            <div className="grid grid-cols-3 gap-4 py-4 border-y border-gray-100">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total_interactions}
                </p>
                <p className="text-xs text-gray-500">Calls Today</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {stats.average_risk.toFixed(1)}
                </p>
                <p className="text-xs text-gray-500">Avg. Risk</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.stop_rate}</p>
                <p className="text-xs text-gray-500">Stop Rate</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">Risk Distribution</p>
              <div className="space-y-1">
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((level) => {
                  const count = stats.risk_distribution[level] || 0;
                  const total = Object.values(stats.risk_distribution).reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? (count / total) * 100 : 0;

                  return (
                    <div key={level} className="flex items-center gap-2">
                      <div className="w-20 text-xs text-gray-500">{level}</div>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            level === 'LOW' ? 'bg-green-500' :
                            level === 'MEDIUM' ? 'bg-yellow-500' :
                            level === 'HIGH' ? 'bg-orange-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="w-8 text-xs text-gray-500 text-right">
                        {Math.round(percentage)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="flex justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onViewDetails}>
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onPause}
          disabled={agent.status === 'paused'}
        >
          <Pause className="h-4 w-4 mr-2" />
          {agent.status === 'paused' ? 'Paused' : 'Pause'}
        </Button>
      </CardFooter>
    </Card>
  );
}
```

### 4.4 Alert Item

```tsx
// components/dashboard/alert-item.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RiskBadge } from './risk-badge';
import { Eye, Pause, Check, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import type { Alert } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AlertItemProps {
  alert: Alert;
  onView?: () => void;
  onPauseAgent?: () => void;
  onDismiss?: () => void;
}

export function AlertItem({ alert, onView, onPauseAgent, onDismiss }: AlertItemProps) {
  const borderColor = {
    LOW: 'border-l-green-500',
    MEDIUM: 'border-l-yellow-500',
    HIGH: 'border-l-orange-500',
    CRITICAL: 'border-l-red-500',
  }[alert.risk_level];

  const bgColor = {
    LOW: 'bg-green-50/50',
    MEDIUM: 'bg-yellow-50/50',
    HIGH: 'bg-orange-50/50',
    CRITICAL: 'bg-red-50/50',
  }[alert.risk_level];

  return (
    <Card
      className={cn(
        'border-l-4 transition-all hover:shadow-md',
        borderColor,
        bgColor,
        !alert.read && 'ring-2 ring-primary-200'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <RiskBadge level={alert.risk_level} />
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Clock className="h-3.5 w-3.5" />
            {formatDistanceToNow(new Date(alert.timestamp), {
              addSuffix: true,
              locale: de,
            })}
          </div>
        </div>

        <div className="mb-3">
          <h4 className={cn('font-semibold text-gray-900', !alert.read && 'font-bold')}>
            {alert.agent_id}
            {alert.contact_name && (
              <span className="font-normal text-gray-500"> - {alert.contact_name}</span>
            )}
          </h4>
        </div>

        {alert.violations.length > 0 && (
          <ul className="mb-3 space-y-1">
            {alert.violations.map((violation, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-gray-400">•</span>
                {violation}
              </li>
            ))}
          </ul>
        )}

        {alert.transcript_snippet && (
          <blockquote className="p-3 bg-white/80 rounded border border-gray-200 text-sm text-gray-600 italic mb-3">
            "{alert.transcript_snippet}"
          </blockquote>
        )}

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onView}>
            <Eye className="h-4 w-4 mr-1" />
            View Full
          </Button>
          {alert.risk_level === 'CRITICAL' && (
            <Button size="sm" variant="destructive" onClick={onPauseAgent}>
              <Pause className="h-4 w-4 mr-1" />
              Pause Agent
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            <Check className="h-4 w-4 mr-1" />
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 4.5 Performance Chart

```tsx
// components/dashboard/performance-chart.tsx
'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DataPoint {
  date: string;
  avgRisk: number;
  criticalIncidents: number;
  stopRate: number;
}

interface PerformanceChartProps {
  data: DataPoint[];
  title?: string;
}

export function PerformanceChart({
  data,
  title = 'Performance Trend',
}: PerformanceChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickLine={{ stroke: '#E5E7EB' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="avgRisk"
                name="Avg Risk"
                stroke="#6366F1"
                strokeWidth={2}
                dot={{ fill: '#6366F1', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="criticalIncidents"
                name="Critical Incidents"
                stroke="#EF4444"
                strokeWidth={2}
                dot={{ fill: '#EF4444', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="stopRate"
                name="Stop Rate %"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: '#10B981', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 5. LAYOUT-KOMPONENTEN

### 5.1 Sidebar

```tsx
// components/layout/sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Bot,
  Bell,
  BarChart3,
  Settings,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Agents', href: '/agents', icon: Bot },
  { name: 'Alerts', href: '/alerts', icon: Bell },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
        {!collapsed && (
          <span className="text-xl font-bold text-primary-600">Step2Job</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(collapsed && 'mx-auto')}
        >
          <ChevronLeft
            className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')}
          />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                collapsed && 'justify-center px-2'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

### 5.2 Header

```tsx
// components/layout/header.tsx
'use client';

import { Bell, User, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAlertStore } from '@/stores/alert-store';

export function Header() {
  const unreadCount = useAlertStore((state) => state.unreadCount);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Search agents, alerts..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary-100 text-primary-600">
                  SS
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">Sarah Schmidt</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

---

## 6. HOOKS & STATE

### 6.1 Alert Store (Zustand)

```typescript
// stores/alert-store.ts
import { create } from 'zustand';
import type { Alert } from '@/lib/types';

interface AlertState {
  alerts: Alert[];
  unreadCount: number;
  addAlert: (alert: Alert) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissAlert: (id: string) => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  unreadCount: 0,

  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts],
      unreadCount: state.unreadCount + 1,
    })),

  markAsRead: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id ? { ...a, read: true } : a
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllAsRead: () =>
    set((state) => ({
      alerts: state.alerts.map((a) => ({ ...a, read: true })),
      unreadCount: 0,
    })),

  dismissAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
      unreadCount: state.alerts.find((a) => a.id === id && !a.read)
        ? state.unreadCount - 1
        : state.unreadCount,
    })),
}));
```

### 6.2 useAgents Hook

```typescript
// hooks/use-agents.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Agent, AgentStatistics } from '@/lib/types';

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => api.get<Agent[]>('/api/agents'),
    refetchInterval: 30000, // Refresh every 30s
  });
}

export function useAgentStats(agentId: string) {
  return useQuery({
    queryKey: ['agent-stats', agentId],
    queryFn: () => api.get<AgentStatistics>(`/api/agents/${agentId}/stats`),
    enabled: !!agentId,
  });
}

export function usePauseAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agentId: string) =>
      api.post(`/api/agents/${agentId}/pause`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}
```

### 6.3 useWebSocket Hook

```typescript
// hooks/use-websocket.ts
import { useEffect, useRef, useCallback } from 'react';
import { useAlertStore } from '@/stores/alert-store';
import type { Alert } from '@/lib/types';

interface WebSocketMessage {
  type: 'alert.new' | 'agent.status' | 'score.update';
  payload: any;
}

export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const addAlert = useAlertStore((state) => state.addAlert);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'alert.new':
          addAlert(message.payload as Alert);
          // Show toast notification
          if (message.payload.risk_level === 'CRITICAL') {
            // Trigger toast
          }
          break;
        case 'agent.status':
          // Update agent status in query cache
          break;
        case 'score.update':
          // Update dashboard stats
          break;
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      setTimeout(connect, 3000);
    };

    wsRef.current = ws;
  }, [url, addAlert]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return wsRef.current;
}
```

---

## 7. API-CLIENT

```typescript
// lib/api.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(BASE_URL);
```

---

## 8. TAILWIND KONFIGURATION

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        risk: {
          low: '#10B981',
          medium: '#F59E0B',
          high: '#F97316',
          critical: '#EF4444',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

---

## 9. NÄCHSTE SCHRITTE

1. **Phase 1**: Projekt-Setup und Design-System
2. **Phase 2**: Basis-Komponenten implementieren
3. **Phase 3**: Layout und Navigation
4. **Phase 4**: Dashboard-Seite
5. **Phase 5**: Agent-Management
6. **Phase 6**: Alert-System mit WebSocket
7. **Phase 7**: Reports und Export
8. **Phase 8**: Testing und Optimierung

---

**Dokument-Version:** 1.0
**Erstellt:** 23.12.2025
