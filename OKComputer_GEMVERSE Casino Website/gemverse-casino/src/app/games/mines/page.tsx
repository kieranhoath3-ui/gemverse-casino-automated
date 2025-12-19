'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gem, Bomb, Flag, Play, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/hooks/use-toast'
import { generateServerSeed, generateClientNonce } from '@/lib/utils'

interface GameState {
  grid: boolean[][]
  revealed: boolean[][]
  flagged: boolean[][]
  mines: number
  betAmount: number
  currentMultiplier: number
  gameActive: boolean
  gameOver: boolean
  won: boolean
  serverSeed: string
  clientNonce: string
}

export default function MinesPage() {
  const { user, checkAuth } = useAuth()
  const [gridSize, setGridSize] = useState(5)
  const [mineCount, setMineCount] = useState(5)
  const [gameState, setGameState] = useState<GameState>({
    grid: [],
    revealed: [],
    flagged: [],
    mines: 5,
    betAmount: 100,
    currentMultiplier: 1.0,
    gameActive: false,
    gameOver: false,
    won: false,
    serverSeed: '',
    clientNonce: ''
  })

  const initializeGame = () => {
    const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false))
    const revealed = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false))
    const flagged = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false))
    
    // Place mines randomly
    const mines = [...Array(gridSize * gridSize).keys()]
    const minePositions = mines.sort(() => Math.random() - 0.5).slice(0, mineCount)
    
    minePositions.forEach(pos => {
      const row = Math.floor(pos / gridSize)
      const col = pos % gridSize
      grid[row][col] = true
    })

    setGameState({
      grid,
      revealed,
      flagged,
      mines: mineCount,
      betAmount: gameState.betAmount,
      currentMultiplier: 1.0,
      gameActive: true,
      gameOver: false,
      won: false,
      serverSeed: generateServerSeed(),
      clientNonce: generateClientNonce()
    })
  }

  const calculateMultiplier = (revealedCount: number) => {
    const totalTiles = gridSize * gridSize
    const safeTiles = totalTiles - mineCount
    const multiplier = 1 / (1 - (revealedCount / safeTiles))
    return Math.max(1.0, Math.min(multiplier, 1000))
  }

  const revealCell = (row: number, col: number) => {
    if (!gameState.gameActive || gameState.revealed[row][col] || gameState.flagged[row][col]) return

    const newRevealed = gameState.revealed.map(r => [...r])
    newRevealed[row][col] = true

    if (gameState.grid[row][col]) {
      // Hit a mine - game over
      setGameState(prev => ({
        ...prev,
        revealed: newRevealed,
        gameActive: false,
        gameOver: true,
        won: false
      }))

      toast({
        title: 'Game Over!',
        description: 'You hit a mine and lost your bet.',
        variant: 'destructive'
      })
    } else {
      // Safe cell revealed
      const revealedCount = newRevealed.flat().filter(Boolean).length
      const multiplier = calculateMultiplier(revealedCount)
      
      setGameState(prev => ({
        ...prev,
        revealed: newRevealed,
        currentMultiplier: multiplier
      }))

      // Check if won (all safe cells revealed)
      if (revealedCount === (gridSize * gridSize - mineCount)) {
        setGameState(prev => ({
          ...prev,
          gameActive: false,
          gameOver: true,
          won: true
        }))

        const winnings = Math.floor(gameState.betAmount * multiplier)
        toast({
          title: 'You Won!',
          description: `Congratulations! You won ${winnings} gems!`,
        })
      }
    }
  }

  const toggleFlag = (row: number, col: number) => {
    if (!gameState.gameActive || gameState.revealed[row][col]) return

    const newFlagged = gameState.flagged.map(r => [...r])
    newFlagged[row][col] = !newFlagged[row][col]

    setGameState(prev => ({
      ...prev,
      flagged: newFlagged
    }))
  }

  const cashOut = async () => {
    if (!gameState.gameActive) return

    const winnings = Math.floor(gameState.betAmount * gameState.currentMultiplier)
    
    setGameState(prev => ({
      ...prev,
      gameActive: false,
      gameOver: true,
      won: true
    }))

    toast({
      title: 'Cashed Out!',
      description: `You won ${winnings} gems!`,
    })
  }

  const getCellContent = (row: number, col: number) => {
    if (gameState.flagged[row][col]) {
      return <Flag className="w-4 h-4 text-yellow-400" />
    }
    if (!gameState.revealed[row][col]) {
      return null
    }
    if (gameState.grid[row][col]) {
      return <Bomb className="w-4 h-4 text-red-400" />
    }
    return <Gem className="w-4 h-4 text-green-400" />
  }

  const getCellClassName = (row: number, col: number) => {
    let baseClass = "w-12 h-12 border border-gray-600 flex items-center justify-center cursor-pointer transition-all duration-200 "
    
    if (gameState.revealed[row][col]) {
      if (gameState.grid[row][col]) {
        baseClass += "bg-red-500/20 hover:bg-red-500/30"
      } else {
        baseClass += "bg-green-500/20 hover:bg-green-500/30"
      }
    } else {
      baseClass += "bg-gray-700/50 hover:bg-gray-600/50"
    }
    
    return baseClass
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="game-card">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Please Log In</h2>
            <p className="text-gray-400 mb-6">You need to be logged in to play Mines.</p>
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
          <h1 className="text-4xl font-bold text-white mb-2">Mines</h1>
          <p className="text-gray-400">Uncover gems without hitting mines!</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Game Controls */}
          <div className="lg:col-span-1">
            <Card className="game-card">
              <CardHeader>
                <CardTitle className="text-white">Game Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-gray-300">Grid Size: {gridSize}x{gridSize}</Label>
                  <Slider
                    value={[gridSize]}
                    onValueChange={([value]) => setGridSize(value)}
                    min={3}
                    max={8}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Mines: {mineCount}</Label>
                  <Slider
                    value={[mineCount]}
                    onValueChange={([value]) => setMineCount(value)}
                    min={1}
                    max={gridSize * gridSize - 1}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Bet Amount</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Gem className="w-4 h-4 text-gem-400" />
                    <Input
                      type="number"
                      value={gameState.betAmount}
                      onChange={(e) => setGameState(prev => ({ ...prev, betAmount: parseInt(e.target.value) || 100 }))}
                      min="1"
                      className="bg-background/50 border-gray-600"
                    />
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-400">Current Multiplier</p>
                  <p className="text-2xl font-bold text-gem-400">
                    {gameState.currentMultiplier.toFixed(2)}x
                  </p>
                </div>

                <div className="space-y-2">
                  {!gameState.gameActive && !gameState.gameOver && (
                    <Button
                      onClick={initializeGame}
                      className="w-full btn-gem"
                      disabled={user.gems < gameState.betAmount}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Game
                    </Button>
                  )}

                  {gameState.gameActive && (
                    <Button
                      onClick={cashOut}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Cash Out ({Math.floor(gameState.betAmount * gameState.currentMultiplier)} gems)
                    </Button>
                  )}

                  {gameState.gameOver && (
                    <Button
                      onClick={initializeGame}
                      className="w-full btn-gem"
                      disabled={user.gems < gameState.betAmount}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Play Again
                    </Button>
                  )}
                </div>

                <div className="text-xs text-gray-500 text-center">
                  <p>Left click to reveal • Right click to flag</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Game Board */}
          <div className="lg:col-span-2">
            <Card className="game-card">
              <CardContent className="p-6">
                <div 
                  className="mines-grid mx-auto"
                  style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)`, width: 'fit-content' }}
                >
                  {gameState.grid.map((row, rowIndex) =>
                    row.map((_, colIndex) => (
                      <motion.div
                        key={`${rowIndex}-${colIndex}`}
                        className={getCellClassName(rowIndex, colIndex)}
                        onClick={() => revealCell(rowIndex, colIndex)}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          toggleFlag(rowIndex, colIndex)
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <AnimatePresence mode="wait">
                          {getCellContent(rowIndex, colIndex) && (
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0, rotate: 180 }}
                              transition={{ duration: 0.3 }}
                            >
                              {getCellContent(rowIndex, colIndex)}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))
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