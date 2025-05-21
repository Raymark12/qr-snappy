'use client'

import { Login } from "@/components/admin/Login"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import { useIsAuthLoading } from "@/lib/zustand-selectors"

export default function Home() {
  const isLoading = useIsAuthLoading()

  if (isLoading) {
    return <LoadingSpinner message="Loading..." />
  }

  return <Login />
}