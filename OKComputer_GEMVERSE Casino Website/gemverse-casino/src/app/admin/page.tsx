'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield, Users, MessageSquare, AlertTriangle, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/hooks/use-toast'

interface Report {
  report_id: number
  reporter_id: number
  target_id: number
  reason: string
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED'
  created_at: string
  reporter_username: string
  target_username: string
}

interface ChatMessage {
  id: number
  username: string
  message: string
  timestamp: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [announcement, setAnnouncement] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (user?.role !== 'ADMIN' && user?.role !== 'OWNER') {
      router.push('/')
      return
    }
    
    loadReports()
    loadChatHistory()
  }, [user])

  const loadReports = async () => {
    try {
      const response = await fetch('/api/admin/reports')
      if (response.ok) {
        const data = await response.json()
        setReports(data.reports)
      }
    } catch (error) {
      console.error('Failed to load reports:', error)
    }
  }

  const loadChatHistory = async () => {
    try {
      const response = await fetch('/api/admin/chat')
      if (response.ok) {
        const data = await response.json()
        setChatMessages(data.messages)
      }
    } catch (error) {
      console.error('Failed to load chat history:', error)
    }
  }

  const handleReport = async (reportId: number, action: 'resolve' | 'dismiss') => {
    try {
      const response = await fetch(`/api/admin/report/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action === 'resolve' ? 'RESOLVED' : 'DISMISSED' })
      })

      if (response.ok) {
        toast({ title: `Report ${action}d` })
        loadReports()
      }
    } catch (error) {
      toast({ title: `Failed to ${action} report`, variant: 'destructive' })
    }
  }

  const banUser = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/user/${userId}/ban`, {
        method: 'POST'
      })

      if (response.ok) {
        toast({ title: 'User banned successfully' })
        loadReports()
      }
    } catch (error) {
      toast({ title: 'Failed to ban user', variant: 'destructive' })
    }
  }

  const postAnnouncement = async () => {
    if (!announcement.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: announcement })
      })

      if (response.ok) {
        toast({ title: 'Announcement posted successfully' })
        setAnnouncement('')
      }
    } catch (error) {
      toast({ title: 'Failed to post announcement', variant: 'destructive' })
    }
    setIsLoading(false)
  }

  if (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="game-card">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
            <p className="text-gray-400 mb-6">Admin privileges required.</p>
            <Button onClick={() => router.push('/')}>Go Home</Button>
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
          <div className="flex items-center gap-4 mb-4">
            <Shield className="w-8 h-8 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>
          </div>
          <p className="text-gray-400">Moderation and support tools</p>
        </motion.div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="admin-panel">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="chat">Chat Log</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Pending Reports"
                value={reports.filter(r => r.status === 'PENDING').length.toString()}
                icon={<AlertTriangle className="w-5 h-5" />}
              />
              <StatCard
                title="Total Reports"
                value={reports.length.toString()}
                icon={<AlertTriangle className="w-5 h-5" />}
              />
              <StatCard
                title="Chat Messages"
                value={chatMessages.length.toString()}
                icon={<MessageSquare className="w-5 h-5" />}
              />
              <StatCard
                title="Active Users"
                value="0" // Would be from real-time data
                icon={<Users className="w-5 h-5" />}
              />
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <Card className="admin-panel">
              <CardHeader>
                <CardTitle className="text-white">User Reports</CardTitle>
                <CardDescription className="text-gray-400">
                  Review and moderate user reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reports.map(report => (
                    <div key={report.report_id} className="border border-gray-600 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-400">Report #{report.report_id}</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              report.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                              report.status === 'RESOLVED' ? 'bg-green-500/20 text-green-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {report.status}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm">
                              <span className="text-gray-400">Reporter:</span> {report.reporter_username}
                            </p>
                            <p className="text-sm">
                              <span className="text-gray-400">Target:</span> {report.target_username}
                            </p>
                            <p className="text-sm">
                              <span className="text-gray-400">Reason:</span> {report.reason}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {report.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleReport(report.report_id, 'resolve')}
                              >
                                Resolve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReport(report.report_id, 'dismiss')}
                              >
                                Dismiss
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => banUser(report.target_id)}
                              >
                                Ban User
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {reports.length === 0 && (
                    <p className="text-gray-400 text-center py-8">No pending reports</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat">
            <Card className="admin-panel">
              <CardHeader>
                <CardTitle className="text-white">Chat History</CardTitle>
                <CardDescription className="text-gray-400">
                  Recent chat messages (last 1000)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {chatMessages.map((msg, index) => (
                    <div key={index} className="flex items-start gap-3 p-2 bg-background/50 rounded-lg">
                      <span className="text-sm font-medium text-blue-400">{msg.username}:</span>
                      <span className="text-sm text-gray-300">{msg.message}</span>
                      <span className="text-xs text-gray-500 ml-auto">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                  {chatMessages.length === 0 && (
                    <p className="text-gray-400 text-center py-8">No chat messages</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements">
            <Card className="admin-panel">
              <CardHeader>
                <CardTitle className="text-white">Post Announcement</CardTitle>
                <CardDescription className="text-gray-400">
                  Post a message visible to all users (max 120 characters)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  placeholder="Enter announcement message..."
                  maxLength={120}
                  className="bg-background/50 border-gray-600"
                />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">
                    {announcement.length}/120 characters
                  </span>
                  <Button onClick={postAnnouncement} disabled={isLoading}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Post Announcement
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="game-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
          <div className="text-blue-400">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}