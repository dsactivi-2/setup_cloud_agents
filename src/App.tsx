'use client';

import { useState } from 'react';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import { AgentCard } from './components/AgentCard';
import { CreateAgentDialog } from './components/CreateAgentDialog';
import { StatsCard } from './components/StatsCard';
import { ActivityLog } from './components/ActivityLog';
import { SettingsPanel } from './components/SettingsPanel';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from './components/ui/sheet';
import {
  Plus,
  Search,
  Bot,
  Activity,
  Cloud,
  Zap,
  Menu,
  User,
  LogOut,
  Settings as SettingsIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './components/ui/dialog';
import { Label } from './components/ui/label';
import { Switch } from './components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select';

interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'stopped';
  language: string;
  lastRun: string;
  executionCount: number;
}

interface LogEntry {
  id: string;
  timestamp: string;
  agent: string;
  message: string;
  level: 'info' | 'warning' | 'error' | 'success';
}

export default function App() {
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: '1',
      name: 'Data Processor',
      description: 'Processes and transforms incoming data streams',
      status: 'active',
      language: 'Python',
      lastRun: '2 min ago',
      executionCount: 1247,
    },
    {
      id: '2',
      name: 'API Monitor',
      description: 'Monitors API endpoints for health and performance',
      status: 'active',
      language: 'TypeScript',
      lastRun: '5 min ago',
      executionCount: 892,
    },
    {
      id: '3',
      name: 'Backup Agent',
      description: 'Automated backup and recovery system',
      status: 'paused',
      language: 'Go',
      lastRun: '1 hour ago',
      executionCount: 456,
    },
    {
      id: '4',
      name: 'Log Analyzer',
      description: 'Analyzes logs for anomalies and patterns',
      status: 'stopped',
      language: 'Rust',
      lastRun: '3 hours ago',
      executionCount: 234,
    },
  ]);

  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: '1',
      timestamp: '14:23:45',
      agent: 'Data Processor',
      message: 'Successfully processed batch of 1,000 records',
      level: 'success',
    },
    {
      id: '2',
      timestamp: '14:20:12',
      agent: 'API Monitor',
      message: 'All endpoints responding normally',
      level: 'info',
    },
    {
      id: '3',
      timestamp: '14:18:30',
      agent: 'Data Processor',
      message: 'High memory usage detected (85%)',
      level: 'warning',
    },
    {
      id: '4',
      timestamp: '14:15:22',
      agent: 'Backup Agent',
      message: 'Scheduled backup completed successfully',
      level: 'success',
    },
    {
      id: '5',
      timestamp: '14:12:01',
      agent: 'Log Analyzer',
      message: 'Connection timeout to database',
      level: 'error',
    },
    {
      id: '6',
      timestamp: '14:10:45',
      agent: 'API Monitor',
      message: 'Started health check cycle',
      level: 'info',
    },
  ]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [configureAgentId, setConfigureAgentId] = useState<string | null>(null);
  const [agentSettings, setAgentSettings] = useState({
    autoRestart: true,
    logLevel: 'info',
    maxRetries: '3',
    timeout: '30',
  });

  const handleStartAgent = (id: string) => {
    setAgents(
      agents.map((agent) =>
        agent.id === id ? { ...agent, status: 'active' as const } : agent
      )
    );
    const agent = agents.find((a) => a.id === id);
    toast.success(`${agent?.name} has been started`);
    
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      agent: agent?.name || '',
      message: 'Agent started successfully',
      level: 'success',
    };
    setLogs([newLog, ...logs]);
  };

  const handlePauseAgent = (id: string) => {
    setAgents(
      agents.map((agent) =>
        agent.id === id ? { ...agent, status: 'paused' as const } : agent
      )
    );
    const agent = agents.find((a) => a.id === id);
    toast.info(`${agent?.name} has been paused`);
    
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      agent: agent?.name || '',
      message: 'Agent paused by user',
      level: 'info',
    };
    setLogs([newLog, ...logs]);
  };

  const handleConfigureAgent = (id: string) => {
    setConfigureAgentId(id);
  };

  const configuredAgent = agents.find((a) => a.id === configureAgentId);

  const handleSaveAgentSettings = () => {
    toast.success(`Settings saved for ${configuredAgent?.name}`);
    setConfigureAgentId(null);
  };

  const handleDeleteAgent = (id: string) => {
    const agent = agents.find((a) => a.id === id);
    setAgents(agents.filter((a) => a.id !== id));
    toast.success(`${agent?.name} has been deleted`);
    
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      agent: agent?.name || '',
      message: 'Agent deleted by user',
      level: 'warning',
    };
    setLogs([newLog, ...logs]);
  };

  const handleCreateAgent = (newAgent: {
    name: string;
    description: string;
    language: string;
    code: string;
  }) => {
    const agent: Agent = {
      id: Date.now().toString(),
      name: newAgent.name,
      description: newAgent.description,
      status: 'stopped',
      language: newAgent.language,
      lastRun: 'Never',
      executionCount: 0,
    };
    setAgents([...agents, agent]);
    toast.success(`Agent "${newAgent.name}" created successfully`);
    
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      agent: newAgent.name,
      message: 'New agent created and deployed',
      level: 'success',
    };
    setLogs([newLog, ...logs]);
  };

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeAgents = agents.filter((a) => a.status === 'active').length;
  const totalExecutions = agents.reduce((acc, agent) => acc + agent.executionCount, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <nav className="flex flex-col gap-4 mt-8">
                    <Button
                      variant={currentTab === 'dashboard' ? 'default' : 'ghost'}
                      className="justify-start"
                      onClick={() => setCurrentTab('dashboard')}
                    >
                      <Activity className="w-4 h-4 mr-2" />
                      Dashboard
                    </Button>
                    <Button
                      variant={currentTab === 'agents' ? 'default' : 'ghost'}
                      className="justify-start"
                      onClick={() => setCurrentTab('agents')}
                    >
                      <Bot className="w-4 h-4 mr-2" />
                      Agents
                    </Button>
                    <Button
                      variant={currentTab === 'settings' ? 'default' : 'ghost'}
                      className="justify-start"
                      onClick={() => setCurrentTab('settings')}
                    >
                      <SettingsIcon className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  </nav>
                </SheetContent>
              </Sheet>
              
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Cloud className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Code Cloud Agents</h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    AI-Powered Cloud Automation
                  </p>
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrentTab('settings')}>
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="hidden md:inline-flex mb-8">
            <TabsTrigger value="dashboard">
              <Activity className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="agents">
              <Bot className="w-4 h-4 mr-2" />
              Agents
            </TabsTrigger>
            <TabsTrigger value="settings">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-8">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 p-8 md:p-12 text-white">
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl mb-2">Welcome Back!</h2>
                <p className="text-lg text-blue-100 mb-6">
                  Manage your cloud agents and monitor their performance
                </p>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create New Agent
                </Button>
              </div>
              <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1595623654300-b27329804025?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2RpbmclMjB0ZWNobm9sb2d5fGVufDF8fHx8MTc2NjU0MTQ4OXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  alt="Technology background"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Active Agents"
                value={activeAgents}
                description="Currently running"
                trend={{ value: 12, direction: 'up' }}
                icon={<Bot className="w-4 h-4 text-muted-foreground" />}
              />
              <StatsCard
                title="Total Agents"
                value={agents.length}
                description="In your workspace"
                icon={<Cloud className="w-4 h-4 text-muted-foreground" />}
              />
              <StatsCard
                title="Executions Today"
                value={totalExecutions}
                description="Across all agents"
                trend={{ value: 8, direction: 'up' }}
                icon={<Zap className="w-4 h-4 text-muted-foreground" />}
              />
              <StatsCard
                title="Success Rate"
                value="98.5%"
                description="Last 24 hours"
                trend={{ value: 2, direction: 'up' }}
                icon={<Activity className="w-4 h-4 text-muted-foreground" />}
              />
            </div>

            {/* Activity Log */}
            <ActivityLog logs={logs} />
          </TabsContent>

          <TabsContent value="agents" className="space-y-6">
            {/* Search and Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Agent
              </Button>
            </div>

            {/* Agents Grid */}
            {filteredAgents.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredAgents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    {...agent}
                    onStart={handleStartAgent}
                    onPause={handlePauseAgent}
                    onConfigure={handleConfigureAgent}
                    onDelete={handleDeleteAgent}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg mb-2">No agents found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? 'Try adjusting your search'
                    : 'Create your first agent to get started'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Agent
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings">
            <SettingsPanel />
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Agent Dialog */}
      <CreateAgentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={handleCreateAgent}
      />

      {/* Agent Settings Dialog */}
      <Dialog open={!!configureAgentId} onOpenChange={(open) => !open && setConfigureAgentId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure {configuredAgent?.name}</DialogTitle>
            <DialogDescription>
              Adjust settings for this agent
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto Restart</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically restart on failure
                </p>
              </div>
              <Switch
                checked={agentSettings.autoRestart}
                onCheckedChange={(checked) =>
                  setAgentSettings({ ...agentSettings, autoRestart: checked })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Log Level</Label>
              <Select
                value={agentSettings.logLevel}
                onValueChange={(value) =>
                  setAgentSettings({ ...agentSettings, logLevel: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Max Retries</Label>
              <Input
                type="number"
                value={agentSettings.maxRetries}
                onChange={(e) =>
                  setAgentSettings({ ...agentSettings, maxRetries: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Timeout (seconds)</Label>
              <Input
                type="number"
                value={agentSettings.timeout}
                onChange={(e) =>
                  setAgentSettings({ ...agentSettings, timeout: e.target.value })
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfigureAgentId(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAgentSettings}>Save Settings</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
