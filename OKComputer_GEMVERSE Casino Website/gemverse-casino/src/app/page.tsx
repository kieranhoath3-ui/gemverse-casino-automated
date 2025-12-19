'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Gem, Play, Shield, Users, Crown, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { AgeVerificationModal } from '@/components/modals/age-verification-modal'

export default function HomePage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [showAgeVerification, setShowAgeVerification] = useState(false)
  const [ageVerified, setAgeVerified] = useState(false)

  useEffect(() => {
    const verified = localStorage.getItem('ageVerified')
    if (!verified) {
      setShowAgeVerification(true)
    } else {
      setAgeVerified(true)
    }
  }, [])

  const handleAgeVerify = () => {
    localStorage.setItem('ageVerified', 'true')
    setAgeVerified(true)
    setShowAgeVerification(false)
  }

  if (!ageVerified) {
    return (
      <AgeVerificationModal
        open={showAgeVerification}
        onVerify={handleAgeVerify}
      />
    )
  }

  const games = [
    {
      name: 'Mines',
      description: 'Uncover gems without hitting mines!',
      icon: <Gem className="w-8 h-8 text-gem-400" />,
      color: 'from-purple-500 to-pink-500',
      href: '/games/mines'
    },
    {
      name: 'Plinko',
      description: 'Drop the ball and watch it bounce!',
      icon: <Play className="w-8 h-8 text-blue-400" />,
      color: 'from-blue-500 to-cyan-500',
      href: '/games/plinko'
    },
    {
      name: 'Crash',
      description: 'Cash out before the rocket crashes!',
      icon: <Star className="w-8 h-8 text-yellow-400" />,
      color: 'from-yellow-500 to-orange-500',
      href: '/games/crash'
    }
  ]

  return (
    <div className="min-h-screen container mx-auto px-4 py-8">
      {/* Header */}
      <header className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-6xl font-bold mb-4">
            <span className="gem-gradient">Gemverse</span>{' '}
            <span className="text-white">Casino</span>
          </h1>
          <p className="text-xl text-gray-300 mb-6">
            100% Free-to-Play • Gem-Only • Simulated Gambling Metaverse
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              <span>No Real Money</span>
            </div>
            <div className="flex items-center gap-2">
              <Gem className="w-4 h-4 text-gem-400" />
              <span>Gems Only</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span>Social Gaming</span>
            </div>
          </div>
        </motion.div>
      </header>

      {/* User Stats */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="game-card border-gem-400/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Welcome back, {user.username}!
                  </h3>
                  <div className="flex items-center gap-6">
                    <div className="gem-counter">
                      <Gem className="w-4 h-4" />
                      <span>{user.gems.toLocaleString()}</span>
                    </div>
                    <div className="text-gray-300">
                      Level {user.level}
                    </div>
                    {user.role === 'OWNER' && (
                      <div className="flex items-center gap-2 text-red-400">
                        <Crown className="w-4 h-4" />
                        <span>OWNER</span>
                      </div>
                    )}
                    {user.role === 'ADMIN' && (
                      <div className="flex items-center gap-2 text-blue-400">
                        <Shield className="w-4 h-4" />
                        <span>ADMIN</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-4">
                  {user.role === 'OWNER' && (
                    <Button
                      onClick={() => router.push('/owner')}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Owner Panel
                    </Button>
                  )}
                  {user.role === 'ADMIN' && (
                    <Button
                      onClick={() => router.push('/admin')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Admin Panel
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Games Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {games.map((game, index) => (
          <motion.div
            key={game.name}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.2 }}
          >
            <Card
              className="game-card hover:border-gem-400/50 transition-all duration-300 cursor-pointer group"
              onClick={() => router.push(game.href)}
            >
              <CardHeader>
                <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${game.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  {game.icon}
                </div>
                <CardTitle className="text-white text-2xl">{game.name}</CardTitle>
                <CardDescription className="text-gray-400">
                  {game.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full btn-gem group-hover:scale-105 transition-transform">
                  Play {game.name}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <FeatureCard
          icon={<Gem className="w-8 h-8 text-gem-400" />}
          title="Gem Economy"
          description="Earn gems through gameplay, daily rewards, and achievements"
        />
        <FeatureCard
          icon={<Users className="w-8 h-8 text-blue-400" />}
          title="Social Features"
          description="Chat with other players and join tournaments"
        />
        <FeatureCard
          icon={<Shield className="w-8 h-8 text-green-400" />}
          title="Provably Fair"
          description="All games use cryptographic fairness verification"
        />
        <FeatureCard
          icon={<Crown className="w-8 h-8 text-purple-400" />}
          title="Owner Controls"
          description="Complete control over game settings and economy"
        />
      </div>

      {/* Legal Disclaimer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center text-gray-400 text-sm max-w-2xl mx-auto"
      >
        <p className="mb-4">
          <strong>Disclaimer:</strong> This is a free simulation platform for entertainment purposes only. 
          No real money or prizes are involved. All gems are virtual currency with no monetary value.
        </p>
        <p>
          You must be 13 years or older to play. Please gamble responsibly. 
          If you feel you have a gambling problem, please seek help.
        </p>
      </motion.div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Card className="game-card border-transparent">
      <CardContent className="p-6 text-center">
        <div className="mb-4 flex justify-center">{icon}</div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm">{description}</p>
      </CardContent>
    </Card>
  )
}