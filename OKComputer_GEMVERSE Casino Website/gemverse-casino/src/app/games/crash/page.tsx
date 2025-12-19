'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, DollarSign, TrendingUp, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/hooks/use-toast'

interface Bet {
  id: string
  userId: number
  username: string
  amount: number
  cashedOut: boolean
  cashoutMultiplier?: number
}

interface GameRound {
  id: string
  startTime: number
  multiplier: number
  status: 'waiting' | 'active' | 'crashed'
  crashPoint: number
}

export default function CrashPage() {
  const { user } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  
  const [betAmount, setBetAmount] = useState(100)
  const [autoCashout, setAutoCashout] = useState<number | null>(null)
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null)
  const [bets, setBets] = useState<Bet[]>([])
  const [myBets, setMyBets] = useState<Bet[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [canBet, setCanBet] = useState(true)
  const [history, setHistory] = useState<number[]>([])

  // Simulate game rounds (in real implementation, this would be WebSocket-based)
  useEffect(() => {
    const startNewRound = () => {
      const roundId = `round_${Date.now()}`
      const crashPoint = 1 + Math.random() * 50 // 1x to 50x multiplier
      
      setCurrentRound({
        id: roundId,
        startTime: Date.now(),
        multiplier: 1.0,
        status: 'waiting',
        crashPoint
      })
      
      setCanBet(true)
      setBets([])
    }

    startNewRound()
    const interval = setInterval(startNewRound, 10000) // New round every 10 seconds

    return () => clearInterval(interval)
  }, [])

  // Game loop
  useEffect(() => {
    if (!currentRound || currentRound.status !== 'active') return

    const animate = () => {
      const now = Date.now()
      const elapsed = (now - currentRound.startTime) / 1000 // Convert to seconds
      const multiplier = Math.exp(elapsed / 10) // Exponential growth

      if (multiplier >= currentRound.crashPoint) {
        // Game crashed
        setCurrentRound(prev => prev ? { ...prev, status: 'crashed', multiplier: currentRound.crashPoint } : null)
        setHistory(prev => [...prev.slice(-49), currentRound.crashPoint])
        
        // Process bets
        setBets(prevBets => {
          prevBets.forEach(bet => {
            if (!bet.cashedOut) {
              // Lost bet
              toast({
                title: 'Crash!',
                description: `You lost ${bet.amount} gems`,
                variant: 'destructive'
              })
            }
          })
          return []
        })

        setMyBets([])
        setCanBet(true)
        setIsPlaying(false)
      } else {
        setCurrentRound(prev => prev ? { ...prev, multiplier } : null)
        
        // Check auto cashout
        if (autoCashout && multiplier >= autoCashout) {
          cashOutAll()
        }

        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [currentRound?.status, currentRound?.startTime, autoCashout])

  // Draw the graph
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !currentRound) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw grid
      ctx.strokeStyle = '#374151'
      ctx.lineWidth = 1
      for (let i = 0; i <= 10; i++) {
        const y = (canvas.height - 60) * (1 - i / 10) + 30
        ctx.beginPath()
        ctx.moveTo(50, y)
        ctx.lineTo(canvas.width - 50, y)
        ctx.stroke()
      }

      // Draw curve
      if (currentRound.status === 'active' || currentRound.status === 'crashed') {
        ctx.strokeStyle = '#10b981'
        ctx.lineWidth = 3
        ctx.shadowColor = '#10b981'
        ctx.shadowBlur = 10
        ctx.beginPath()
        
        const points = 100
        for (let i = 0; i <= points; i++) {
          const t = (i / points) * ((Date.now() - currentRound.startTime) / 1000)
          const x = (i / points) * (canvas.width - 100) + 50
          const y = canvas.height - 30 - (Math.exp(t / 10) - 1) * 20
          
          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      // Draw current multiplier
      if (currentRound.status === 'active') {
        ctx.fillStyle = '#10b981'
        ctx.font = 'bold 48px sans-serif'
        ctx.textAlign = 'center'
        ctx.shadowColor = '#10b981'
        ctx.shadowBlur = 20
        ctx.fillText(`${currentRound.multiplier.toFixed(2)}x`, canvas.width / 2, 80)
        ctx.shadowBlur = 0
      }

      // Draw status
      ctx.fillStyle = '#ffffff'
      ctx.font = '24px sans-serif'
      ctx.textAlign = 'center'
      if (currentRound.status === 'waiting') {
        ctx.fillText('Waiting for next round...', canvas.width / 2, canvas.height / 2)
      } else if (currentRound.status === 'crashed') {
        ctx.fillStyle = '#ef4444'
        ctx.fillText('CRASHED!', canvas.width / 2, canvas.height / 2)
      }
    }

    draw()
  }, [currentRound])

  const placeBet = () => {
    if (!user || user.gems < betAmount || !canBet) return

    const newBet: Bet = {
      id: `bet_${Date.now()}`,
      userId: user.user_id,
      username: user.username,
      amount: betAmount,
      cashedOut: false
    }

    setBets(prev => [...prev, newBet])
    setMyBets(prev => [...prev, newBet])
    setCanBet(false)
    setIsPlaying(true)

    // Start the round if it's the first bet
    if (currentRound && currentRound.status === 'waiting') {
      setCurrentRound(prev => prev ? { ...prev, status: 'active' } : null)
    }
  }

  const cashOut = (betId: string) => {
    if (!currentRound || currentRound.status !== 'active') return

    setBets(prev => prev.map(bet => 
      bet.id === betId ? { ...bet, cashedOut: true, cashoutMultiplier: currentRound.multiplier } : bet
    ))

    setMyBets(prev => prev.map(bet => 
      bet.id === betId ? { ...bet, cashedOut: true, cashoutMultiplier: currentRound.multiplier } : bet
    ))

    const bet = bets.find(b => b.id === betId)
    if (bet) {
      const winnings = Math.floor(bet.amount * currentRound.multiplier)
      toast({
        title: 'Cashed Out!',
        description: `You won ${winnings} gems at ${currentRound.multiplier.toFixed(2)}x!`,
      })
    }
  }

  const cashOutAll = () => {
    myBets.forEach(bet => {
      if (!bet.cashedOut) {
        cashOut(bet.id)
      }
    })
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="game-card">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Please Log In</h2>
            <p className="text-gray-400 mb-6">You need to be logged in to play Crash.</p>
            <Button onClick={() => window.location.href = '/login'}>
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Crash</h1>
          <p className="text-gray-400">Cash out before the rocket crashes!</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Game Board */}
          <div className="lg:col-span-3">
            <Card className="game-card">
              <CardContent className="p-6">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={400}
                  className="border border-gray-600 rounded-lg w-full"
                />
              </CardContent>
            </Card>

            {/* History */}
            <Card className="game-card mt-6">
              <CardHeader>
                <CardTitle className="text-white">Round History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {history.slice(-20).reverse().map((multiplier, index) => (
                    <div
                      key={index}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        multiplier >= 2 ? 'bg-green-500/20 text-green-400' : 
                        multiplier >= 1.5 ? 'bg-yellow-500/20 text-yellow-400' : 
                        'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {multiplier.toFixed(2)}x
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls and Bets */}
          <div className="lg:col-span-1 space-y-6">
            {/* Betting Controls */}
            <Card className="game-card">
              <CardHeader>
                <CardTitle className="text-white">Place Bet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-gray-300">Bet Amount</Label>
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(parseInt(e.target.value) || 100)}
                    min="1"
                    className="bg-background/50 border-gray-600 mt-2"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Auto Cashout (Optional)</Label>
                  <Input
                    type="number"
                    value={autoCashout || ''}
                    onChange={(e) => setAutoCashout(e.target.value ? parseFloat(e.target.value) : null)}
                    min="1.01"
                    step="0.01"
                    placeholder="1.50"
                    className="bg-background/50 border-gray-600 mt-2"
                  />
                </div>

                <Button
                  onClick={placeBet}
                  className="w-full btn-gem"
                  disabled={!canBet || user.gems < betAmount || isPlaying}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Place Bet
                </Button>

                {myBets.length > 0 && (
                  <Button
                    onClick={cashOutAll}
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={!currentRound || currentRound.status !== 'active'}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Cash Out All
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* My Bets */}
            <Card className="game-card">
              <CardHeader>
                <CardTitle className="text-white">My Bets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {myBets.map(bet => (
                    <div key={bet.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{bet.amount} gems</p>
                        <p className="text-xs text-gray-400">
                          {bet.cashedOut ? 
                            `Cashed at ${bet.cashoutMultiplier?.toFixed(2)}x` : 
                            'In game'
                          }
                        </p>
                      </div>
                      {!bet.cashedOut && currentRound?.status === 'active' && (
                        <Button
                          size="sm"
                          onClick={() => cashOut(bet.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Cash Out
                        </Button>
                      )}
                    </div>
                  ))}
                  {myBets.length === 0 && (
                    <p className="text-gray-400 text-center py-4">No active bets</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* All Bets */}
            <Card className="game-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  All Bets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {bets.map(bet => (
                    <div key={bet.id} className="flex items-center justify-between text-sm">
                      <span>{bet.username}</span>
                      <span className="text-gem-400">{bet.amount} gems</span>
                    </div>
                  ))}
                  {bets.length === 0 && (
                    <p className="text-gray-400 text-center py-4">No bets placed</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}