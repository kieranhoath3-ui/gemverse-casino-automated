'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Crown, Users, Settings, Database, Gem, Shield, MessageSquare, 
  Download, Activity, TrendingUp, DollarSign, Terminal, 
  Send, CloudRain, Eye, Lock, Key, UserCheck, UserX,
  RefreshCw, Save, AlertTriangle, CheckCircle, Clock,
  BarChart3, PieChart, LineChart, Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/hooks/use-toast'
import { formatGems } from '@/lib/utils'

interface User {
  user_id: number
  username: string
  role: string
  gems: string
  crystals: string
  level: number
  xp: string
  created_at: string
  last_active: string
  is_banned: boolean
  mute_until: string | null
  referred_by_id: number | null
}

interface GameSettings {
  daily_faucet: number
  level_up_reward: number
  ad_doubler: boolean
  tournament_house_cut: number
  global_tax: number
  gem_to_xp: number
  mines_max_bet: number
  plinko_max_bet: number
  crash_max_bet: number
  mines_enabled: boolean
  plinko_enabled: boolean
  crash_enabled: boolean
}

interface SystemStats {
  total_users: number
  active_users_24h: number
  total_gems: string
  total_bets: number
  owner: {
    user_id: number
    username: string
    last_active: string
  } | null
}

export default function OwnerDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [settings, setSettings] = useState<GameSettings>({
    daily_faucet: 100,
    level_up_reward: 50,
    ad_doubler: true,
    tournament_house_cut: 1,
    global_tax: 2,
    gem_to_xp: 1,
    mines_max_bet: 100000,
    plinko_max_bet: 100000,
    crash_max_bet: 100000,
    mines_enabled: true,
    plinko_enabled: true,
    crash_enabled: true
  })
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [sqlQuery, setSqlQuery] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'username' | 'gems' | 'level' | 'created_at'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    if (user?.role !== 'OWNER') {
      router.push('/')
      return
    }
    
    loadSystemStats()
    loadUsers()
    loadSettings()
  }, [user])

  const loadSystemStats = async () => {
    try {
      const response = await fetch('/api/owner/system-stats')
      if (response.ok) {
        const data = await response.json()
        setSystemStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to load system stats:', error)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/owner/users?sortBy=' + sortBy + '&sortOrder=' + sortOrder)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/owner/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const updateUserRole = async (userId: number, newRole: string) => {
    const targetUser = users.find(u => u.user_id === userId)
    if (!targetUser) return

    if (targetUser.role === 'OWNER') {
      toast({ title: 'Cannot modify owner account', variant: 'destructive' })
      return
    }

    try {
      const response = await fetch(`/api/owner/user/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })

      if (response.ok) {
        toast({ title: `User role updated to ${newRole}` })
        loadUsers()
      }
    } catch (error) {
      toast({ title: 'Failed to update user role', variant: 'destructive' })
    }
  }

  const banUser = async (userId: number, ban: boolean) => {
    const targetUser = users.find(u => u.user_id === userId)
    if (!targetUser || targetUser.role === 'OWNER') return

    try {
      const response = await fetch(`/api/owner/user/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_banned: ban })
      })

      if (response.ok) {
        toast({ title: ban ? 'User banned' : 'User unbanned' })
        loadUsers()
      }
    } catch (error) {
      toast({ title: 'Failed to ban/unban user', variant: 'destructive' })
    }
  }

  const updateSettings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/owner/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        toast({ title: 'Settings updated successfully' })
      }
    } catch (error) {
      toast({ title: 'Failed to update settings', variant: 'destructive' })
    }
    setIsLoading(false)
  }

  const executeSQL = async () => {
    if (!sqlQuery.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/owner/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sqlQuery })
      })

      const data = await response.json()
      
      if (response.ok) {
        toast({ 
          title: 'Query executed successfully', 
          description: `${data.results?.length || 0} rows affected` 
        })
      } else {
        toast({ title: 'Query failed', description: data.error, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Failed to execute query', variant: 'destructive' })
    }
    setIsLoading(false)
  }

  const broadcastMessageFn = async () => {
    if (!broadcastMessage.trim()) return

    try {
      const response = await fetch('/api/owner/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: broadcastMessage })
      })

      if (response.ok) {
        toast({ title: 'Message broadcasted to all users' })
        setBroadcastMessage('')
      }
    } catch (error) {
      toast({ title: 'Failed to broadcast message', variant: 'destructive' })
    }
  }

  const gemRain = async () => {
    try {
      const response = await fetch('/api/owner/gem-rain', { method: 'POST' })
      const data = await response.json()

      if (response.ok) {
        toast({ title: `Gem rain sent to ${data.users_affected} online players!` })
      } else {
        toast({ title: data.error || 'Failed to send gem rain', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Failed to send gem rain', variant: 'destructive' })
    }
  }

  const exportData = async (format: 'json' | 'csv' | 'sql') => {
    try {
      const response = await fetch(`/api/owner/export?format=${format}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `gemverse-export-${Date.now()}.${format}`
        a.click()
        window.URL.revokeObjectURL(url)
        toast({ title: 'Export completed successfully' })
      }
    } catch (error) {
      toast({ title: 'Failed to export data', variant: 'destructive' })
    }
  }

  const bulkAction = async (action: 'ban' | 'unban' | 'promote' | 'demote') => {
    if (selectedUsers.length === 0) return

    try {
      const response = await fetch('/api/owner/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, user_ids: selectedUsers })
      })

      if (response.ok) {
        toast({ title: `Bulk action completed: ${action}` })
        setSelectedUsers([])
        loadUsers()
      }
    } catch (error) {
      toast({ title: 'Bulk action failed', variant: 'destructive' })
    }
  }

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.user_id.toString().includes(searchQuery)
  )

  if (!user || user.role !== 'OWNER') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="game-card">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Owner Access Required</h2>
            <p className="text-gray-400 mb-6">Only the system owner can access this dashboard.</p>
            <Button onClick={() => router.push('/')}>Return Home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Crown className="w-10 h-10 text-gem-400 animate-gem-pulse" />
              <div>
                <h1 className="text-5xl font-bold text-white">Owner Dashboard</h1>
                <p className="text-gray-400">Complete control over Gemverse Casino</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Welcome back,</p>
              <p className="text-xl font-bold text-gem-400">{user.username}</p>
            </div>
          </div>

          {/* System Status Bar */}
          {systemStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-white">{systemStats.total_users}</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-gray-400">Active (24h)</p>
                <p className="text-2xl font-bold text-green-400">{systemStats.active_users_24h}</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-gray-400">Total Gems</p>
                <p className="text-2xl font-bold text-gem-400">{formatGems(BigInt(systemStats.total_gems))}</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-gray-400">Total Bets</p>
                <p className="text-2xl font-bold text-blue-400">{systemStats.total_bets}</p>
              </div>
            </div>
          )}
        </motion.div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="owner-panel bg-gradient-to-r from-red-900/20 to-red-800/20 border-red-500/30">
            <TabsTrigger value="overview" className="data-[state=active]:bg-red-500/30">
              <Activity className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-red-500/30">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="games" className="data-[state=active]:bg-red-500/30">
              <Zap className="w-4 h-4 mr-2" />
              Games
            </TabsTrigger>
            <TabsTrigger value="economy" className="data-[state=active]:bg-red-500/30">
              <DollarSign className="w-4 h-4 mr-2" />
              Economy
            </TabsTrigger>
            <TabsTrigger value="tools" className="data-[state=active]:bg-red-500/30">
              <Terminal className="w-4 h-4 mr-2" />
              Tools
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Users"
                value={systemStats?.total_users.toString() || '0'}
                icon={<Users className="w-5 h-5" />}
                color="text-blue-400"
              />
              <StatCard
                title="Total Gems"
                value={systemStats ? formatGems(BigInt(systemStats.total_gems)) : '0'}
                icon={<Gem className="w-5 h-5" />}
                color="text-gem-400"
              />
              <StatCard
                title="Active Users (24h)"
                value={systemStats?.active_users_24h.toString() || '0'}
                icon={<Activity className="w-5 h-5" />}
                color="text-green-400"
              />
              <StatCard
                title="Total Bets"
                value={systemStats?.total_bets.toString() || '0'}
                icon={<TrendingUp className="w-5 h-5" />}
                color="text-purple-400"
              />
            </div>

            {/* Quick Actions */}
            <Card className="owner-panel">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-4">
                <Button onClick={gemRain} className="bg-gem-500 hover:bg-gem-600 text-black">
                  <CloudRain className="w-4 h-4 mr-2" />
                  Gem Rain (10 gems)
                </Button>
                <Button onClick={() => setBroadcastMessage('System maintenance scheduled')}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Broadcast Message
                </Button>
                <Button onClick={() => exportData('json')} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="owner-panel">
              <CardHeader>
                <CardTitle className="text-white">User Management</CardTitle>
                <div className="flex items-center gap-4 mt-4">
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-xs bg-background/50 border-gray-600"
                  />
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="bg-background/50 border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="username">Username</SelectItem>
                      <SelectItem value="gems">Gems</SelectItem>
                      <SelectItem value="level">Level</SelectItem>
                      <SelectItem value="created_at">Created</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} variant="outline">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-600">
                        <th className="text-left p-3 w-12">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers(filteredUsers.map(u => u.user_id))
                              } else {
                                setSelectedUsers([])
                              }
                            }}
                          />
                        </th>
                        <th className="text-left p-3">ID</th>
                        <th className="text-left p-3">Username</th>
                        <th className="text-left p-3">Role</th>
                        <th className="text-left p-3">Gems</th>
                        <th className="text-left p-3">Level</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Last Active</th>
                        <th className="text-left p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(user => (
                        <tr key={user.user_id} className="border-b border-gray-700 hover:bg-gray-800/30 transition-colors">
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user.user_id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUsers([...selectedUsers, user.user_id])
                                } else {
                                  setSelectedUsers(selectedUsers.filter(id => id !== user.user_id))
                                }
                              }}
                              disabled={user.role === 'OWNER'}
                            />
                          </td>
                          <td className="p-3 font-mono text-xs">{user.user_id}</td>
                          <td className="p-3 font-medium">{user.username}</td>
                          <td className="p-3">
                            <select
                              value={user.role}
                              onChange={(e) => updateUserRole(user.user_id, e.target.value)}
                              className="bg-background border border-gray-600 rounded px-2 py-1 text-xs"
                              disabled={user.role === 'OWNER'}
                            >
                              <option value="PLAYER">Player</option>
                              <option value="ADMIN">Admin</option>
                              <option value="OWNER">Owner</option>
                            </select>
                          </td>
                          <td className="p-3 font-mono text-gem-400">{formatGems(BigInt(user.gems))}</td>
                          <td className="p-3">{user.level}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              user.is_banned ? 'bg-red-500/20 text-red-400' : 
                              new Date(user.last_active) > new Date(Date.now() - 5 * 60 * 1000) ? 
                                'bg-green-500/20 text-green-400' : 
                                'bg-gray-500/20 text-gray-400'
                            }`}>
                              {user.is_banned ? 'Banned' : 
                               new Date(user.last_active) > new Date(Date.now() - 5 * 60 * 1000) ? 
                                 'Online' : 'Offline'}
                            </span>
                          </td>
                          <td className="p-3 text-gray-400">
                            {new Date(user.last_active).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant={user.is_banned ? "outline" : "destructive"}
                                onClick={() => banUser(user.user_id, !user.is_banned)}
                                disabled={user.role === 'OWNER'}
                                className="text-xs px-2 py-1"
                              >
                                {user.is_banned ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {selectedUsers.length > 0 && (
                  <div className="mt-4 flex gap-2">
                    <Button onClick={() => bulkAction('ban')} variant="destructive" size="sm">
                      Ban Selected ({selectedUsers.length})
                    </Button>
                    <Button onClick={() => bulkAction('unban')} variant="outline" size="sm">
                      Unban Selected
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="games">
            <Card className="owner-panel">
              <CardHeader>
                <CardTitle className="text-white">Game Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Mines Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-400 rounded-full" />
                      Mines
                    </h3>
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-300">Enabled</Label>
                      <Switch
                        checked={settings.mines_enabled}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, mines_enabled: checked }))}
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Max Bet</Label>
                      <Input
                        type="number"
                        value={settings.mines_max_bet}
                        onChange={(e) => setSettings(prev => ({ ...prev, mines_max_bet: parseInt(e.target.value) }))}
                        className="bg-background/50 border-gray-600 mt-2"
                      />
                    </div>
                  </div>

                  {/* Plinko Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-400 rounded-full" />
                      Plinko
                    </h3>
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-300">Enabled</Label>
                      <Switch
                        checked={settings.plinko_enabled}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, plinko_enabled: checked }))}
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Max Bet</Label>
                      <Input
                        type="number"
                        value={settings.plinko_max_bet}
                        onChange={(e) => setSettings(prev => ({ ...prev, plinko_max_bet: parseInt(e.target.value) }))}
                        className="bg-background/50 border-gray-600 mt-2"
                      />
                    </div>
                  </div>

                  {/* Crash Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full" />
                      Crash
                    </h3>
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-300">Enabled</Label>
                      <Switch
                        checked={settings.crash_enabled}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, crash_enabled: checked }))}
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Max Bet</Label>
                      <Input
                        type="number"
                        value={settings.crash_max_bet}
                        onChange={(e) => setSettings(prev => ({ ...prev, crash_max_bet: parseInt(e.target.value) }))}
                        className="bg-background/50 border-gray-600 mt-2"
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={updateSettings} disabled={isLoading}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Game Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="economy">
            <Card className="owner-panel">
              <CardHeader>
                <CardTitle className="text-white">Economy Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-gray-300">Daily Faucet Amount</Label>
                    <Input
                      type="number"
                      value={settings.daily_faucet}
                      onChange={(e) => setSettings(prev => ({ ...prev, daily_faucet: parseInt(e.target.value) }))}
                      className="bg-background/50 border-gray-600 mt-2"
                    />
                    <p className="text-xs text-gray-400 mt-1">Gems given to users daily</p>
                  </div>

                  <div>
                    <Label className="text-gray-300">Level Up Reward Multiplier</Label>
                    <Input
                      type="number"
                      value={settings.level_up_reward}
                      onChange={(e) => setSettings(prev => ({ ...prev, level_up_reward: parseInt(e.target.value) }))}
                      className="bg-background/50 border-gray-600 mt-2"
                    />
                    <p className="text-xs text-gray-400 mt-1">Gems = level × multiplier</p>
                  </div>

                  <div>
                    <Label className="text-gray-300">Tournament House Cut (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={settings.tournament_house_cut}
                      onChange={(e) => setSettings(prev => ({ ...prev, tournament_house_cut: parseFloat(e.target.value) }))}
                      className="bg-background/50 border-gray-600 mt-2"
                    />
                    <p className="text-xs text-gray-400 mt-1">Percentage taken from tournament prizes</p>
                  </div>

                  <div>
                    <Label className="text-gray-300">Global Tax (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={settings.global_tax}
                      onChange={(e) => setSettings(prev => ({ ...prev, global_tax: parseFloat(e.target.value) }))}
                      className="bg-background/50 border-gray-600 mt-2"
                    />
                    <p className="text-xs text-gray-400 mt-1">Tax on large transfers</p>
                  </div>

                  <div>
                    <Label className="text-gray-300">Gem to XP Rate</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={settings.gem_to_xp}
                      onChange={(e) => setSettings(prev => ({ ...prev, gem_to_xp: parseFloat(e.target.value) }))}
                      className="bg-background/50 border-gray-600 mt-2"
                    />
                    <p className="text-xs text-gray-400 mt-1">XP gained per gem spent</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.ad_doubler}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, ad_doubler: checked }))}
                    />
                    <Label className="text-gray-300">Enable Ad Doubler</Label>
                  </div>
                </div>

                <Button onClick={updateSettings} disabled={isLoading}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Economy Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools">
            <div className="space-y-6">
              {/* SQL Console */}
              <Card className="owner-panel">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Terminal className="w-5 h-5" />
                    SQL Console
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Execute raw SQL queries (use with extreme caution!)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    placeholder="SELECT * FROM users WHERE created_at > NOW() - INTERVAL '1 day';"
                    className="min-h-32 bg-background/50 border-gray-600 font-mono"
                  />
                  <div className="flex gap-4">
                    <Button onClick={executeSQL} disabled={isLoading}>
                      <Terminal className="w-4 h-4 mr-2" />
                      Execute Query
                    </Button>
                    <Button onClick={() => setSqlQuery('')} variant="outline">
                      Clear
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Broadcast */}
              <Card className="owner-panel">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Send className="w-5 h-5" />
                    Broadcast Message
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Enter message to broadcast to all online users..."
                    className="bg-background/50 border-gray-600"
                    maxLength={500}
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">
                      {broadcastMessage.length}/500 characters
                    </span>
                    <Button onClick={broadcastMessageFn}>
                      <Send className="w-4 h-4 mr-2" />
                      Broadcast
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Export Tools */}
              <Card className="owner-panel">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Data Export
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Export complete database for backup and analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-4">
                  <Button onClick={() => exportData('json')}>
                    <Download className="w-4 h-4 mr-2" />
                    Export JSON
                  </Button>
                  <Button onClick={() => exportData('csv')}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button onClick={() => exportData('sql')} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export SQL
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color = 'text-white' }: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  color?: string 
}) {
  return (
    <Card className="game-card border-transparent hover:border-gem-400/30 transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
          </div>
          <div className={color}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}