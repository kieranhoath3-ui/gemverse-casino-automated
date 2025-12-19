'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, DollarSign, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/hooks/use-toast'

interface Ball {
  id: number
  x: number
  y: number
  vx: number
  vy: number
}

interface PlinkoResult {
  multiplier: number
  slot: number
}

const PAYOUT_TABLES = {
  low: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
  medium: [13, 3.0, 1.3, 0.7, 0.4, 0.7, 1.3, 3.0, 13],
  high: [29, 4.0, 1.5, 0.6, 0.2, 0.6, 1.5, 4.0, 29]
}

export default function PlinkoPage() {
  const { user } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  
  const [rows, setRows] = useState(12)
  const [risk, setRisk] = useState<'low' | 'medium' | 'high'>('medium')
  const [betAmount, setBetAmount] = useState(100)
  const [balls, setBalls] = useState<Ball[]>([])
  const [results, setResults] = useState<PlinkoResult[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [ballId, setBallId] = useState(0)

  const pegRadius = 4
  const ballRadius = 8
  const slotWidth = 60
  const gravity = 0.5
  const friction = 0.99

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw pegs
      ctx.fillStyle = '#64748b'
      for (let row = 0; row < rows; row++) {
        const pegsInRow = row + 1
        const y = 60 + row * 40
        for (let col = 0; col < pegsInRow; col++) {
          const x = canvas.width / 2 - (pegsInRow - 1) * 20 + col * 40
          ctx.beginPath()
          ctx.arc(x, y, pegRadius, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Draw slots
      const slots = 9
      const slotStartX = canvas.width / 2 - (slots * slotWidth) / 2
      for (let i = 0; i < slots; i++) {
        const x = slotStartX + i * slotWidth
        const payout = PAYOUT_TABLES[risk][i]
        ctx.fillStyle = payout >= 1 ? '#10b981' : '#ef4444'
        ctx.fillRect(x, canvas.height - 40, slotWidth, 40)
        
        ctx.fillStyle = '#ffffff'
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(`${payout}x`, x + slotWidth / 2, canvas.height - 15)
      }

      // Update and draw balls
      setBalls(prevBalls => {
        const newBalls = prevBalls.map(ball => {
          // Apply gravity
          ball.vy += gravity
          ball.vx *= friction
          ball.vy *= friction

          // Update position
          ball.x += ball.vx
          ball.y += ball.vy

          // Check peg collisions
          for (let row = 0; row < rows; row++) {
            const pegsInRow = row + 1
            const pegY = 60 + row * 40
            for (let col = 0; col < pegsInRow; col++) {
              const pegX = canvas.width / 2 - (pegsInRow - 1) * 20 + col * 40
              const dx = ball.x - pegX
              const dy = ball.y - pegY
              const distance = Math.sqrt(dx * dx + dy * dy)

              if (distance < pegRadius + ballRadius) {
                // Bounce
                const angle = Math.atan2(dy, dx)
                const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy)
                ball.vx = Math.cos(angle) * speed * 0.8
                ball.vy = Math.sin(angle) * speed * 0.8
                
                // Add some randomness
                ball.vx += (Math.random() - 0.5) * 2
              }
            }
          }

          // Check if ball reached bottom
          if (ball.y > canvas.height - 40 - ballRadius) {
            const slotIndex = Math.floor((ball.x - (canvas.width / 2 - (9 * slotWidth) / 2)) / slotWidth)
            if (slotIndex >= 0 && slotIndex < 9) {
              const multiplier = PAYOUT_TABLES[risk][slotIndex]
              setResults(prev => [...prev, { multiplier, slot: slotIndex }])
              
              // Remove ball after a delay
              setTimeout(() => {
                setBalls(prev => prev.filter(b => b.id !== ball.id))
              }, 1000)
            }
          }

          return ball
        }).filter(ball => ball.y < canvas.height + 50)

        return newBalls
      })

      // Draw balls
      ctx.fillStyle = '#fbbf24'
      balls.forEach(ball => {
        ctx.beginPath()
        ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#f59e0b'
        ctx.lineWidth = 2
        ctx.stroke()
      })

      if (balls.length > 0) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setIsPlaying(false)
      }
    }

    if (balls.length > 0) {
      animate()
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [balls.length, rows, risk])

  const dropBall = () => {
    if (!user || user.gems < betAmount) {
      toast({
        title: 'Insufficient gems',
        description: 'You don\'t have enough gems for this bet.',
        variant: 'destructive'
      })
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const newBall: Ball = {
      id: ballId,
      x: canvas.width / 2 + (Math.random() - 0.5) * 20,
      y: 30,
      vx: (Math.random() - 0.5) * 2,
      vy: 2
    }

    setBalls(prev => [...prev, newBall])
    setBallId(prev => prev + 1)
    setIsPlaying(true)
  }

  const getTotalPayout = () => {
    return results.reduce((total, result) => total + (betAmount * result.multiplier), 0)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="game-card">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Please Log In</h2>
            <p className="text-gray-400 mb-6">You need to be logged in to play Plinko.</p>
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
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Plinko</h1>
          <p className="text-gray-400">Drop the ball and watch it bounce to victory!</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Game Controls */}
          <div className="lg:col-span-1">
            <Card className="game-card">
              <CardHeader>
                <CardTitle className="text-white">Game Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-gray-300">Rows: {rows}</Label>
                  <Slider
                    value={[rows]}
                    onValueChange={([value]) => setRows(value)}
                    min={8}
                    max={16}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Risk Level</Label>
                  <Select value={risk} onValueChange={(value) => setRisk(value as any)}>
                    <SelectTrigger className="mt-2 bg-background/50 border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Risk</SelectItem>
                      <SelectItem value="medium">Medium Risk</SelectItem>
                      <SelectItem value="high">High Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300">Bet Amount</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(parseInt(e.target.value) || 100)}
                      min="1"
                      className="bg-background/50 border-gray-600"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={dropBall}
                    className="w-full btn-gem"
                    disabled={isPlaying || user.gems < betAmount}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Drop Ball
                  </Button>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-400">Total Payout</p>
                  <p className="text-2xl font-bold text-gem-400">
                    {getTotalPayout().toFixed(0)} gems
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Game Board */}
          <div className="lg:col-span-3">
            <Card className="game-card">
              <CardContent className="p-6">
                <canvas
                  ref={canvasRef}
                  width={540}
                  height={600}
                  className="border border-gray-600 rounded-lg mx-auto"
                />
              </CardContent>
            </Card>

            {/* Recent Results */}
            <Card className="game-card mt-6">
              <CardHeader>
                <CardTitle className="text-white">Recent Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {results.slice(-20).reverse().map((result, index) => (
                    <div
                      key={index}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        result.multiplier >= 1 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {result.multiplier.toFixed(1)}x
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}