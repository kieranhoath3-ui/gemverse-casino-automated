'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface AgeVerificationModalProps {
  open: boolean
  onVerify: () => void
}

export function AgeVerificationModal({ open, onVerify }: AgeVerificationModalProps) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-bold text-center">
            Age Verification Required
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-4">
            <p className="text-lg font-semibold text-white">
              You must be 13 years or older to access Gemverse Casino
            </p>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-yellow-200 text-sm">
                <strong>Important:</strong> This is a free simulation platform for entertainment purposes only. 
                No real money or prizes are involved. All gems are virtual currency with no monetary value.
              </p>
            </div>
            <div className="flex items-center space-x-2 justify-center">
              <Checkbox
                id="age-confirm"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked as boolean)}
              />
              <Label htmlFor="age-confirm" className="text-sm">
                I confirm that I am 13 years or older
              </Label>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={() => window.close()}
            className="bg-gray-600 hover:bg-gray-700"
          >
            Exit
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onVerify}
            disabled={!confirmed}
            className="bg-gem-500 hover:bg-gem-600 disabled:opacity-50"
          >
            Enter Casino
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}